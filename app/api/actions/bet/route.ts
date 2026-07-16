import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token"

// Nyx - Solana Action / Blink. Builds a REAL USD-T SPL transfer + on-chain memo tx. No mock.
// Modes: default (side=back) backs a selection; side=lay|other = "Take the other side" challenge.
// Zero-CAC affiliate: append &ref=<wallet> to the Blink URL and that wallet earns a referral
// cut (default 5%) of every stake placed through the link - carved out of protocol revenue,
// never charged on top of the user's stake (Jupiter-style, composed client-side).

export const runtime = "nodejs"

const ACTIONS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:devnet",
  "Content-Type": "application/json",
}
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com")
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS")
const STABLE_DECIMALS = Number(process.env.NYX_STABLE_DECIMALS || 6)
const TREASURY = new PublicKey(process.env.NYX_TREASURY || "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE")
const REF_BPS_DEFAULT = Number(process.env.NYX_REF_BPS || 500)
const USDT = "USD\u20AE"
const DOT = "\u00b7"

const MATCHES: Record<string, string> = { "17588232": "Spain vs Saudi Arabia", "17588302": "Ecuador vs Germany", "17588389": "Argentina vs Austria", "17926647": "France vs Iraq", "17588390": "Belgium vs Iran", "17588303": "Switzerland vs Canada" }
const MARKETS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams to score", h: "Home win", d: "Draw", a: "Away win", nh: "Next goal: Home", na: "Next goal: Away" }
const OPPOSITE: Record<string, string> = { ou25: "Under 2.5 goals", ou15: "Under 1.5 goals", btts: "At least one team fails to score", h: "Home does NOT win", d: "Not a draw", a: "Away does NOT win", nh: "Next goal: NOT Home", na: "Next goal: NOT Away" }

function selectionLabel(market?: string | null, lay?: boolean) {
  if (!market) return "selected market"
  if (lay) return OPPOSITE[market] || ("NOT " + (MARKETS[market] || market))
  return MARKETS[market] || market
}
function matchLabel(match?: string | null) { return (match && MATCHES[match]) || "World Cup match" }
function otherOdds(odds: number) { if (!isFinite(odds) || odds <= 1) return null; return Math.round((1 / (1 - 1 / odds)) * 100) / 100 }

export async function OPTIONS() { return new Response(null, { headers: ACTIONS_CORS }) }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const match = url.searchParams.get("match"); const market = url.searchParams.get("market"); const odds = url.searchParams.get("odds") || "2.00"
  const side = (url.searchParams.get("side") || "back").toLowerCase(); const lay = side === "lay" || side === "other"
  const ref = url.searchParams.get("ref")
  const m = matchLabel(match); const k = selectionLabel(market, lay)
  const shownOdds = lay ? (otherOdds(Number(odds)) || odds) : odds
  let base = url.origin + "/api/actions/bet?match=" + (match || "") + "&market=" + (market || "") + "&odds=" + odds + "&side=" + (lay ? "lay" : "back")
  if (ref) base = base + "&ref=" + encodeURIComponent(ref)
  const title = lay ? ("Nyx " + DOT + " Take the other side") : ("Nyx " + DOT + " " + m)
  const label = lay ? ("Fade it: " + k + " @ " + shownOdds) : ("Back " + k + " @ " + shownOdds)
  const description = (lay
    ? ("Someone backed their pick on " + m + ". Take the OTHER side - stake test " + USDT + " on \"" + k + "\".")
    : ("Stake test " + USDT + " on \"" + k + "\" for " + m + "."))
    + " Your stake is recorded on-chain now (SPL transfer + memo); the Nyx settlement program settles the market against verified TxLINE final scores and pays winners out. Devnet only."
    + (ref ? " (Referred link - your stake is unchanged.)" : "")
  const mkAmt = (a: string | number) => base + "&amount=" + a
  const payload = {
    type: "action", icon: url.origin + "/nyx/icon-512.png", title, label, description,
    links: { actions: [
      { type: "transaction", label: "Stake 5 " + USDT, href: mkAmt(5) },
      { type: "transaction", label: "Stake 25 " + USDT, href: mkAmt(25) },
      { type: "transaction", label: "Stake 100 " + USDT, href: mkAmt(100) },
      { type: "transaction", label: "Stake " + USDT, href: mkAmt("{amount}"), parameters: [{ name: "amount", label: "Amount in " + USDT, type: "number", required: true }] },
    ] },
  }
  return new Response(JSON.stringify(payload), { headers: ACTIONS_CORS })
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const match = url.searchParams.get("match"); const market = url.searchParams.get("market"); const odds = url.searchParams.get("odds") || "2.00"
    const side = (url.searchParams.get("side") || "back").toLowerCase(); const lay = side === "lay" || side === "other"
    const amount = Math.max(1, Number(url.searchParams.get("amount") || 5))
    const ref = url.searchParams.get("ref")
    const refBps = Math.min(2000, Math.max(0, Number(url.searchParams.get("refBps") || REF_BPS_DEFAULT)))
    const body = (await req.json().catch(() => ({}))) as { account?: string }
    if (!body.account) return new Response(JSON.stringify({ message: "Missing 'account'" }), { status: 400, headers: ACTIONS_CORS })
    const payer = new PublicKey(body.account); const connection = new Connection(RPC, "confirmed")
    const fromAta = await getAssociatedTokenAddress(STABLE_MINT, payer); const toAta = await getAssociatedTokenAddress(STABLE_MINT, TREASURY)
    const ixs: TransactionInstruction[] = []
    try { await getAccount(connection, toAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, toAta, TREASURY, STABLE_MINT)) }
    const raw = BigInt(Math.round(amount * (10 ** STABLE_DECIMALS)))
    // Zero-CAC affiliate revenue split: carve a referral cut out of the stake (never on top of it).
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
    const tx = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash }); tx.add(...ixs)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64")
    const m = matchLabel(match); const k = selectionLabel(market, lay)
    const msg = "Staking " + amount + " test " + USDT + " on \"" + k + "\" - " + m + "." + (affRaw > 0n ? " Referral credited." : "") + " Nyx settles this against verified TxLINE final scores."
    return new Response(JSON.stringify({ type: "transaction", transaction: serialized, message: msg }), { headers: ACTIONS_CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ message: "Could not build transaction: " + ((e && e.message) || e) }), { status: 500, headers: ACTIONS_CORS })
  }
}
