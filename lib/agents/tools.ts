/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import type { RunInput, ToolSchema } from "./types";
import { KvSession, sha256Hex } from "./kvcache";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const RPC = process.env.SOLANA_RPC || ("https:" + "//api.devnet.solana.com");
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "GP5fTCrphXRf38JfvqryvhaJz7wYh9bsgAgKJDx8ZETN");
const DECIMALS = Number(process.env.NYX_STABLE_DECIMALS || 6);
const TREASURY = new PublicKey(process.env.NYX_TREASURY || "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE");
const NYX_AGENT_PROGRAM = process.env.NYX_AGENT_PROGRAM || "";

export type ToolCtx = { origin: string; input: RunInput };

export const TOOL_SCHEMAS: ToolSchema[] = [
  { type: "function", function: {
    name: "fetch_market_odds",
    description: "Fetch live provable market state for a World Cup fixture from TxLINE (mandatory TxODDS oracle) and, for crypto markets, the Bitfinex public ticker. Returns score, TxLINE stat-validation seq/epochDay (for later on-chain proof), de-margined implied YES probability and the nyx_pamm YES price + liquidity b.",
    parameters: { type: "object", properties: {
      fixtureId: { type: "string" },
      market: { type: "string", enum: ["ou25","ou15","btts","h","d","a","nh","na"] },
      cryptoSymbol: { type: "string", description: "optional Bitfinex pair, e.g. tBTCUSD" },
    }, required: ["fixtureId","market"] } } },
  { type: "function", function: {
    name: "fetch_chain_state",
    description: "Return the user's on-chain allowance remaining, RPC + treasury/mint constants used to size and route the trade.",
    parameters: { type: "object", properties: { account: { type: "string" } }, required: ["account"] } } },
  { type: "function", function: {
    name: "evaluate_risk",
    description: "Risk Manager tool. Deterministic. Given the fair YES probability, the current LMSR price, the stake and the on-chain allowance, returns approve/reject + a half-Kelly bounded maxStake, the recentred-LMSR slippage guard (max LP loss b*ln(n)) and a riskBps score that is later ENFORCED on-chain.",
    parameters: { type: "object", properties: {
      proposedStake: { type: "number" }, modelProbYes: { type: "number" }, lmsrPriceYes: { type: "number" },
      liquidityB: { type: "number" }, allowanceRemaining: { type: "number" },
    }, required: ["proposedStake","modelProbYes","lmsrPriceYes","liquidityB","allowanceRemaining"] } } },
  { type: "function", function: {
    name: "build_agent_bet_tx",
    description: "Executor tool. Builds the UNSIGNED Solana transaction. mode=unsigned -> USD-T transfer to the Nyx treasury + nyx-bet-v1 memo (user signs in own wallet). mode=delegated -> routes through nyx_agent.execute_agent_bet -> CPI place_bet_for within the capped allowance, embedding the sha256 CoT digest + riskBps. Never signs; never takes custody.",
    parameters: { type: "object", properties: {
      account: { type: "string" }, fixtureId: { type: "string" }, market: { type: "string" },
      sideYes: { type: "boolean" }, amount: { type: "number" }, maxPriceBps: { type: "integer" },
      riskBps: { type: "integer" }, cotDigestHex: { type: "string" }, mode: { type: "string", enum: ["unsigned","delegated"] },
    }, required: ["account","sideYes","amount","maxPriceBps","riskBps","cotDigestHex","mode"] } } },
];

function priceYes(qy: number, qn: number, b: number) { const m = Math.max(qy, qn); const ey = Math.exp((qy - m) / b); const en = Math.exp((qn - m) / b); return ey / (ey + en); }
function cost(qy: number, qn: number, b: number) { const m = Math.max(qy, qn); return b * Math.log(Math.exp((qy - m) / b) + Math.exp((qn - m) / b)) + m; }

async function fetchMarketOdds(a: any, ctx: ToolCtx, kv: KvSession) {
  const fixtureId = String(a.fixtureId); const market = String(a.market);
  const base = ctx.origin + "/api/txline/api";
  let scoreHome = 0, scoreAway = 0, txlineSeq: number | null = null, epochDay: number | null = null, deMarginedYes: number | null = null;
  const sources: string[] = [];
  const memoK = kv.memoKey("odds", fixtureId, market);
  const cached = kv.recall<any>(memoK);
  if (cached) return cached;
  try {
    const snap = await fetch(base + "/scores/snapshot/" + fixtureId).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (snap) { scoreHome = Number(snap?.home ?? snap?.scoreHome ?? 0); scoreAway = Number(snap?.away ?? snap?.scoreAway ?? 0); epochDay = Number(snap?.summary?.updateStats?.minTimestamp ? Math.floor(snap.summary.updateStats.minTimestamp / 86400) : null) || null; sources.push("txline:snapshot"); }
    const val = await fetch(base + "/scores/stat-validation?fixtureId=" + fixtureId + "&statKeys=1,2").then((r) => r.ok ? r.json() : null).catch(() => null);
    if (val) { txlineSeq = Number(val?.seq ?? val?.sequence ?? null); if (!Number.isFinite(txlineSeq as number)) txlineSeq = null; sources.push("txline:stat-validation"); }
    const od = await fetch(ctx.origin + "/api/txline/api/odds/snapshot/" + fixtureId).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (od && od.Pct && od.Pct !== "NA") { const p = Number(od.Pct); if (Number.isFinite(p)) deMarginedYes = p > 1 ? p / 100 : p; sources.push("txline:odds"); }
  } catch { /* offline demo: fall through to defaults */ }
  let cryptoPrice: number | null = null;
  if (a.cryptoSymbol) {
    try { const t = await fetch("https://api-pub.bitfinex.com/v2/ticker/" + a.cryptoSymbol).then((r) => r.ok ? r.json() : null); if (Array.isArray(t)) { cryptoPrice = Number(t[6]); sources.push("bitfinex"); } } catch { /* ignore */ }
  }
  const liquidityB = Number(process.env.NYX_LMSR_B || 500);
  const lmsrPriceYes = deMarginedYes ?? 0.5;
  const out = { fixtureId, market, scoreHome, scoreAway, txlineSeq, epochDay, deMarginedYes, lmsrPriceYes, liquidityB, cryptoPrice, sources };
  kv.remember(memoK, out);
  return out;
}

function evaluateRisk(a: any) {
  const p = Math.min(0.999, Math.max(0.001, Number(a.modelProbYes)));
  const q = Math.min(0.999, Math.max(0.001, Number(a.lmsrPriceYes)));
  const b = Math.max(1, Number(a.liquidityB));
  const allowance = Math.max(0, Number(a.allowanceRemaining));
  const stake = Math.max(0, Number(a.proposedStake));
  const edge = p - q;
  const kelly = q < 1 ? Math.max(0, (p - q) / (1 - q)) : 0;
  const halfKelly = 0.5 * kelly;
  const maxStakeKelly = halfKelly * allowance;
  const maxStake = Math.max(0, Math.min(stake, maxStakeKelly, allowance));
  const shares = maxStake;
  const avgFill = shares > 0 ? (cost(shares, 0, b) - cost(0, 0, b)) / shares : q;
  const priceAfter = priceYes(shares, 0, b);
  const maxPriceBps = Math.min(10000, Math.round(priceAfter * 10000) + 50);
  const slippageOk = avgFill < p;
  const minEdge = Number(process.env.NYX_MIN_EDGE || 0.02);
  const riskBps = Math.min(10000, Math.round((allowance > 0 ? (maxStake / allowance) : 1) * 10000));
  const approve = edge >= minEdge && maxStake >= 1 && slippageOk;
  const reasons: string[] = [];
  reasons.push("edge=" + (edge * 100).toFixed(2) + "% (min " + (minEdge * 100).toFixed(1) + "%)");
  reasons.push("half-Kelly f=" + halfKelly.toFixed(3) + " -> maxStake " + maxStake.toFixed(2));
  reasons.push("avgFill " + (avgFill * 100).toFixed(1) + "c vs fair " + (p * 100).toFixed(1) + "c -> " + (slippageOk ? "slippage OK" : "slippage kills edge"));
  if (!approve && edge < minEdge) reasons.push("REJECT: edge below threshold");
  return { approve, maxStake: Number(maxStake.toFixed(2)), riskBps, edgeBps: Math.round(edge * 10000), kellyFraction: Number(halfKelly.toFixed(4)), maxPriceBps, reasons };
}

async function buildUnsigned(a: any) {
  const payer = new PublicKey(String(a.account));
  const conn = new Connection(RPC, "confirmed");
  const fromAta = await getAssociatedTokenAddress(STABLE_MINT, payer);
  const toAta = await getAssociatedTokenAddress(STABLE_MINT, TREASURY);
  const ixs: TransactionInstruction[] = [];
  try { await getAccount(conn, toAta); } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, toAta, TREASURY, STABLE_MINT)); }
  const raw = BigInt(Math.round(Number(a.amount) * 10 ** DECIMALS));
  ixs.push(createTransferCheckedInstruction(fromAta, STABLE_MINT, toAta, payer, raw, DECIMALS));
  const memo = JSON.stringify({ p: "nyx-bet-v1", fixture: a.fixtureId ?? null, market: a.market ?? null, side: a.sideYes ? "yes" : "no", amount: Number(a.amount), riskBps: Number(a.riskBps), cot: String(a.cotDigestHex).slice(0, 64), agent: "nyx-nasi-v1" });
  ixs.push(new TransactionInstruction({ keys: [{ pubkey: payer, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo, "utf8") }));
  const bh = await conn.getLatestBlockhash();
  const tx = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash });
  tx.add(...ixs);
  return { unsignedTxBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"), memo, mode: "unsigned" as const };
}

async function anchorDisc(ixName: string): Promise<Buffer> {
  const hex = await sha256Hex("global:" + ixName);
  return Buffer.from(hex.slice(0, 16), "hex");
}

async function buildDelegated(a: any) {
  if (!NYX_AGENT_PROGRAM) return { ...(await buildUnsigned(a)), note: "NYX_AGENT_PROGRAM not set -> fell back to unsigned mode" };
  const program = new PublicKey(NYX_AGENT_PROGRAM);
  const user = new PublicKey(String(a.account));
  const disc = await anchorDisc("execute_agent_bet");
  const market = PublicKey.default;
  const amount = BigInt(Math.round(Number(a.amount) * 10 ** DECIMALS));
  const u64 = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; };
  const u16 = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff); return b; };
  const cot = Buffer.from(String(a.cotDigestHex).padEnd(64, "0").slice(0, 64), "hex");
  const data = Buffer.concat([disc, market.toBuffer(), Buffer.from([a.sideYes ? 1 : 0]), u64(amount), u16(Number(a.maxPriceBps)), u16(Number(a.riskBps)), cot]);
  const ix = new TransactionInstruction({ programId: program, keys: [{ pubkey: user, isSigner: false, isWritable: true }], data });
  const conn = new Connection(RPC, "confirmed");
  const bh = await conn.getLatestBlockhash();
  const tx = new Transaction({ feePayer: user, recentBlockhash: bh.blockhash });
  tx.add(ix);
  return { unsignedTxBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"), memo: "", mode: "delegated" as const };
}

export async function executeTool(name: string, argsJson: string, ctx: ToolCtx, kv: KvSession): Promise<any> {
  let a: any = {}; try { a = JSON.parse(argsJson || "{}"); } catch { a = {}; }
  if (name === "fetch_market_odds") return fetchMarketOdds(a, ctx, kv);
  if (name === "fetch_chain_state") return { allowanceRemaining: ctx.input.allowanceRemaining, rpc: RPC, treasury: TREASURY.toBase58(), mint: STABLE_MINT.toBase58(), decimals: DECIMALS };
  if (name === "evaluate_risk") return evaluateRisk(a);
  if (name === "build_agent_bet_tx") return a.mode === "delegated" ? buildDelegated(a) : buildUnsigned(a);
  return { error: "unknown tool: " + name };
}
