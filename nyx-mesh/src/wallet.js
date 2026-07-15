// Nyx wallet — real USD₮ settlement via Tether WDK (@tetherto/wdk-wallet-solana).
// Honest degradation: if module/seed/network is missing it returns a clear
// "settlement unavailable" reason — it NEVER fakes a payment.
//
// Network via NYX_NETWORK=devnet|mainnet (default devnet):
//   devnet  — your free test USD₮ mint (demos/judging)
//   mainnet — REAL Tether USD₮ (Es9vMF…); requires NYX_ALLOW_MAINNET=1 to actually send
// NYX_RPC_URL / NYX_USDT_MINT still override explicitly.
const WDK_MODULE = process.env.WDK_MODULE || "@tetherto/wdk-wallet-solana";
const NETWORK = (process.env.NYX_NETWORK || "devnet").toLowerCase();
const PRESET = {
  devnet:  { rpc: "https://api.devnet.solana.com",       usdt: "5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS" },
  mainnet: { rpc: "https://api.mainnet-beta.solana.com", usdt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
};
const NET = PRESET[NETWORK] || PRESET.devnet;
const RPC_URL = process.env.NYX_RPC_URL || NET.rpc;
const COMMITMENT = process.env.NYX_COMMITMENT || "confirmed";
const USDT_MINT = process.env.NYX_USDT_MINT || NET.usdt;
const USDT_DECIMALS = Number(process.env.NYX_USDT_DECIMALS || 6);
const ACCOUNT_INDEX = Number(process.env.NYX_WALLET_ACCOUNT || 0);
const ALLOW_MAINNET = process.env.NYX_ALLOW_MAINNET === "1" || process.env.NYX_ALLOW_MAINNET === "true";

async function loadWalletManager() {
  try { const mod = await import(WDK_MODULE); return mod.default || mod.WalletManagerSolana || mod.WalletManager || null; }
  catch { return null; }
}
export class NyxWallet {
  constructor(opts = {}) {
    this.network = opts.network || NETWORK;
    this.rpcUrl = opts.rpcUrl || RPC_URL;
    this.commitment = opts.commitment || COMMITMENT;
    this.mint = opts.mint || USDT_MINT;
    this.decimals = opts.decimals != null ? opts.decimals : USDT_DECIMALS;
    this.index = opts.accountIndex != null ? opts.accountIndex : ACCOUNT_INDEX;
    this.allowMainnet = opts.allowMainnet != null ? opts.allowMainnet : ALLOW_MAINNET;
    this._wallet = null; this._account = null;
    this.address = null; this.ready = false; this.reason = null;
  }
  _state() { return { ready: this.ready, address: this.address, reason: this.reason, network: this.network }; }
  async init(seedPhrase) {
    const seed = seedPhrase || process.env.NYX_WALLET_SEED;
    if (!seed) { this.reason = "settlement unavailable: set NYX_WALLET_SEED (BIP-39 phrase) to enable USD\u20ae payouts"; return this._state(); }
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
    if (this.network === "mainnet" && !this.allowMainnet) {
      return { ok: false, settled: false, reason: "mainnet payout blocked: set NYX_ALLOW_MAINNET=1 to send REAL USD\u20ae (safety guard)" };
    }
    const params = { token: this.mint, recipient: to, amount: this.toBaseUnits(amount) };
    try {
      await this._account.quoteTransfer(params).catch(() => null);
      const result = await this._account.transfer(params);
      return { ok: true, settled: true, network: this.network, hash: result.hash, fee: result.fee != null ? String(result.fee) : null, amount, memo: memo || null };
    } catch (e) { return { ok: false, settled: false, reason: "transfer failed: " + e.message }; }
  }
  async dispose() { try { if (this._wallet && this._wallet.dispose) this._wallet.dispose(); } catch {} this.ready = false; }
}
export default NyxWallet;
