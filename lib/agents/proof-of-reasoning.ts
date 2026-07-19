// On-chain Proof-of-Reasoning: anchors the agent's ALREADY-computed CoT digest
// (cot.digestHex()) into a Solana Memo tx. Tamper-evident + timestamped:
// anyone can re-hash RunResult.cot and match the on-chain digest. NOT zkML.
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import fs from "node:fs";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com");
const CLUSTER = (process.env.NYX_NETWORK || "devnet") === "mainnet" ? "" : "?cluster=devnet";

function loadAgent(): Keypair {
  const raw = process.env.NYX_AGENT_SECRET
    || fs.readFileSync(process.env.NYX_AGENT_KEYPAIR || (process.env.HOME + "/.config/solana/id.json"), "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

export async function anchorCotDigest(digestHex: string, meta: Record<string, unknown> = {}) {
  const agent = loadAgent();
  const connection = new Connection(RPC, "confirmed");
  const memo = JSON.stringify({ p: "nyx-por-v1", digest: digestHex, ...meta });
  const ix = new TransactionInstruction({
    keys: [{ pubkey: agent.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  });
  const bh = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: agent.publicKey, recentBlockhash: bh.blockhash }).add(ix);
  const sig = await connection.sendTransaction(tx, [agent]);
  await connection.confirmTransaction(sig, "confirmed");
  return { digest: digestHex, sig, url: "https://explorer.solana.com/tx/" + sig + CLUSTER };
}
