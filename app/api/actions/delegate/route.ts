import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token"

/** Nyx - "Delegate to Nyx" Solana Action / Blink.
 *  One tap from X sets a capped, auto-expiring USD-T budget the Nyx agent can bet
 *  FROM on the user's behalf (place_bet_for) without ever taking custody: it can pull
 *  only up to the cap, only until expiry, and every position it opens is owned by the user.
 *  Real devnet tx via the Solana Subscriptions & Allowances program. No mock. */

export const runtime = "nodejs"

const ACTIONS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:devnet",
  "Content-Type": "application/json",
}

const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com")
const ALLOWANCE_PROGRAM = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44")
const MINT = new PublicKey(process.env.NYX_ALLOWANCE_MINT || "5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS")
const DECIMALS = Number(process.env.NYX_STABLE_DECIMALS || 6)
const AGENT = new PublicKey(process.env.NYX_AGENT || "5Ybj5JBMzoEp7UVQV1xWQQ5V7RVgBWarBfBdNuXShKBU")
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

const u8 = (n: number) => Buffer.from([n])
const u64 = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b }
const i64 = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(n); return b }
const key = (pk: PublicKey, s: boolean, w: boolean) => ({ pubkey: pk, isSigner: s, isWritable: w })

function saPda(user: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()], ALLOWANCE_PROGRAM)[0]
}
function delegationPda(sa: PublicKey, user: PublicKey, agent: PublicKey, nonce: bigint) {
  return PublicKey.findProgramAddressSync([Buffer.from("delegation"), sa.toBuffer(), user.toBuffer(), agent.toBuffer(), u64(nonce)], ALLOWANCE_PROGRAM)[0]
}
function initSaIx(user: PublicKey, sa: PublicKey, userAta: PublicKey) {
  return new TransactionInstruction({ programId: ALLOWANCE_PROGRAM, data: u8(0),
    keys: [ key(user, true, true), key(sa, false, true), key(MINT, false, false), key(userAta, false, true), key(SystemProgram.programId, false, false), key(TOKEN_PROGRAM, false, false) ] })
}
function createFixedDelegationIx(user: PublicKey, sa: PublicKey, deleg: PublicKey, nonce: bigint, amount: bigint, expiry: bigint, initId: bigint) {
  const data = Buffer.concat([u8(1), u64(nonce), u64(amount), i64(expiry), i64(initId)])
  return new TransactionInstruction({ programId: ALLOWANCE_PROGRAM, data,
    keys: [ key(user, true, true), key(sa, false, false), key(deleg, false, true), key(AGENT, false, false), key(SystemProgram.programId, false, false) ] })
}

export async function OPTIONS() { return new Response(null, { headers: ACTIONS_CORS }) }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const base = url.origin + "/api/actions/delegate"
  const payload = {
    type: "action",
    icon: url.origin + "/nyx/icon-512.png",
    title: "Delegate to Nyx",
    label: "Let Nyx bet for you",
    description: "Set a capped, auto-expiring USD\u20AE budget the Nyx agent can bet FROM on your behalf. Nyx never takes custody: it can pull only up to your cap, only until it expires, and every position it opens is owned by YOU. Real devnet transaction via Solana Subscriptions & Allowances.",
    links: { actions: [
      { type: "transaction", label: "Delegate 25 USD\u20AE (7d)", href: base + "?amount=25&days=7" },
      { type: "transaction", label: "Delegate 100 USD\u20AE (30d)", href: base + "?amount=100&days=30" },
      { type: "transaction", label: "Delegate", href: base + "?amount={amount}&days={days}", parameters: [
        { name: "amount", label: "Budget cap in USD\u20AE", type: "number", required: true },
        { name: "days", label: "Auto-expire after N days (0 = never)", type: "number", required: false },
      ] },
    ] },
  }
  return new Response(JSON.stringify(payload), { headers: ACTIONS_CORS })
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const amount = Math.max(1, Number(url.searchParams.get("amount") || 25))
    const days = Math.max(0, Number(url.searchParams.get("days") || 0))
    const body = (await req.json().catch(() => ({}))) as { account?: string }
    if (!body.account) return new Response(JSON.stringify({ message: "Missing 'account'" }), { status: 400, headers: ACTIONS_CORS })

    const user = new PublicKey(body.account)
    const connection = new Connection(RPC, "confirmed")
    const sa = saPda(user)
    const userAta = await getAssociatedTokenAddress(MINT, user)
    const ixs: TransactionInstruction[] = []
    let message = ""

    const saInfo = await connection.getAccountInfo(sa)
    if (!saInfo) {
      try { await getAccount(connection, userAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(user, userAta, user, MINT)) }
      ixs.push(initSaIx(user, sa, userAta))
      message = "Nyx budget authority created for your wallet. Tap Delegate once more to set your cap."
    } else {
      const initId = saInfo.data.readBigInt64LE(98)
      const nonce = BigInt(Date.now())
      const raw = BigInt(Math.round(amount * 10 ** DECIMALS))
      const expiry = days > 0 ? BigInt(Math.floor(Date.now() / 1000) + days * 86400) : BigInt(0)
      const deleg = delegationPda(sa, user, AGENT, nonce)
      ixs.push(createFixedDelegationIx(user, sa, deleg, nonce, raw, expiry, initId))
      message = "Delegated " + amount + " USD\u20AE to Nyx" + (days > 0 ? ", auto-expires in " + days + " days." : ".") + " Nyx can bet up to this cap for you and never more."
    }

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: user, recentBlockhash: blockhash })
    tx.add(...ixs)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64")
    return new Response(JSON.stringify({ type: "transaction", transaction: serialized, message }), { headers: ACTIONS_CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ message: "Could not build transaction: " + (e?.message || e) }), { status: 500, headers: ACTIONS_CORS })
  }
}
