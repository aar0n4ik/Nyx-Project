import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token"

/** Nyx — Solana Action / Blink. Builds a REAL USD₮ SPL transfer + on-chain memo tx. No mock.
 *  Modes: default (side=back) backs a selection; side=lay|other = "Take the other side" challenge. */
const ACTIONS_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:devnet",
  "Content-Type": "application/json",
}
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com"
const USDC_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
const STABLE_DECIMALS = Number(process.env.NYX_STABLE_DECIMALS || 6)
const TREASURY = new PublicKey(process.env.NYX_TREASURY || "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE")
const MATCHES: Record<string, string> = { "17588232": "Spain vs Saudi Arabia", "17588302": "Ecuador vs Germany", "17588389": "Argentina vs Austria", "17926647": "France vs Iraq", "17588390": "Belgium vs Iran", "17588303": "Switzerland vs Canada" }
const MARKETS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams to score", h: "Home win", d: "Draw", a: "Away win", nh: "Next goal: Home", na: "Next goal: Away" }
const OPPOSITE: Record<string, string> = { ou25: "Under 2.5 goals", ou15: "Under 1.5 goals", btts: "At least one team fails to score", h: "Home does NOT win", d: "Not a draw", a: "Away does NOT win", nh: "Next goal: NOT Home", na: "Next goal: NOT Away" }
function selectionLabel(market?: string | null, lay?: boolean) {
  if (!market) return "selected market"
  return lay ? (OPPOSITE[market] || `NOT ${MARKETS[market] || market}`) : (MARKETS[market] || market)
}
function matchLabel(match?: string | null) { return (match && MATCHES[match]) || "World Cup match" }
function otherOdds(odds: number) { if (!isFinite(odds) || odds <= 1) return null; return Math.round((1 / (1 - 1 / odds)) * 100) / 100 }

export async function OPTIONS() { return new Response(null, { headers: ACTIONS_CORS }) }

export async function GET(req: Request) {
  const url = new URL(req.url)
  const match = url.searchParams.get("match"); const market = url.searchParams.get("market"); const odds = url.searchParams.get("odds") || "2.00"
  const side = (url.searchParams.get("side") || "back").toLowerCase(); const lay = side === "lay" || side === "other"
  const m = matchLabel(match); const k = selectionLabel(market, lay)
  const shownOdds = lay ? (otherOdds(Number(odds)) ?? odds) : odds
  const base = `${url.origin}/api/actions/bet?match=${match ?? ""}&market=${market ?? ""}&odds=${odds}&side=${lay ? "lay" : "back"}`
  const title = lay ? `Nyx · Take the other side` : `Nyx · ${m}`
  const label = lay ? `Fade it: ${k} @ ${shownOdds}` : `Back ${k} @ ${shownOdds}`
  const description = lay
    ? `Someone backed their pick on ${m}. Take the OTHER side — stake test USD₮ on “${k}”. Settled on-chain against verified TxLINE final scores by the Nyx settlement program. Devnet only.`
    : `Stake test USD₮ on “${k}” for ${m}. Settled on-chain against verified TxLINE final scores by the Nyx settlement program. Devnet only.`
  const payload = {
    type: "action", icon: `${url.origin}/nyx/icon-512.png`, title, label, description,
    links: { actions: [
      { type: "transaction", label: `Stake 5 USD₮`, href: `${base}&amount=5` },
      { type: "transaction", label: `Stake 25 USD₮`, href: `${base}&amount=25` },
      { type: "transaction", label: `Stake 100 USD₮`, href: `${base}&amount=100` },
      { type: "transaction", label: `Stake USD₮`, href: `${base}&amount={amount}`, parameters: [{ name: "amount", label: "Amount in USD₮", type: "number", required: true }] },
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
    const body = (await req.json().catch(() => ({}))) as { account?: string }
    if (!body.account) return new Response(JSON.stringify({ message: "Missing 'account'" }), { status: 400, headers: ACTIONS_CORS })
    const payer = new PublicKey(body.account); const connection = new Connection(RPC, "confirmed")
    const fromAta = await getAssociatedTokenAddress(USDC_MINT, payer); const toAta = await getAssociatedTokenAddress(USDC_MINT, TREASURY)
    const ixs: TransactionInstruction[] = []
    try { await getAccount(connection, toAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, toAta, TREASURY, USDC_MINT)) }
    const raw = BigInt(Math.round(amount * 10 ** STABLE_DECIMALS))
    ixs.push(createTransferCheckedInstruction(fromAta, USDC_MINT, toAta, payer, raw, STABLE_DECIMALS))
    const memo = JSON.stringify({ p: "nyx-bet-v1", match, market, odds, amount, side: lay ? "lay" : "back" })
    ixs.push(new TransactionInstruction({ keys: [{ pubkey: payer, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo, "utf8") }))
    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: payer, recentBlockhash: blockhash }); tx.add(...ixs)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64")
    const m = matchLabel(match); const k = selectionLabel(market, lay)
    return new Response(JSON.stringify({ type: "transaction", transaction: serialized, message: `Staking ${amount} test USD₮ on “${k}” — ${m}. Nyx settles this against verified TxLINE final scores.` }), { headers: ACTIONS_CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ message: `Could not build transaction: ${e?.message || e}` }), { status: 500, headers: ACTIONS_CORS })
  }
}
