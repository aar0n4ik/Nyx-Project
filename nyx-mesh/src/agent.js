// Nyx agent — orchestrates oracle -> mesh -> on-device brain -> optional USD₮ settlement.
// This is the desktop brain that makes Nyx work offline-first and peer-to-peer.
import { EventEmitter } from "node:events";
import { NyxBrain } from "./qvac-brain.js";
import { NyxMesh } from "./mesh.js";
import { TxlineOracle } from "./txline-oracle.js";
import { NyxWallet } from "./wallet.js";
const KB = [
  "Half-Kelly staking risks half of the full-Kelly fraction to cut variance while keeping most growth.",
  "Edge (EV) equals bookOdds * fairProbability - 1; only positive edge is a value bet.",
  "In-play goal expectancy decays with match minute; remaining lambda scales by (90 - minute)/90.",
  "Over 2.5 goals resolves yes when total goals reach 3; both-teams-to-score needs each side to score.",
  "TxLINE provides verifiable on-chain match state; the mesh gossips it so truth survives server outages.",
  "Nyx settles winnings in USD\u20ae via the Tether WDK; QVAC keeps inference private and on-device.",
];
export class NyxAgent extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.fixtures = opts.fixtures || [17588232];
    this.pollMs = opts.pollMs || 12000;
    this.brain = new NyxBrain(opts.knowledge || KB);
    this.mesh = new NyxMesh({ topic: opts.topic || "txline-worldcup" });
    this.oracle = new TxlineOracle(opts.oracle || {});
    this.wallet = new NyxWallet(opts.wallet || {});
    this.snapshots = new Map();
    this._timer = null;
    this._isSource = opts.source !== false; // this node also fetches from TxLINE
  }
  async start() {
    this.mesh.on("ready", (i) => this.emit("log", `mesh ready on "${i.topic}" as ${i.nodeId}`));
    this.mesh.on("peer", (p) => this.emit("log", `peers: ${p.count}`));
    this.mesh.on("warn", (w) => this.emit("log", `mesh: ${w}`));
    // Snapshots arriving from other devices (works even if this node has no internet).
    this.mesh.on("snapshot", ({ snapshot, from }) => {
      this.snapshots.set(snapshot.fixtureId, snapshot);
      this.emit("snapshot", { snapshot, source: "mesh:" + from });
    });
    await this.mesh.start();
    const w = await this.wallet.init(process.env.NYX_WALLET_SEED);
    this.emit("log", w.ready ? `wallet ready (${w.address})` : `wallet: ${w.reason}`);
    if (this._isSource) { await this._poll(); this._timer = setInterval(() => this._poll(), this.pollMs); }
    return this;
  }
  async _poll() {
    for (const id of this.fixtures) {
      try {
        const snap = await this.oracle.snapshot(id);
        this.snapshots.set(id, snap);
        this.mesh.broadcast(snap); // share verified state with the mesh
        this.emit("snapshot", { snapshot: snap, source: "txline" });
      } catch (e) { this.emit("log", `oracle ${id}: ${e.message}`); }
    }
  }
  // Fair model (mirror of the web agent) so the brain has quantitative context.
  model(st) {
    const minute = Math.min(90, st.minute || 0), rem = Math.max(0.001, (90 - minute) / 90);
    const gc = (st.g1 || 0) + (st.g2 || 0), lamRem = 2.7 * rem;
    const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / fact(k);
    const cdf = (k, l) => { let s = 0; for (let i = 0; i <= k; i++) s += pois(i, l); return s; };
    const clamp = (p) => Math.min(0.995, Math.max(0.005, p));
    const over = (line) => { const k = Math.floor(line) - gc; return k < 0 ? 0.995 : clamp(1 - cdf(k, lamRem)); };
    return { ou25: over(2.5), ou15: over(1.5), minute, gc };
  }
  async analyze({ fixtureId, market = "ou25", bookOdds = 2.0, bankroll = 1000, lang = "en" }) {
    const st = this.snapshots.get(fixtureId);
    if (!st) throw new Error("no snapshot yet for " + fixtureId);
    const m = this.model(st);
    const p = m[market] != null ? m[market] : 0.5;
    const fairOdds = +(1 / p).toFixed(2);
    const edge = +(bookOdds * p - 1).toFixed(3);
    const b = bookOdds - 1, kelly = b > 0 ? Math.max(0, (bookOdds * p - 1) / b) : 0;
    const stakePct = Math.min(kelly * 0.5, 0.02);
    const ctx = { match: "fixture " + fixtureId, score: `${st.g1}-${st.g2}`, minute: st.minute,
      market, fairProb: p, fairOdds, bookOdds, edge, suggestedStakePct: stakePct, lang };
    const verdict = await this.brain.analyzeMatch(ctx);
    return { ...ctx, stake: +(bankroll * stakePct).toFixed(2), verdict };
  }
  async settleWin({ to, amount, fixtureId, market }) {
    return this.wallet.settle({ to, amount, memo: JSON.stringify({ p: "nyx-bet-v1", fixtureId, market }) });
  }
  async stop() { if (this._timer) clearInterval(this._timer); await this.mesh.stop(); await this.brain.unload(); }
}
export default NyxAgent;
