// Nyx agent — orchestrates oracle -> mesh -> on-device brain -> optional USD₮ settlement.
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
  "Goals never un-happen: once an over line or both-teams-to-score is reached, the outcome is settled at 100%.",
  "TxLINE provides verifiable on-chain match state; the mesh gossips it so truth survives server outages.",
  "Nyx settles winnings in USD\u20ae via the Tether WDK; QVAC keeps inference private and on-device.",
];
function isFullTime(st) {
  const s = String(st.state || "").toLowerCase();
  if (/ft|full|finish|ended|final|aet|after ?extra|post/.test(s)) return true;
  return st.live === false && (st.minute || 0) >= 90;
}
function decidedMarket(market, st) {
  const g1 = st.g1 || 0, g2 = st.g2 || 0, total = g1 + g2, ft = isFullTime(st);
  const m = String(market).toLowerCase();
  const overNeed = { ou05: 1, ou15: 2, ou25: 3, ou35: 4, ou45: 5 };
  const underCap = { uu05: 1, uu15: 2, uu25: 3, uu35: 4 };
  if (m in overNeed) {
    const need = overNeed[m];
    if (total >= need) return { p: 1, reason: `Over line reached: ${total} goals \u2265 ${need}` };
    if (ft) return { p: 0, reason: `Full time with only ${total} goals` };
    return null;
  }
  if (m in underCap) {
    const cap = underCap[m];
    if (total >= cap) return { p: 0, reason: `Under line busted: ${total} goals` };
    if (ft) return { p: 1, reason: `Full time with ${total} goals under the line` };
    return null;
  }
  if (m === "btts" || m === "gg") {
    if (g1 >= 1 && g2 >= 1) return { p: 1, reason: "Both teams have already scored" };
    if (ft) return { p: 0, reason: "Full time and one side failed to score" };
    return null;
  }
  if (m === "nbtts" || m === "ng") {
    if (ft) return { p: (g1 >= 1 && g2 >= 1) ? 0 : 1, reason: "Full time BTTS resolved" };
    return null;
  }
  if (["h", "1", "d", "x", "a", "2", "nh", "na"].includes(m)) {
    if (!ft) return null;
    const home = g1 > g2, draw = g1 === g2, away = g2 > g1;
    const map = { h: home, "1": home, d: draw, x: draw, a: away, "2": away, nh: !home, na: !away };
    return { p: map[m] ? 1 : 0, reason: `Full time result ${g1}-${g2}` };
  }
  return null;
}
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
    this._isSource = opts.source !== false;
  }
  async start() {
    this.mesh.on("ready", (i) => this.emit("log", `mesh ready on "${i.topic}" as ${i.nodeId}`));
    this.mesh.on("peer", (p) => this.emit("log", `peers: ${p.count}`));
    this.mesh.on("warn", (w) => this.emit("log", `mesh: ${w}`));
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
        this.mesh.broadcast(snap);
        this.emit("snapshot", { snapshot: snap, source: "txline" });
      } catch (e) { this.emit("log", `oracle ${id}: ${e.message}`); }
    }
  }
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
    const dec = decidedMarket(market, st);
    let p, guaranteed = false, reason = null;
    if (dec) { p = dec.p; guaranteed = true; reason = dec.reason; }
    else { const m = this.model(st); p = m[market] != null ? m[market] : 0.5; }
    const fairOdds = p > 0 ? +(1 / p).toFixed(2) : null;
    const edge = +(bookOdds * p - 1).toFixed(3);
    const b = bookOdds - 1, kelly = b > 0 ? Math.max(0, (bookOdds * p - 1) / b) : 0;
    const stakePct = Math.min(kelly * 0.5, 0.02);
    const ctx = { match: "fixture " + fixtureId, score: `${st.g1}-${st.g2}`, minute: st.minute,
      market, fairProb: p, fairOdds, bookOdds, edge, suggestedStakePct: stakePct,
      guaranteed, guaranteedReason: reason, lang };
    const verdict = await this.brain.analyzeMatch(ctx);
    return { ...ctx, stake: +(bankroll * stakePct).toFixed(2), verdict };
  }
  async settleWin({ to, amount, fixtureId, market }) {
    return this.wallet.settle({ to, amount, memo: JSON.stringify({ p: "nyx-bet-v1", fixtureId, market }) });
  }
  async stop() { if (this._timer) clearInterval(this._timer); await this.mesh.stop(); await this.brain.unload(); }
}
export default NyxAgent;
export { decidedMarket, isFullTime };
