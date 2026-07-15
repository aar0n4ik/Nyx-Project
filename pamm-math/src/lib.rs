//! Nyx pAMM — fixed-point recentred LMSR.
//!
//! Everything is integer math (i128) in fixed-point with 9 decimals (SCALE = 1e9).
//! No floats -> deterministic & on-chain safe.
//!
//! Market maker over n outcomes. Effective logit of outcome i:
//!     a_i = q_i / b + theta_i
//! where q_i = net shares sold, b = liquidity depth, theta_i = live oracle
//! recentring pushed by the Nyx keeper each tick.
//!
//! Cost function (Hanson LMSR, generalised with theta):
//!     C(q) = b * ln( sum_i exp(a_i) )
//! Marginal price (what a share costs right now):
//!     p_i = softmax_i(a) = dC/dq_i
//! Sum of prices == 1 (a real probability distribution).
//! Max the LP can ever lose is bounded and known: b * ln(n).

pub const SCALE: i128 = 1_000_000_000; // 1.0 in fixed-point (9 decimals)
const LN2: i128 = 693_147_181;         // ln(2) * SCALE

#[inline]
fn mul(a: i128, b: i128) -> i128 {
    a * b / SCALE
}

/// exp(-x) for x >= 0, returned in fixed-point, range (0, SCALE].
/// Range reduction x = n*ln2 + r, then Taylor on exp(-r), r in [0, ln2).
pub fn exp_neg(x: i128) -> i128 {
    if x <= 0 {
        return SCALE;
    }
    let n = x / LN2;
    if n >= 96 {
        return 0; // underflow to 0
    }
    let r = x - n * LN2; // [0, ln2)
    let r2 = mul(r, r);
    let r3 = mul(r2, r);
    let r4 = mul(r3, r);
    let r5 = mul(r4, r);
    let r6 = mul(r5, r);
    let e = SCALE - r + r2 / 2 - r3 / 6 + r4 / 24 - r5 / 120 + r6 / 720;
    e >> (n as u32)
}

/// ln(x_real) where x is fixed-point and x >= SCALE (real >= 1). Result fixed-point >= 0.
/// Reduce to m in [1,2), then ln(m) = 2*(t + t^3/3 + t^5/5 + t^7/7), t=(m-1)/(m+1).
pub fn ln_fx(mut x: i128) -> i128 {
    debug_assert!(x >= SCALE);
    let mut k: i128 = 0;
    while x >= 2 * SCALE {
        x /= 2;
        k += 1;
    }
    let num = x - SCALE;
    let den = x + SCALE;
    let t = num * SCALE / den;
    let t2 = mul(t, t);
    let t3 = mul(t2, t);
    let t5 = mul(t3, t2);
    let t7 = mul(t5, t2);
    let ln_m = 2 * (t + t3 / 3 + t5 / 5 + t7 / 7);
    k * LN2 + ln_m
}

/// Effective logit a_i = q_i/b + theta_i (all fixed-point reals).
pub fn logit(q_i: i128, theta_i: i128, b: i128) -> i128 {
    q_i * SCALE / b + theta_i
}

/// Live marginal prices (probabilities) for the given logits. Sum ~= SCALE.
pub fn prices(logits: &[i128]) -> Vec<i128> {
    let amax = *logits.iter().max().unwrap();
    let mut es = Vec::with_capacity(logits.len());
    let mut sum = 0i128;
    for &l in logits {
        let e = exp_neg(amax - l);
        es.push(e);
        sum += e;
    }
    es.iter().map(|&e| e * SCALE / sum).collect()
}

/// LMSR cost C(q) = b * ln(sum exp(a_i)), numerically stable (subtract max).
pub fn lmsr_cost(logits: &[i128], b: i128) -> i128 {
    let amax = *logits.iter().max().unwrap();
    let mut sum = 0i128; // fixed-point, >= SCALE (max term contributes SCALE)
    for &l in logits {
        sum += exp_neg(amax - l);
    }
    let ln_sum = ln_fx(sum);
    mul(b, amax + ln_sum)
}

/// USD-cost a trader pays to move the book from `before` to `after`.
pub fn trade_cost(before: &[i128], after: &[i128], b: i128) -> i128 {
    lmsr_cost(after, b) - lmsr_cost(before, b)
}

/// Maximum the liquidity provider can ever lose: b * ln(n). Known up front.
pub fn max_subsidy(n_outcomes: usize, b: i128) -> i128 {
    let n_fx = (n_outcomes as i128) * SCALE;
    mul(b, ln_fx(n_fx))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn approx(a: i128, b: i128, tol: i128) {
        assert!((a - b).abs() <= tol, "left={} right={} diff={} tol={}", a, b, (a - b).abs(), tol);
    }

    #[test]
    fn exp_neg_basics() {
        assert_eq!(exp_neg(0), SCALE);
        approx(exp_neg(LN2), SCALE / 2, SCALE / 1000);          // e^-ln2 = 0.5
        approx(exp_neg(SCALE), 367_879_441, SCALE / 1000);      // e^-1 ~ 0.3679
    }

    #[test]
    fn ln_basics() {
        approx(ln_fx(2 * SCALE), LN2, SCALE / 1000);            // ln 2
        approx(ln_fx(2_718_281_828), SCALE, SCALE / 1000);      // ln e = 1
    }

    #[test]
    fn prices_sum_to_one() {
        let p = prices(&[300_000_000, -100_000_000, 50_000_000, 0]);
        let s: i128 = p.iter().sum();
        approx(s, SCALE, SCALE / 100_000);
    }

    #[test]
    fn prices_uniform() {
        for &pi in prices(&[0, 0, 0]).iter() {
            approx(pi, SCALE / 3, SCALE / 1000);
        }
    }

    #[test]
    fn prices_monotone() {
        let p = prices(&[0, 200_000_000]); // outcome 1 more likely
        assert!(p[1] > p[0]);
    }

    #[test]
    fn bounded_loss_equals_initial_cost() {
        let b = 100 * SCALE; // depth 100
        // at q=0, theta=0 the maker's subsidy is exactly b*ln(n)
        approx(lmsr_cost(&[0, 0], b), max_subsidy(2, b), SCALE / 100);
    }

    #[test]
    fn price_equals_marginal_cost() {
        // buying 1 share of outcome 0 in a 2-outcome market should cost ~= its price (~0.5)
        let b = 100 * SCALE;
        let before = [logit(0, 0, b), logit(0, 0, b)];
        let after  = [logit(SCALE, 0, b), logit(0, 0, b)]; // +1 share on outcome 0
        let c = trade_cost(&before, &after, b);
        approx(c, SCALE / 2, SCALE / 50); // ~0.5 USD within 0.02
    }
}

pub mod pool;
