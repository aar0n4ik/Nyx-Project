// On-chain anchor for Proof-of-Inference sessions.
// Writes the receipt's ed25519 digest (the cryptographic root binding
// model+prompt+output+price+payout+nonce) into a Solana Memo-program tx, so the
// PoI session is publicly timestamped and tamper-evident on-chain - independent
// of the USD-T payment. Honest degradation: no keypair -> { anchored:false, reason }.
import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const PRESET = { devnet: "https:" + "//api.devnet.solana.com", mainnet: "https:" + "//api.mainnet-beta.solana.com" };

export function poiMemo(receipt) {
  const d = (receipt && receipt.digest) || "";
  const n = (receipt && receipt.body && receipt.body.nonce) || "";
  return "nyx-poi:v1:" + d + ":" + n;
}

export function loadSolanaKeypair(explicitPath) {
  const candidates = [];
  if (explicitPath) candidates.push(explicitPath);
  if (process.env.NYX_ANCHOR_KEYPAIR) candidates.push(process.env.NYX_ANCHOR_KEYPAIR);
  candidates.push(path.join(homedir(), ".config", "solana", "id.json"));
  for (const p of candidates) {
    try { const raw = JSON.parse(readFileSync(p, "utf8")); return Keypair.fromSecretKey(Uint8Array.from(raw)); } catch { /* next */ }
  }
  return null;
}

export class PoIAnchor {
  constructor(opts = {}) {
    this.network = (opts.network || process.env.NYX_NETWORK || "devnet").toLowerCase();
    this.rpcUrl = opts.rpcUrl || process.env.NYX_RPC_URL || PRESET[this.network] || PRESET.devnet;
    this.commitment = opts.commitment || "confirmed";
    this.keypair = opts.keypair || loadSolanaKeypair(opts.keypairPath);
    this.connection = opts.connection || new Connection(this.rpcUrl, this.commitment);
    this.ready = !!this.keypair;
    this.reason = this.ready ? null : "anchor unavailable: no Solana keypair (set NYX_ANCHOR_KEYPAIR or ~/.config/solana/id.json)";
  }
  address() { return this.ready ? this.keypair.publicKey.toBase58() : null; }
  async anchor(receipt) {
    const memo = poiMemo(receipt);
    if (!this.ready) return { anchored: false, reason: this.reason, memo };
    try {
      const ix = new TransactionInstruction({
        keys: [{ pubkey: this.keypair.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf8"),
      });
      const tx = new Transaction().add(ix);
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.keypair], { commitment: this.commitment });
      return { anchored: true, signature, memo, network: this.network, address: this.address() };
    } catch (e) {
      return { anchored: false, reason: "anchor tx failed: " + ((e && e.message) || e), memo };
    }
  }
  async verifyAnchored(signature, receipt) {
    const want = poiMemo(receipt);
    for (let i = 0; i < 5; i++) {
      try {
        const tx = await this.connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
        if (tx) {
          const logs = (tx.meta && tx.meta.logMessages) || [];
          const found = logs.some((l) => l.indexOf(want) !== -1) || (receipt.digest && logs.some((l) => l.indexOf(receipt.digest) !== -1));
          return { ok: !!found, reason: found ? null : "memo/digest not found in tx logs", want };
        }
      } catch (e) { /* retry */ }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return { ok: false, reason: "tx not found after retries", want };
  }
}
export default PoIAnchor;
