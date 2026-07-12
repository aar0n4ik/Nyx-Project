// Nyx desktop mesh module — public API + runnable demo (now with real auto-settlement).
export { NyxBrain } from "./qvac-brain.js";
export { NyxMesh } from "./mesh.js";
export { TxlineOracle } from "./txline-oracle.js";
export { NyxWallet } from "./wallet.js";
export { NyxAgent } from "./agent.js";
import { NyxAgent } from "./agent.js";
import { NyxWallet } from "./wallet.js";
export function createNyx(opts = {}) { return new NyxAgent(opts); }
// --- demo runner ---
const isMain = (() => { try { return import.meta.url === `file://${process.argv[1]}`; } catch { return false; } })();
if (isMain) {
  const fixtures = (process.env.NYX_FIXTURES || "17588232").split(",").map((s) => Number(s.trim()));
  const market = process.env.NYX_MARKET || "ou25";
  const bookOdds = Number(process.env.NYX_BOOK_ODDS || 1.95);
  const bankroll = Number(process.env.NYX_BANKROLL || 1000);
  const agent = new NyxAgent({ fixtures });
  agent.on("log", (m) => console.log("[nyx]", m));
  agent.on("snapshot", ({ snapshot, source }) => console.log("[snap]", source, JSON.stringify(snapshot)));
  agent.on("settle", ({ to, amount, result }) => {
    if (result.settled) {
      console.log(`[settle] PAID \u2705 ${amount} USD\u20ae -> ${to}`);
      console.log("[settle] tx:", result.hash);
      console.log("[settle] explorer: https://explorer.solana.com/tx/" + result.hash + "?cluster=devnet");
    } else { console.log("[settle] not settled:", result.reason); }
  });
  await agent.start();
  let winner = process.env.NYX_DEMO_RECIPIENT;
  if (!winner) { const w2 = new NyxWallet({ accountIndex: 1 }); const s2 = await w2.init(); winner = s2.address; await w2.dispose(); console.log("[nyx] winner (your account #1):", winner); }
  console.log("[nyx] agent running. Ctrl+C to stop. Analyzing in 14s\u2026");
  setTimeout(async () => {
    try {
      if (process.env.NYX_AUTOPAY_DEMO === "1" || process.env.NYX_AUTOPAY_DEMO === "true") {
        const cur = agent.snapshots.get(fixtures[0]) || {};
        agent.setSnapshot(fixtures[0], { ...cur, g1: 3, g2: 1, minute: 90, state: "FT", live: false });
        console.log("[nyx] demo scenario seeded: 3-1 FT (market decided)");
      }
      const r = await agent.autoSettle({ fixtureId: fixtures[0], market, bookOdds, bankroll, to: winner });
      console.log("\n[verdict]", r.analysis.verdict.engine, "\n" + r.analysis.verdict.text);
      console.log(`[metrics] fairProb=${(r.analysis.fairProb * 100).toFixed(1)}% edge=${(r.analysis.edge * 100).toFixed(1)}% stake=${r.analysis.stake} USD\u20ae`);
    } catch (e) { console.log("[autoSettle]", e.message); }
  }, 14000);
  process.on("SIGINT", async () => { console.log("\n[nyx] stopping\u2026"); await agent.stop(); process.exit(0); });
}
