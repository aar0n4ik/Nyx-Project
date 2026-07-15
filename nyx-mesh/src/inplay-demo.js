// Nyx in-play demo: prices a LIVE, UNDECIDED market with a real edge (Poisson +
// half-Kelly), REFUSES to settle while uncertain, and pays only the instant the
// outcome is GUARANTEED. No fabricated "already decided" scenario.
import "./load-env.js";
import { NyxAgent } from "./agent.js";
import { NyxWallet } from "./wallet.js";

const fixtureId = Number(process.env.NYX_FIXTURES || 17588232);
const market = process.env.NYX_MARKET || "ou25";
const bookOdds = Number(process.env.NYX_BOOK_ODDS || 2.4);
const bankroll = Number(process.env.NYX_BANKROLL || 1000);

const agent = new NyxAgent({ fixtures: [fixtureId], source: false });
agent.on("log", (m) => console.log("[nyx]", m));
await agent.start();

function show(tag, r) {
  console.log(`\n=== ${tag} ===`);
  console.log(`score ${r.score} @ ${r.minute}'  market=${r.market}  book=${r.bookOdds}`);
  console.log(`fairProb=${(r.fairProb * 100).toFixed(1)}%  fairOdds=${r.fairOdds}  edge=${(r.edge * 100).toFixed(1)}%`);
  console.log(`half-Kelly=${(r.suggestedStakePct * 100).toFixed(2)}%  stake=${r.stake} USDT  guaranteed=${r.guaranteed}`);
}

// 1) LIVE + UNDECIDED — real edge from the model; the agent MUST NOT settle.
agent.setSnapshot(fixtureId, { g1: 1, g2: 1, minute: 62, state: "2H", live: true });
let s = await agent.autoSettle({ fixtureId, market, bookOdds, bankroll, to: "1nc0mpleteMatchNoPayout1111111111111111111" });
show("LIVE 1-1 @62' (undecided)", s.analysis);
console.log(`autoSettle -> settled=${s.settled}  (${s.reason})`);

// 2) 3rd goal drops -> Over 2.5 GUARANTEED -> now, and only now, it pays out.
let winner = process.env.NYX_DEMO_RECIPIENT;
if (!winner) { const w = new NyxWallet({ accountIndex: 1 }); const w2 = await w.init(); winner = w2.address; await w.dispose(); }
agent.setSnapshot(fixtureId, { g1: 2, g2: 1, minute: 71, state: "2H", live: true });
s = await agent.autoSettle({ fixtureId, market, bookOdds, bankroll, to: winner });
show("LIVE 2-1 @71' (Over 2.5 reached)", s.analysis);
console.log(`autoSettle -> settled=${s.settled}  tx/reason=${s.hash || s.reason}`);

await agent.stop();
