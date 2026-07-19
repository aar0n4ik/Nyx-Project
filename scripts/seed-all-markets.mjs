// Batch-seed every market the Blink can expose, so bets route through the program.
// Usage: node scripts/seed-all-markets.mjs [closeInSeconds] [marketFilter]
//   closeInSeconds : how long markets stay open for betting (default 86400 = 24h)
//   marketFilter   : comma list to limit markets, e.g. "ou25,btts,h,d,a" (default: all)
// Env: SOLANA_RPC, NYX_STABLE_MINT, NYX_SETTLEMENT_PROGRAM_ID, NYX_AUTHORITY_KEYPAIR
import fs from "node:fs"
import { createHash } from "node:crypto"
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com"
const PROGRAM_ID = new PublicKey(process.env.NYX_SETTLEMENT_PROGRAM_ID || "5givnWMR71eqWPEFDfh1mdBuhZUCSpnj3MuHUuKhzoYb")
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS")
const KP_PATH = process.env.NYX_AUTHORITY_KEYPAIR || process.env.ANCHOR_WALLET || (process.env.HOME + "/.config/solana/id.json")

// Keep these in sync with app/api/actions/bet/route.ts
const MATCHES = ["17588232", "17588302", "17588389", "17926647", "17588390", "17588303"]
const ALL_MARKETS = ["ou25", "ou15", "btts", "h", "d", "a", "nh", "na"]

const [, , closeArg, filterArg] = process.argv
const closeSecs = Number(closeArg || 86400)
const markets = filterArg ? filterArg.split(",").map(s => s.trim()).filter(Boolean) : ALL_MARKETS

const disc = (n) => createHash("sha256").update("global:" + n).digest().subarray(0, 8)
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }
const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b }
const mk8 = (s) => { const b = Buffer.alloc(8); Buffer.from(s, "utf8").copy(b, 0, 0, 8); return b }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KP_PATH, "utf8"))))
const connection = new Connection(RPC, "confirmed")

async function ensureMarket(fixtureId, marketKeyStr) {
  const marketKey = mk8(marketKeyStr)
  const [marketPda] = PublicKey.findProgramAddressSync([Buffer.from("market"), u64le(fixtureId), marketKey], PROGRAM_ID)
  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), marketPda.toBuffer()], PROGRAM_ID)
  if (await connection.getAccountInfo(marketPda)) return { skipped: true, marketPda }
  const closeTs = Math.floor(Date.now() / 1000) + closeSecs
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
  return { skipped: false, marketPda, sig }
}

console.log("Authority:", authority.publicKey.toBase58())
console.log("Program:  ", PROGRAM_ID.toBase58())
console.log("Seeding", MATCHES.length, "matches x", markets.length, "markets =", MATCHES.length * markets.length, "combos\n")

let created = 0, skipped = 0, failed = 0
for (const fixtureId of MATCHES) {
  for (const mkt of markets) {
    try {
      const r = await ensureMarket(fixtureId, mkt)
      if (r.skipped) { skipped++; console.log("=  skip  ", fixtureId, mkt, r.marketPda.toBase58()) }
      else { created++; console.log("+  new   ", fixtureId, mkt, r.marketPda.toBase58(), "tx:", r.sig) }
      await sleep(400) // gentle on the RPC
    } catch (e) {
      failed++; console.error("!  fail  ", fixtureId, mkt, "-", (e && e.message) || e)
    }
  }
}
console.log("\nDone. created=" + created, "skipped=" + skipped, "failed=" + failed)
if (failed) process.exit(1)
