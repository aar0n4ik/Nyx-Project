// Nyx wallet — real USD₮ settlement via Tether WDK Solana module (@tetherto/wdk-wallet-solana).
// Honest degradation: if the module, seed, or network is missing, it reports
// "settlement unavailable" with a reason — it NEVER fakes a payment.
const WDK_MODULE = process.env.WDK_MODULE || "@tetherto/wdk-wallet-solana";
const RPC_URL = process.env.NYX_RPC_URL || "https://api.devnet.solana.com";
const COMMITMENT = process.env.NYX_COMMITMENT || "confirmed";
// USD₮ (USDT) SPL mint — devnet test mint by default; override for mainnet.
const USDT_MINT = process.env.NYX_USDT_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const USDT_DECIMALS = Number(process.env.NYX_USDT_DECIMALS || 6);
const ACCOUNT_INDEX = Number(process.env.NYX_WALLET_ACCOUNT || 0);
async function loadWalletManager() {
  try { const mod = await import(WDK_MODULE); return mod.default || mod.WalletManagerSolana || mod.WalletManager || null; }
  catch { return null; }
}
export class NyxWallet {
  constructor(opts = {}) {
    this.rpcUrl = opts.rpcUrl || RPC_URL;
    this.commitment = opts.commitment || COMMITMENT;
    this.mint = opts.mint || USDT_MINT;
    this.decimals = opts.decimals != null ? opts.decimals : USDT_DECIMALS;
    this.index = opts.accountIndex != null ? opts.accountIndex : ACCOUNT_INDEX;
    this._wallet = null; this._account = null;
    this.address = null; this.ready = false; this.reason = null;
  }
  _state() { return { ready: this.ready, address: this.address, reason: this.reason }; }
  async init(seedPhrase) {
    const seed = seedPhrase || process.env.NYX_WALLET_SEED;
    if (!seed) { this.reason = "settlement unavailable: set NYX_WALLET_SEED (BIP-39 phrase) to enable USD₮ payouts"; return this._state(); }
    const Manager = await loadWalletManager();
    if (!Manager) { this.reason = `settlement unavailable: install the WDK wallet module (npm i ${WDK_MODULE})`; return this._state(); }
    try {
      this._wallet = new Manager(seed, { rpcUrl: this.rpcUrl, provider: this.rpcUrl, commitment: this.commitment });
      this._account = await this._wallet.getAccount(this.index);
      this.address = await this._account.getAddress();
      this.ready = true; this.reason = null;
    } catch (e) { this.reason = "settlement unavailable: " + e.message; }
    return this._state();
  }
  toBaseUnits(amount) {
    const [whole, frac = ""] = String(amount).split(".");
    const fracPad = (frac + "0".repeat(this.decimals)).slice(0, this.decimals);
    return BigInt(whole || "0") * (10n ** BigInt(this.decimals)) + BigInt(fracPad || "0");
  }
  async balance() {
    if (!this.ready) return { ready: false, reason: this.reason };
    try { const raw = await this._account.getTokenBalance(this.mint); return { ready: true, usdt: Number(raw) / 10 ** this.decimals, raw: String(raw) }; }
    catch (e) { return { ready: false, reason: e.message }; }
  }
  async settle({ to, amount, memo }) {
    if (!this.ready) return { ok: false, settled: false, reason: this.reason || "settlement unavailable" };
    if (!to) return { ok: false, settled: false, reason: "no recipient address" };
    const params = { token: this.mint, recipient: to, amount: this.toBaseUnits(amount) };
    try {
      await this._account.quoteTransfer(params).catch(() => null);
      const result = await this._account.transfer(params);
      return { ok: true, settled: true, hash: result.hash, fee: result.fee != null ? String(result.fee) : null, amount, memo: memo || null };
    } catch (e) { return { ok: false, settled: false, reason: "transfer failed: " + e.message }; }
  }
  async dispose() { try { if (this._wallet && this._wallet.dispose) this._wallet.dispose(); } catch {} this.ready = false; }
}
export default NyxWallet;
