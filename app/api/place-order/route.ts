import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token"

/*
 * POST /api/place-order - Nyx non-custodial order API.
 * Builds a REAL, UNSIGNED USD-T bet transaction (SPL transferChecked to the Nyx
 * treasury + on-chain memo, plus an optional zero-CAC affiliate split) and returns
 * it base64-encoded. The caller signs it in their OWN wallet: the server never holds
 * keys and never signs. Same non-custodial rail as the /api/actions/bet Blink,
 * exposed as a plain JSON API for the Nyx trading widget and the Nyx SDK.
 * Memo protocol is nyx-bet-v1, so the Nyx settlement program settles these orders
 * against verified TxLINE final scores exactly like Blink-placed bets.
 *
 * This replaces the legacy CryptoWay Bybit CEX order route: a centralized, custodial,
 * key-holding endpoint has no place in a zero-custody on-chain settlement product.
 */
export const runtime = "nodejs"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
}
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com")
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "GP5fTCrphXRf38JfvqryvhaJz7wYh9bsgAgKJDx8ZETN")
const STABLE_DECIMALS = Number(process.env.NYX_STABLE_DECIMALS || 6)
const TREASURY = new PublicKey(process.env.NYX_TREASURY || "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE")
const REF_BPS_DEFAULT = Number(process.env.NYX_REF_BPS || 500)
const USDT = "USD\u20AE"

const MATCHES: Record<string, string> = { "88008802": "Spain vs Saudi Arabia", "17588302": "Ecuador vs Germany", "17588389": "Argentina vs Austria", "17926647": "France vs Iraq", "17588390": "Belgium vs Iran", "17588303": "Switzerland vs Canada" }
const MARKETS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams to score", h: "Home win", d: "Draw", a: "Away win", nh: "Next goal: Home", na: "Next goal: Away" }
const OPPOSITE: Record<string, string> = { ou25: "Under 2.5 goals", ou15: "Under 1.5 goals", btts: "At least one team fails to score", h: "Home does NOT win", d: "Not a draw", a: "Away does NOT win", nh: "Next goal: NOT Home", na: "Next goal: NOT Away" }
const matchLabel = (m?: string | null) => (m && MATCHES[m]) || "World Cup match"
const selectionLabel = (market?: string | null, lay?: boolean) => !market ? "selected market" : lay ? (OPPOSITE[market] || ("NOT " + (MARKETS[market] || market))) : (MARKETS[market] || market)

export async function OPTIONS() { return new Response(null, { headers: CORS }) }

export async function GET() {
  return new Response(JSON.stringify({
    service: "nyx-order-api",
    custody: "none - returns an unsigned transaction; the caller signs in their own wallet",
    method: "POST",
    body: { account: "<base58 pubkey, required>", match: "<fixture id>", market: "ou25|ou15|btts|h|d|a|nh|na", side: "back|lay", amount: "<USD-T, >=1>", odds: "<optional>", ref: "<optional affiliate pubkey>", refBps: "<optional 0-2000>" },
    settledBy: "Nyx settlement program vs verified TxLINE final scores",
  }), { headers: CORS })
}

export async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) as { account?: string; match?: string; market?: string; side?: string; amount?: number | string; odds?: string | number; ref?: string; refBps?: number | string }
    if (!b.account) return new Response(JSON.stringify({ error: "Missing 'account' (payer wallet pubkey)" }), { status: 400, headers: CORS })
    let payer: PublicKey
    try { payer = new PublicKey(b.account) } catch { return new Response(JSON.stringify({ error: "Invalid 'account' pubkey" }), { status: 400, headers: CORS }) }

    const match = b.match ?? null
    const market = b.market ?? null
    const side = String(b.side || "back").toLowerCase()
    const lay = side === "lay" || side === "other"
    const odds = String(b.odds ?? "2.00")
    const amount = Math.max(1, Number(b.amount || 5))
    if (!isFinite(amount)) return new Response(JSON.stringify({ error: "Invalid 'amount'" }), { status: 400, headers: CORS })
    const ref = b.ref || null
    const refBps = Math.min(2000, Math.max(0, Number(b.refBps ?? REF_BPS_DEFAULT)))

    const connection = new Connection(RPC, "confirmed")
    const fromAta = await getAssociatedTokenAddress(STABLE_MINT, payer)
    const toAta = await getAssociatedTokenAddress(STABLE_MINT, TREASURY)
    const ixs: TransactionInstruction[] = []
    try { await getAccount(connection, toAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, toAta, TREASURY, STABLE_MINT)) }

    const raw = BigInt(Math.round(amount * (10 ** STABLE_DECIMALS)))
    // Zero-CAC affiliate revenue split: carved OUT of the stake, never added on top.
    let affiliate: PublicKey | null = null
    try { if (ref) affiliate = new PublicKey(ref) } catch { affiliate = null }
    const affRaw = (affiliate && refBps > 0) ? (raw * BigInt(refBps) / 10000n) : 0n
    if (affiliate && affRaw > 0n && !affiliate.equals(TREASURY)) {
      const affAta = await getAssociatedTokenAddress(STABLE_MINT, affiliate)
      try { await getAccount(connection, affAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, affAta, affiliate, STABLE_MINT)) }
      ixs.push(createTransferCheckedInstruction(fromAta, STABLE_MINT, affAta, payer, affRaw, STABLE_DECIMALS))
    }
    ixs.push(createTransferCheckedInstruction(fromAta, STABLE_MINT, toAta, payer, raw - affRaw, STABLE_DECIMALS))

    const memo = JSON.stringify({ p: "nyx-bet-v1", match, market, odds, amount, side: lay ? "lay" : "back", ref: ref || null, refBps: affRaw > 0n ? refBps : 0 })
    ixs.push(new TransactionInstruction({ keys: [{ pubkey: payer, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo, "utf8") }))

    const bh = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash })
    tx.add(...ixs)
    const transaction = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64")

    const m = matchLabel(match); const k = selectionLabel(market, lay)
    return new Response(JSON.stringify({
      ok: true,
      transaction,
      order: {
        match: m, selection: k, side: lay ? "lay" : "back", odds,
        stake: amount, currency: USDT,
        affiliate: affRaw > 0n ? { wallet: ref, bps: refBps, amount: Number(affRaw) / (10 ** STABLE_DECIMALS) } : null,
        treasury: TREASURY.toBase58(), mint: STABLE_MINT.toBase58(),
      },
      message: "Unsigned Nyx order for " + amount + " " + USDT + " on \"" + k + "\" - " + m + ". Sign it in your own wallet; Nyx never takes custody. Settled on-chain against verified TxLINE final scores.",
    }), { headers: CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Could not build order: " + ((e && e.message) || e) }), { status: 500, headers: CORS })
  }
}
