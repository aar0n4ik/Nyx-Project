// Nyx desktop mesh module — public API + runnable demo.
// Integrate into the Electron main process, or run `node src/index.js` for a live demo.
export { NyxBrain } from "./qvac-brain.js";
export { NyxMesh } from "./mesh.js";
export { TxlineOracle } from "./txline-oracle.js";
export { NyxWallet } from "./wallet.js";
export { NyxAgent } from "./agent.js";
import { NyxAgent } from "./agent.js";
export function createNyx(opts = {}) { return new NyxAgent(opts); }
// --- demo runner ---
const isMain = (() => { try { return import.meta.url === `file://${process.argv[1]}`; } catch { return false; } })();
if (isMain) {
  const fixtures = (process.env.NYX_FIXTURES || "17588232").split(",").map((s) => Number(s.trim()));
  const agent = new NyxAgent({ fixtures });
  agent.on("log", (m) => console.log("[nyx]", m));
  agent.on("snapshot", ({ snapshot, source }) => console.log("[snap]", source, JSON.stringify(snapshot)));
  await agent.start();
  console.log("[nyx] agent running. Ctrl+C to stop. Analyzing in 14s\u2026");
  setTimeout(async () => {
    try {
      const r = await agent.analyze({ fixtureId: fixtures[0], market: "ou25", bookOdds: 1.95, bankroll: 1000 });
      console.log("\n[verdict]", r.verdict.engine, "\n" + r.verdict.text);
      console.log(`[metrics] fairProb=${(r.fairProb * 100).toFixed(1)}% edge=${(r.edge * 100).toFixed(1)}% stake=${r.stake} USD\u20ae`);
    } catch (e) { console.log("[analyze]", e.message); }
  }, 14000);
  process.on("SIGINT", async () => { console.log("\n[nyx] stopping\u2026"); await agent.stop(); process.exit(0); });
}
