// Nyx TxLINE oracle client — guest auth + verified live snapshot fetch.
// Real network calls; values overridable via env. Used as the mesh's source of truth.
const NET = process.env.TXLINE_NET || "devnet";
const PRESETS = {
  devnet: { apiOrigin: "https://txline-dev.txodds.com", programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J", txlTokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG", rpcUrl: "https://api.devnet.solana.com" },
  mainnet: { apiOrigin: "https://txline.txodds.com", programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA", txlTokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL", rpcUrl: "https://api.mainnet-beta.solana.com" },
};
export class TxlineOracle {
  constructor(opts = {}) {
    const p = PRESETS[NET] || PRESETS.devnet;
    this.apiOrigin = opts.apiOrigin || process.env.TXLINE_ORIGIN || p.apiOrigin;
    this.jwt = opts.jwt || process.env.TXLINE_JWT || null;
    this.apiToken = opts.apiToken || process.env.TXLINE_API_TOKEN || null;
  }
  async guestStart() {
    const r = await fetch(this.apiOrigin + "/auth/guest/start", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (!r.ok) throw new Error("guest/start failed: " + r.status);
    const j = await r.json();
    this.jwt = j.token || j.jwt || this.jwt;
    return this.jwt;
  }
  _headers() {
    const h = { accept: "application/json" };
    if (this.jwt) h.authorization = "Bearer " + this.jwt;
    if (this.apiToken) h["x-api-token"] = this.apiToken;
    return h;
  }
  // Normalizes raw TxLINE score feed into a compact snapshot for the mesh + brain.
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
    if (!this.jwt) await this.guestStart().catch(() => {});
    const url = this.apiOrigin + "/api/scores/snapshot/" + fixtureId;
    const r = await fetch(url, { headers: this._headers() });
    if (!r.ok) throw new Error("snapshot " + fixtureId + " failed: " + r.status);
    return this.parse(await r.json(), fixtureId);
  }
}
export default TxlineOracle;
