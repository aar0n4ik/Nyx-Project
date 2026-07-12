// Nyx wallet — USD₮ settlement via Tether WDK (Wallet Development Kit).
// The WDK package name is configurable (WDK_MODULE) so you can point it at the exact
// package from docs.qvac.tether.io. Falls back to a read-only "unfunded" mode if absent,
// so the agent still runs and simply reports that settlement is unavailable.
const WDK_MODULE = process.env.WDK_MODULE || "@tetherto/wdk";
const ASSET = process.env.NYX_STABLE_SYMBOL || "USDT";
let _wdk = null;
async function loadWdk() {
  if (_wdk !== null) return _wdk;
  try { _wdk = await import(WDK_MODULE); } catch { _wdk = false; }
  return _wdk;
}
export class NyxWallet {
  constructor(opts = {}) { this.network = opts.network || process.env.NYX_WALLET_NETWORK || "solana-devnet"; this.wallet = null; this.ready = false; }
  async init(seedOrKey) {
    const wdk = await loadWdk();
    if (!wdk) return { ready: false, reason: "WDK not installed (set WDK_MODULE to the Tether WDK package)" };
    try {
      const Wallet = wdk.Wallet || wdk.WDK || (wdk.default && (wdk.default.Wallet || wdk.default));
      this.wallet = typeof Wallet === "function"
        ? (seedOrKey ? await Wallet.fromSeed(seedOrKey, { network: this.network }) : await Wallet.create({ network: this.network }))
        : null;
      this.ready = !!this.wallet;
      return { ready: this.ready, address: this.ready ? await this.address() : null, network: this.network };
    } catch (e) { return { ready: false, reason: String(e && e.message || e) }; }
  }
  async address() { if (!this.ready) return null; return (await (this.wallet.getAddress ? this.wallet.getAddress() : this.wallet.address)) || null; }
  async balance() {
    if (!this.ready) return { asset: ASSET, amount: 0, available: false };
    const b = await (this.wallet.getBalance ? this.wallet.getBalance(ASSET) : this.wallet.balance(ASSET));
    return { asset: ASSET, amount: Number(b && b.amount != null ? b.amount : b) || 0, available: true };
  }
  // Real USD₮ transfer for on-chain settlement of a resolved position.
  async settle({ to, amount, memo }) {
    if (!this.ready) return { sent: false, reason: "wallet unavailable" };
    const tx = await this.wallet.send({ asset: ASSET, to, amount, memo });
    return { sent: true, txid: (tx && (tx.txid || tx.signature || tx.hash)) || null, amount, to };
  }
}
export default NyxWallet;
