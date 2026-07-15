import { describe, it, expect } from "vitest";
import { marketPrice, fundingTick, liquidity } from "../src/lop.js";

const pool = { qYes: 0, qNo: 0, b0: 1000 };

describe("LOP invariants", () => {
  it("starts at 50/50", () => {
    expect(marketPrice(pool, 0)).toBeCloseTo(0.5, 6);
  });
  it("liquidity decays toward full time", () => {
    expect(liquidity(1000, 0.99)).toBeLessThan(liquidity(1000, 0.1));
  });
  it("funding pulls market toward oracle truth", () => {
    expect(fundingTick(pool, { oracleProb: 0.8, timeFraction: 0.3 }).transferPerShare).toBeGreaterThan(0);
  });
  it("settlement is the final funding tick", () => {
    const f = fundingTick(pool, { oracleProb: 1, timeFraction: 1, decided: true, terminalPayoff: 1 });
    expect(f.isSettlement).toBe(true);
    expect(f.marketPrice + f.transferPerShare).toBeCloseTo(1, 6);
  });
});
