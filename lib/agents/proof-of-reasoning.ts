// On-chain Proof-of-Reasoning: tamper-evident, timestamped commitment to the
// agent's decision log. NOT zkML — it proves the log existed at time T and was
// not altered after, so anyone can re-hash the printed CoT and match the chain.
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { createHash } from "crypto"
import fs from "node:fs"

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com")
const CLUSTER = (process.env.NYX_NETWORK || "devnet") === "mainnet" ? "" : "?cluster=devnet"

function loadAgent(): Keypair {
  const raw = process.env.NYX_AGENT_SECRET
    || fs.readFileSync(process.env.NYX_AGENT_KEYPAIR || (process.env.HOME + "/.config/solana/id.json"), "utf8")
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
}

// transcript = the full Chain-of-Thought the agent emitted for THIS decision.
export async function anchorReasoning(transcript: string, meta: Record<string, unknown> = {}) {
  const digest = createHash("sha256").update(transcript, "utf8").digest("hex")
  const agent = loadAgent()
  const connection = new Connection(RPC, "confirmed")
  const memo = JSON.stringify({ p: "nyx-por-v1", digest, ...meta })
  const ix = new TransactionInstruction({
    keys: [{ pubkey: agent.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  })
  const bh = await connection.getLatestBlockhash()
  const tx = new Transaction({ feePayer: agent.publicKey, recentBlockhash: bh.blockhash }).add(ix)
  const sig = await connection.sendTransaction(tx, [agent])
  await connection.confirmTransaction(sig, "confirmed")
  return { digest, sig, url: "https://explorer.solana.com/tx/" + sig + CLUSTER }
}
