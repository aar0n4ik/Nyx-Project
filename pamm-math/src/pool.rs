//! Full market lifecycle over the fixed-point LMSR core (pure, no chain deps).
//! The Anchor program is just a thin CPI wrapper around this.

use crate::{logit, lmsr_cost, prices as market_prices, trade_cost, SCALE};

pub const MAX_OUTCOMES: usize = 8;

#[derive(Clone, Debug)]
pub struct Pool {
    pub n: usize,
    pub b: i128,
    pub q: [i128; MAX_OUTCOMES],     // net shares sold per outcome
    pub theta: [i128; MAX_OUTCOMES], // live oracle recentring (pushed by keeper)
    pub resolved: bool,
    pub winner: usize,
}

impl Pool {
    pub fn new(n: usize, b: i128) -> Self {
        assert!(n >= 2 && n <= MAX_OUTCOMES);
        Pool { n, b, q: [0; MAX_OUTCOMES], theta: [0; MAX_OUTCOMES], resolved: false, winner: 0 }
    }

    fn logits(&self) -> Vec<i128> {
        (0..self.n).map(|i| logit(self.q[i], self.theta[i], self.b)).collect()
    }

    /// Live probabilities (sum == 1).
    pub fn prices(&self) -> Vec<i128> { market_prices(&self.logits()) }

    /// Current LMSR cost (maker's liability).
    pub fn cost(&self) -> i128 { lmsr_cost(&self.logits(), self.b) }

    /// Keeper pushes the live oracle recentring vector each tick.
    pub fn set_theta(&mut self, theta: &[i128]) {
        for i in 0..self.n { self.theta[i] = theta[i]; }
    }

    /// USD (fx) the trader pays to buy `shares` of outcome `i`.
    pub fn buy(&mut self, i: usize, shares: i128) -> i128 {
        assert!(!self.resolved && i < self.n && shares > 0);
        let before = self.logits();
        self.q[i] += shares;
        let after = self.logits();
        trade_cost(&before, &after, self.b)
    }

    /// USD (fx) returned to the trader when cashing out `shares` of outcome `i`.
    pub fn sell(&mut self, i: usize, shares: i128) -> i128 {
        assert!(!self.resolved && i < self.n && shares > 0 && self.q[i] >= shares);
        let before = self.logits();
        self.q[i] -= shares;
        let after = self.logits();
        -trade_cost(&before, &after, self.b)
    }

    /// Freeze the curve on a decided outcome (called by the GUARANTEED detector).
    pub fn resolve(&mut self, winner: usize) {
        assert!(winner < self.n);
        self.resolved = true;
        self.winner = winner;
    }

    /// Payout (fx USD): 1 USD per winning share, 0 otherwise.
    pub fn claim(&self, i: usize, shares: i128) -> i128 {
        assert!(self.resolved);
        if i == self.winner { shares } else { 0 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn approx(a: i128, b: i128, tol: i128) {
        assert!((a - b).abs() <= tol, "left={} right={} diff={}", a, b, (a - b).abs());
    }
    fn b() -> i128 { 100 * SCALE }

    #[test]
    fn round_trip_is_lossless() {
        let mut p = Pool::new(2, b());
        let cost = p.buy(0, 10 * SCALE);
        let back = p.sell(0, 10 * SCALE);
        assert_eq!(cost, back);   // path-independent -> exact refund
        assert_eq!(p.q[0], 0);
    }

    #[test]
    fn prices_track_theta() {
        let mut p = Pool::new(2, b());
        p.set_theta(&[300_000_000, 0]); // push outcome 0 up
        let pr = p.prices();
        assert!(pr[0] > pr[1]);
        approx(pr[0] + pr[1], SCALE, SCALE / 100_000);
    }

    #[test]
    fn buying_raises_price() {
        let mut p = Pool::new(3, b());
        let p0 = p.prices()[0];
        p.buy(0, 50 * SCALE);
        assert!(p.prices()[0] > p0);
    }

    #[test]
    fn resolve_and_claim() {
        let mut p = Pool::new(2, b());
        p.buy(0, 10 * SCALE);
        p.resolve(0);
        assert_eq!(p.claim(0, 10 * SCALE), 10 * SCALE);
        assert_eq!(p.claim(1, 10 * SCALE), 0);
    }

    #[test]
    fn lp_loss_is_bounded() {
        // A whale buys the eventual winner. Maker's payout comes from a subsidy
        // that is mathematically capped at b*ln(n) — no matter how big the bet.
        let mut p = Pool::new(2, b());
        let big = 1000 * SCALE;
        let collected = p.buy(0, big);
        p.resolve(0);
        let payout = p.claim(0, big);
        let maker_loss = payout - collected;
        let max_loss = crate::max_subsidy(2, b());
        assert!(maker_loss <= max_loss + SCALE, "loss {} exceeds bound {}", maker_loss, max_loss);
    }
}
