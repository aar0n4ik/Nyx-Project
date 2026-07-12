// Nyx TxLINE oracle client — verified live snapshot source for the mesh + brain.
// Default: talk through the deployed Nyx proxy (/api/txline), which already injects
// TxLINE auth server-side and returns 200 — so the desktop works with zero secrets.
// Advanced: set NYX_SNAPSHOT_BASE to a raw TxLINE origin (+ TXLINE_JWT) to go direct.
const PROXY_DEFAULT = "https://nyx-project-roan.vercel.app/api/txline";
const NET = process.env.TXLINE_NET || "devnet";
const RAW = { devnet: "https://txline-dev.txodds.com", mainnet: "https://txline.txodds.com" };
export class TxlineOracle {
  constructor(opts = {}) {
    this.base = (opts.base || process.env.NYX_SNAPSHOT_BASE || PROXY_DEFAULT).replace(/\/+$/, "");
    this.useProxy = opts.useProxy != null ? opts.useProxy : /\/api\/txline$/.test(this.base) || process.env.NYX_USE_PROXY === "1";
    this.rawOrigin = opts.rawOrigin || process.env.TXLINE_ORIGIN || RAW[NET] || RAW.devnet;
    this.jwt = opts.jwt || process.env.TXLINE_JWT || null;
    this.apiToken = opts.apiToken || process.env.TXLINE_API_TOKEN || null;
  }
  async guestStart() {
    const r = await fetch(this.rawOrigin + "/auth/guest/start", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (!r.ok) throw new Error("guest/start failed: " + r.status);
    const j = await r.json();
    this.jwt = j.token || j.jwt || this.jwt;
    return this.jwt;
  }
  _headers() {
    const h = { accept: "application/json" };
    if (!this.useProxy) {
      if (this.jwt) h.authorization = "Bearer " + this.jwt;
      if (this.apiToken) h["x-api-token"] = this.apiToken;
    }
    return h;
  }
  parse(json, fixtureId) {
    const arr = Array.isArray(json) ? json : (json && (json.events || json.data)) || [];
    let last = null;
    for (const e of arr) if (e && (e.Score || e.Clock || e.GameState)) last = e;
    const n = last || {};
    const g1 = (((n.Score || {}).Participant1 || {}).Total || {}).Goals || 0;
    const g2 = (((n.Score || {}).Participant2 || {}).Total || {}).Goals || 0;
    const secs = (n.Clock || {}).Seconds;
    const running = (n.Clock || {}).Running;
    const state = n.GameState || "scheduled";
    const minute = secs != null ? Math.min(90, Math.floor(secs / 60)) : 0;
    const live = !!running || /play|inplay|1h|2h|live|first|second/i.test(String(state));
    return { fixtureId, g1, g2, minute, live, state, ts: Date.now() };
  }
  async snapshot(fixtureId) {
    if (!this.useProxy && !this.jwt) await this.guestStart().catch(() => {});
    const url = this.base + "/scores/snapshot/" + fixtureId;
    const r = await fetch(url, { headers: this._headers() });
    if (!r.ok) throw new Error("snapshot " + fixtureId + " failed: " + r.status + (this.useProxy ? " (proxy)" : " (direct)"));
    return this.parse(await r.json(), fixtureId);
  }
}
export default TxlineOracle;
