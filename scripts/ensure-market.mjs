// Seed an on-chain market so Blinks can route bets through the program.
// Usage: node scripts/ensure-market.mjs <fixtureId> <marketKey> [closeInSeconds]
// Env: SOLANA_RPC, NYX_STABLE_MINT, NYX_SETTLEMENT_PROGRAM_ID, NYX_AUTHORITY_KEYPAIR
import fs from "node:fs"
import { createHash } from "node:crypto"
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com"
const PROGRAM_ID = new PublicKey(process.env.NYX_SETTLEMENT_PROGRAM_ID || "5givnWMR71eqWPEFDfh1mdBuhZUCSpnj3MuHUuKhzoYb")
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS")
const KP_PATH = process.env.NYX_AUTHORITY_KEYPAIR || process.env.ANCHOR_WALLET || (process.env.HOME + "/.config/solana/id.json")

const [, , fixtureArg, marketArg, closeArg] = process.argv
if (!fixtureArg || !marketArg) { console.error("Usage: node scripts/ensure-market.mjs <fixtureId> <marketKey> [closeInSeconds]"); process.exit(1) }

const disc = (n) => createHash("sha256").update("global:" + n).digest().subarray(0, 8)
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }
const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b }
const mk8 = (s) => { const b = Buffer.alloc(8); Buffer.from(s, "utf8").copy(b, 0, 0, 8); return b }

const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KP_PATH, "utf8"))))
const connection = new Connection(RPC, "confirmed")

const fixtureId = fixtureArg
const marketKey = mk8(marketArg)
const closeTs = Math.floor(Date.now() / 1000) + Number(closeArg || 3600)

const [marketPda] = PublicKey.findProgramAddressSync([Buffer.from("market"), u64le(fixtureId), marketKey], PROGRAM_ID)
const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), marketPda.toBuffer()], PROGRAM_ID)

const existing = await connection.getAccountInfo(marketPda)
if (existing) { console.log("Market already exists:", marketPda.toBase58()); process.exit(0) }

const data = Buffer.concat([disc("create_market"), u64le(fixtureId), marketKey, i64le(closeTs)])
const keys = [
  { pubkey: marketPda, isSigner: false, isWritable: true },
  { pubkey: authority.publicKey, isSigner: true, isWritable: true },
  { pubkey: STABLE_MINT, isSigner: false, isWritable: false },
  { pubkey: vaultPda, isSigner: false, isWritable: true },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
]
const tx = new Transaction().add(new TransactionInstruction({ programId: PROGRAM_ID, keys, data }))
const sig = await connection.sendTransaction(tx, [authority])
await connection.confirmTransaction(sig, "confirmed")
console.log("Market created:", marketPda.toBase58())
console.log("Vault:", vaultPda.toBase58())
console.log("tx:", "https://explorer.solana.com/tx/" + sig + "?cluster=devnet")
