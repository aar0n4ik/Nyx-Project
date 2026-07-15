// Provider registry + reputation. Closes QVAC's "no discovery phase": a consumer
// finds providers by model and price instead of hard-coding a public key.
// Backed by a local JSON file; the shape maps 1:1 onto an on-chain registry
// (pubkey, price, stake, track record), so the store is swappable later.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DEFAULT_PATH = process.env.NYX_REGISTRY_PATH || "nyx-registry.json";

export class ProviderRegistry {
  constructor({ path = DEFAULT_PATH } = {}) {
    this.path = path; this.providers = {}; this._load();
  }
  _load() { if (existsSync(this.path)) { try { this.providers = JSON.parse(readFileSync(this.path, "utf8")); } catch { this.providers = {}; } } }
  _save() { try { writeFileSync(this.path, JSON.stringify(this.providers, null, 2)); } catch {} }

  register({ publicKeyHex, payoutAddress, modelId, pricePerKTokenUsdt, endpoint = null, stakeUsdt = 0 }) {
    if (!publicKeyHex || !payoutAddress || !modelId) throw new Error("register needs publicKeyHex, payoutAddress, modelId");
    const prev = this.providers[publicKeyHex] || { served: 0, failed: 0, paidUsdt: 0 };
    this.providers[publicKeyHex] = {
      publicKeyHex, payoutAddress, modelId,
      pricePerKTokenUsdt: Number(pricePerKTokenUsdt),
      endpoint: endpoint || publicKeyHex,           // DHT provider key for delegated inference
      stakeUsdt: Number(stakeUsdt),
      served: prev.served, failed: prev.failed, paidUsdt: prev.paidUsdt,
      registeredAt: prev.registeredAt || Date.now(),
    };
    this._save();
    return this.providers[publicKeyHex];
  }

  rating(p) {
    const total = p.served + p.failed;
    const success = total ? p.served / total : 1;              // trust from track record
    const stakeBoost = Math.min(p.stakeUsdt / 100, 1) * 0.2;    // skin in the game
    return +(success * 0.8 + stakeBoost).toFixed(4);
  }

  // Price-first, but only among providers that clear the rating/stake bar.
  select({ modelId, maxPricePerKTokenUsdt = Infinity, minRating = 0, minStakeUsdt = 0 } = {}) {
    const list = Object.values(this.providers)
      .filter((p) => p.modelId === modelId)
      .filter((p) => p.pricePerKTokenUsdt <= maxPricePerKTokenUsdt)
      .filter((p) => p.stakeUsdt >= minStakeUsdt)
      .map((p) => ({ ...p, rating: this.rating(p) }))
      .filter((p) => p.rating >= minRating)
      .sort((a, b) => (a.pricePerKTokenUsdt - b.pricePerKTokenUsdt) || (b.rating - a.rating));
    return list[0] || null;
  }

  list({ modelId = null } = {}) {
    return Object.values(this.providers)
      .filter((p) => !modelId || p.modelId === modelId)
      .map((p) => ({ ...p, rating: this.rating(p) }))
      .sort((a, b) => b.rating - a.rating);
  }

  recordResult(publicKeyHex, { verified, paidUsdt = 0 }) {
    const p = this.providers[publicKeyHex]; if (!p) return null;
    if (verified) { p.served += 1; p.paidUsdt = +(p.paidUsdt + paidUsdt).toFixed(6); }
    else p.failed += 1;
    this._save();
    return { ...p, rating: this.rating(p) };
  }
}
export default ProviderRegistry;
