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
    this.mesh.on("ready", (i) => this.emit("log", `mesh ready on \"${i.topic}\" as ${i.nodeId}`));
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
  // Seed/replace a snapshot (mesh ingest or deterministic demo replay).
  setSnapshot(fixtureId, snap) {
    const s = { fixtureId, ...snap };
    this.snapshots.set(fixtureId, s);
    this.emit("snapshot", { snapshot: s, source: "manual" });
    return s;
  }
  // Prices the requested LIVE market from match state using a Poisson goals model.
  // Remaining goal expectancy (lamRem) decays with the match minute and is split
  // evenly between the two teams for scorer-based markets like BTTS.
  model(st) {
    const minute = Math.min(90, st.minute || 0);
    const rem = Math.max(0.001, (90 - minute) / 90);
    const g1 = st.g1 || 0, g2 = st.g2 || 0, gc = g1 + g2;
    const lamRem = 2.7 * rem;        // remaining total goals expected
    const lamTeam = lamRem / 2;      // per-team remaining expectancy
    const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
    const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / fact(k);
    const cdf = (k, l) => { let s = 0; for (let i = 0; i <= Math.max(0, k); i++) s += pois(i, l); return s; };
    const clamp = (p) => Math.min(0.995, Math.max(0.005, p));
    // P(final total strictly beats the line), conditioned on goals already scored.
    const over = (line) => { const need = Math.ceil(line) - gc; return need <= 0 ? 0.995 : clamp(1 - cdf(need - 1, lamRem)); };
    const under = (line) => clamp(1 - over(line));
    // P(both teams score by full time), conditioned on who has already scored.
    const p1 = g1 >= 1 ? 1 : 1 - Math.exp(-lamTeam);
    const p2 = g2 >= 1 ? 1 : 1 - Math.exp(-lamTeam);
    const btts = clamp(p1 * p2);
    return {
      minute, gc,
      ou05: over(0.5), ou15: over(1.5), ou25: over(2.5), ou35: over(3.5), ou45: over(4.5),
      uu05: under(0.5), uu15: under(1.5), uu25: under(2.5), uu35: under(3.5),
      btts, gg: btts, nbtts: clamp(1 - btts), ng: clamp(1 - btts),
    };
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
    const ctx = { fixtureId, match: "fixture " + fixtureId, score: `${st.g1}-${st.g2}`, minute: st.minute,
      market, fairProb: p, fairOdds, bookOdds, edge, suggestedStakePct: stakePct,
      guaranteed, guaranteedReason: reason, lang };
    const verdict = await this.brain.analyzeMatch(ctx);
    return { ...ctx, stake: +(bankroll * stakePct).toFixed(2), verdict };
  }
  async settleWin({ to, amount, fixtureId, market }) {
    return this.wallet.settle({ to, amount, memo: JSON.stringify({ p: "nyx-bet-v1", fixtureId, market }) });
  }
  // Killer path: analyze a market and, the instant the outcome is GUARANTEED (100%),
  // pay the winner in real USD₮ on-chain. No human in the loop.
  async autoSettle({ fixtureId, market = "ou25", bookOdds = 1.95, bankroll = 1000, to, amount, lang = "en" }) {
    const r = await this.analyze({ fixtureId, market, bookOdds, bankroll, lang });
    const isWin = r.guaranteed && r.fairProb >= 1;
    if (!isWin) {
      const why = r.guaranteed ? `settled against (${r.guaranteedReason})` : "outcome not guaranteed yet";
      this.emit("log", `autoSettle skipped \u2014 ${why}`);
      return { settled: false, guaranteed: r.guaranteed, reason: why, analysis: r };
    }
    const payout = amount != null ? amount : +(r.stake * r.bookOdds).toFixed(2);
    this.emit("log", `GUARANTEED win (${r.guaranteedReason}) \u2014 auto-paying ${payout} USD\u20ae to ${to}`);
    const res = await this.settleWin({ to, amount: payout, fixtureId, market });
    this.emit("settle", { fixtureId, market, to, amount: payout, result: res });
    return { settled: !!res.settled, hash: res.hash || null, reason: res.reason || null, amount: payout, analysis: r };
  }
  async stop() { if (this._timer) clearInterval(this._timer); await this.mesh.stop(); await this.brain.unload(); }
}
export default NyxAgent;
export { decidedMarket, isFullTime };
