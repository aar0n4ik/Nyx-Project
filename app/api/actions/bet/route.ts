import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { createHash } from "crypto"

// Nyx - Solana Action / Blink. Builds a REAL place_bet / place_bet_with_ref call
// into the nyx_settlement program. The referral split is now ENFORCED ON-CHAIN:
// the program computes the cut, caps it at 5%, and pays the affiliate inside the
// same instruction. The client can no longer choose the split or exceed the cap.

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
// IMPORTANT: this MUST equal the deployed program id (declare_id! in lib.rs).
const PROGRAM_ID = new PublicKey(process.env.NYX_SETTLEMENT_PROGRAM_ID || "5givnWMR71eqWPEFDfh1mdBuhZUCSpnj3MuHUuKhzoYb")
const REF_BPS_DEFAULT = Number(process.env.NYX_REF_BPS || 500)
const REF_BPS_CAP = 500 // mirrors on-chain require!(ref_bps <= 500)
const USDT = "USD\u20AE"
const DOT = "\u00b7"

const MATCHES: Record<string, string> = { "88008801": "Nyx Demo Market", "88008802": "Nyx Demo Market", "17588232": "Spain vs Argentina", "17588302": "England vs France", "17588389": "Spain vs France", "17926647": "Argentina vs England", "17588390": "Argentina vs Switzerland", "17588303": "France vs Morocco" }
const MARKETS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams to score", h: "Home win", d: "Draw", a: "Away win", nh: "Next goal: Home", na: "Next goal: Away" }
const OPPOSITE: Record<string, string> = { ou25: "Under 2.5 goals", ou15: "Under 1.5 goals", btts: "At least one team fails to score", h: "Home does NOT win", d: "Not a draw", a: "Away does NOT win", nh: "Next goal: NOT Home", na: "Next goal: NOT Away" }

function selectionLabel(market?: string | null, lay?: boolean) {
  if (!market) return "selected market"
  if (lay) return OPPOSITE[market] || ("NOT " + (MARKETS[market] || market))
  return MARKETS[market] || market
}
function matchLabel(match?: string | null) { return (match && MATCHES[match]) || "World Cup match" }
function otherOdds(odds: number) { if (!isFinite(odds) || odds <= 1) return null; return Math.round((1 / (1 - 1 / odds)) * 100) / 100 }

// --- Anchor wire helpers (no IDL needed) ---
function disc(name: string) { return createHash("sha256").update("global:" + name).digest().subarray(0, 8) }
function u64le(n: bigint) { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b }
function u16le(n: number) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }
function marketKey8(market: string) { const b = Buffer.alloc(8); Buffer.from(market, "utf8").copy(b, 0, 0, 8); return b }
function pda(seeds: Buffer[]) { return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0] }

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
    + " Your stake goes through the Nyx settlement program (real escrow). Any referral cut is computed and capped at 5% ON-CHAIN. Devnet only."
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
    const match = url.searchParams.get("match"); const market = url.searchParams.get("market")
    const side = (url.searchParams.get("side") || "back").toLowerCase(); const lay = side === "lay" || side === "other"
    const amount = Math.max(1, Number(url.searchParams.get("amount") || 5))
    const ref = url.searchParams.get("ref")
    // Clamp client-side too, but the program is the source of truth: >500 reverts with RefTooHigh.
    const refBps = Math.min(REF_BPS_CAP, Math.max(0, Number(url.searchParams.get("refBps") || REF_BPS_DEFAULT)))
    if (!match || !market) return new Response(JSON.stringify({ message: "Missing 'match' or 'market'" }), { status: 400, headers: ACTIONS_CORS })

    const body = (await req.json().catch(() => ({}))) as { account?: string }
    if (!body.account) return new Response(JSON.stringify({ message: "Missing 'account'" }), { status: 400, headers: ACTIONS_CORS })

    const payer = new PublicKey(body.account)
    const connection = new Connection(RPC, "confirmed")

    const fixtureId = BigInt(match)
    const mk8 = marketKey8(market)
    const marketPda = pda([Buffer.from("market"), u64le(fixtureId), mk8])
    const vaultPda = pda([Buffer.from("vault"), marketPda.toBuffer()])
    const positionPda = pda([Buffer.from("pos"), marketPda.toBuffer(), payer.toBuffer()])

    // The program requires the market to exist (seed it with scripts/ensure-market.mjs).
    try { await getAccount(connection, vaultPda) } catch {
      return new Response(JSON.stringify({ message: "Market not initialized on-chain yet for " + match + "/" + market + ". Seed it with scripts/ensure-market.mjs." }), { status: 409, headers: ACTIONS_CORS })
    }

    const fromAta = await getAssociatedTokenAddress(STABLE_MINT, payer)
    const raw = BigInt(Math.round(amount * (10 ** STABLE_DECIMALS)))
    const sideYes = !lay // back = YES side

    // Resolve affiliate (optional). Self-referral / no-ref -> plain place_bet.
    let affiliate: PublicKey | null = null
    try { if (ref) affiliate = new PublicKey(ref) } catch { affiliate = null }
    const useRef = !!(affiliate && refBps > 0 && !affiliate.equals(payer))

    const ixs: TransactionInstruction[] = []
    let data: Buffer
    let keys

    if (useRef) {
      const affAta = await getAssociatedTokenAddress(STABLE_MINT, affiliate as PublicKey)
      try { await getAccount(connection, affAta) } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, affAta, affiliate as PublicKey, STABLE_MINT)) }
      data = Buffer.concat([disc("place_bet_with_ref"), Buffer.from([sideYes ? 1 : 0]), u64le(raw), u16le(refBps)])
      keys = [
        { pubkey: marketPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: fromAta, isSigner: false, isWritable: true },
        { pubkey: affAta, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]
    } else {
      data = Buffer.concat([disc("place_bet"), Buffer.from([sideYes ? 1 : 0]), u64le(raw)])
      keys = [
        { pubkey: marketPda, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: fromAta, isSigner: false, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]
    }
    ixs.push(new TransactionInstruction({ programId: PROGRAM_ID, keys, data }))

    // Provenance memo (kept for the audit trail the README promises).
    const memo = JSON.stringify({ p: "nyx-bet-v2", match, market, amount, side: lay ? "lay" : "back", ref: useRef ? ref : null, refBps: useRef ? refBps : 0, enforced: "on-chain" })
    ixs.push(new TransactionInstruction({ keys: [{ pubkey: payer, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo, "utf8") }))

    const bh = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash }); tx.add(...ixs)
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64")

    const m = matchLabel(match); const k = selectionLabel(market, lay)
    const msg = "Staking " + amount + " test " + USDT + " on \"" + k + "\" - " + m + "."
      + (useRef ? " Referral (" + (refBps / 100) + "%) is split and capped ON-CHAIN by the program." : "")
      + " Nyx settles this against verified TxLINE final scores."
    return new Response(JSON.stringify({ type: "transaction", transaction: serialized, message: msg }), { headers: ACTIONS_CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ message: "Could not build transaction: " + ((e && e.message) || e) }), { status: 500, headers: ACTIONS_CORS })
  }
}
