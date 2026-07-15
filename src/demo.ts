import { PoolState, marketPrice, quote, fundingTick } from "./lop.js";

let pool: PoolState = { qYes: 0, qNo: 0, b0: 1000 };

const timeline: Array<[number, number, string]> = [
  [0.00, 0.50, "Kickoff"],
  [0.20, 0.62, "YES dominates possession"],
  [0.35, 0.78, "GOAL for YES"],
  [0.55, 0.71, "NO pushes back"],
  [0.80, 0.88, "YES defends the lead"],
];

console.log("=== LOP live match simulation ===\n");
for (const [t, oracleProb, event] of timeline) {
  const before = marketPrice(pool, t);
  const f = fundingTick(pool, { oracleProb, timeFraction: t });
  const dir = f.transferPerShare > 0 ? "YES" : "NO";
  const { next } = quote(pool, t, dir, 50);
  pool = next;
  console.log(
    `t=${(t * 100).toFixed(0).padStart(3)}%  ${event.padEnd(28)}` +
    `oracle=${oracleProb.toFixed(2)}  mkt ${before.toFixed(3)}->${marketPrice(pool, t).toFixed(3)}  ` +
    `funding=${f.transferPerShare >= 0 ? "+" : ""}${f.transferPerShare.toFixed(4)}`
  );
}

const settle = fundingTick(pool, { oracleProb: 1, timeFraction: 1, decided: true, terminalPayoff: 1 });
console.log(
  `\nFINAL WHISTLE  settlement=${settle.isSettlement}  ` +
  `price ${settle.marketPrice.toFixed(3)} -> ${(settle.marketPrice + settle.transferPerShare).toFixed(3)} (YES wins)`
);
