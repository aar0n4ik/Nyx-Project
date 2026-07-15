// LOP — Live Odds Perpetual core math. Pure, deterministic, testable.

export interface MatchState {
  oracleProb: number;      // fair probability from TxLINE, [0,1]
  timeFraction: number;    // 0 = kickoff, 1 = full time
  decided?: boolean;       // outcome locked
  terminalPayoff?: 0 | 1;  // final payoff if decided
}

export interface PoolState {
  qYes: number;
  qNo: number;
  b0: number; // base liquidity (max LP loss ~ b0 * ln 2)
}

// pm-AMM style time decay: liquidity shrinks toward full time.
export function liquidity(b0: number, timeFraction: number): number {
  const remaining = Math.max(1e-4, 1 - timeFraction);
  return b0 * Math.pow(remaining, 0.84);
}

function cost(qYes: number, qNo: number, b: number): number {
  const m = Math.max(qYes, qNo); // log-sum-exp stability
  return b * (m / b + Math.log(Math.exp((qYes - m) / b) + Math.exp((qNo - m) / b)));
}

export function marketPrice(pool: PoolState, t: number): number {
  const b = liquidity(pool.b0, t);
  const eY = Math.exp(pool.qYes / b);
  const eN = Math.exp(pool.qNo / b);
  return eY / (eY + eN);
}

export function quote(pool: PoolState, t: number, side: "YES" | "NO", size: number) {
  const b = liquidity(pool.b0, t);
  const before = cost(pool.qYes, pool.qNo, b);
  const qYes = pool.qYes + (side === "YES" ? size : 0);
  const qNo = pool.qNo + (side === "NO" ? size : 0);
  const after = cost(qYes, qNo, b);
  return { cost: after - before, next: { ...pool, qYes, qNo } };
}

// THE unification: funding recenters to oracle; at decision it IS settlement.
export function fundingTick(pool: PoolState, s: MatchState, kappa = 0.15) {
  const t = s.decided ? 1 : s.timeFraction;
  const target = s.decided ? (s.terminalPayoff ?? 0) : s.oracleProb;
  const mkt = marketPrice(pool, t);
  const rate = s.decided ? 1 : kappa;
  const transferPerShare = rate * (target - mkt);
  return { transferPerShare, isSettlement: !!s.decided, marketPrice: mkt, target };
}
