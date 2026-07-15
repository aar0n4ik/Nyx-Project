import { readFileSync } from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";

function loadEnv(p) { const o = {}; try { for (const line of readFileSync(p, "utf8").split("\n")) { const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/); if (m) o[m[1]] = m[2]; } } catch {} for (const k in o) if (!process.env[k]) process.env[k] = o[k]; }
loadEnv(".env.local");

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const LOP = new PublicKey(process.env.LOP_PID || "6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
const ORIGIN = process.env.TXLINE_ORIGIN || "https://txline-dev.txodds.com";
const APITOK = process.env.TXLINE_API_TOKEN;
let JWT = process.env.TXLINE_JWT;
const DIRECT = !process.env.NYX_URL;
const BASE = process.env.NYX_URL || `${ORIGIN}/api`;
const FIXTURE = process.env.FIXTURE_ID || "17588232";
const KAPPA = Number(process.env.KAPPA_BPS || 2000);
const POLL_MS = Number(process.env.POLL_MS || 15000);

const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.WALLET || `${os.homedir()}/.config/solana/id.json`, "utf8"))));
const conn = new Connection(RPC, "confirmed");
const disc = (n) => crypto.createHash("sha256").update(`global:${n}`).digest().subarray(0, 8);
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff); return b; };
const ix = (data, keys) => new TransactionInstruction({ programId: LOP, keys, data });
const send = (insts, signers) => sendAndConfirmTransaction(conn, new Transaction().add(...insts), signers, { commitment: "confirmed" });

async function refreshJwt() { const r = await fetch(`${ORIGIN}/auth/guest/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); JWT = (await r.json()).token; console.log("refreshed jwt", JWT.slice(0, 6)); }
async function getSnap() {
  const url = `${BASE}/scores/snapshot/${FIXTURE}`;
  const h = () => (DIRECT ? { Authorization: `Bearer ${JWT}`, "X-Api-Token": APITOK } : {});
  let r = await fetch(url, { headers: h() });
  if (DIRECT && (r.status === 401 || r.status === 403)) { await refreshJwt(); r = await fetch(url, { headers: h() }); }
  if (!r.ok) throw new Error(`snapshot ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

const poisson = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
function pHomeWin(hg, ag, minute) {
  const left = Math.max(0, 95 - minute) / 90;
  if (left <= 0) return hg > ag ? 1 : hg < ag ? 0 : 0.5;
  const lh = 1.45 * left, la = 1.15 * left; let win = 0; const N = 30000;
  for (let i = 0; i < N; i++) { const fh = hg + poisson(lh), fa = ag + poisson(la); if (fh > fa) win++; else if (fh === fa) win += 0.5; }
  return win / N;
}
const num = (...v) => { for (const x of v) if (x != null && !Number.isNaN(Number(x))) return Number(x); return undefined; };
function parse(res) {
  const arr = Array.isArray(res) ? res : (res?.data ?? res?.scores ?? []);
  if (!arr.length) return null;
  const key = (r) => num(r.Seq, r.seq, r.Ts, r.ts) ?? 0;
  const latest = arr.reduce((a, b) => (key(b) >= key(a) ? b : a));
  const hg = num(latest.Participant1Score, latest.Score1, latest.HomeScore, latest.homeScore, latest.score1) ?? 0;
  const ag = num(latest.Participant2Score, latest.Score2, latest.AwayScore, latest.awayScore, latest.score2) ?? 0;
  const minute = num(latest.Minute, latest.minute, latest.Clock, latest.clock) ?? 0;
  const statusId = num(latest.StatusId, latest.statusId, latest.status) ?? 0;
  const period = num(latest.Period, latest.period) ?? 0;
  const action = latest.Action ?? latest.action ?? "";
  return { hg, ag, minute, statusId, period, action, finalized: action === "game_finalised" || statusId === 100 || period === 100, raw: latest };
}
function decodeMarket(buf) {
  let o = 8; const pk = () => { const p = new PublicKey(buf.subarray(o, o + 32)); o += 32; return p.toBase58(); };
  const u = () => { const v = buf.readUInt16LE(o); o += 2; return v; }; const bl = () => { const v = buf[o] !== 0; o += 1; return v; };
  const authority = pk(), oracle = pk(), oracle_prob_bps = u(), time_fraction_bps = u(), market_price_bps = u(), kappa_bps = u(), decided = bl(), terminal_yes = bl(), cum_funding_bps = buf.readBigInt64LE(o).toString();
  return { authority, oracle, oracle_prob_bps, time_fraction_bps, market_price_bps, kappa_bps, decided, terminal_yes, cum_funding_bps };
}

async function main() {
  console.log(`keeper fixture=${FIXTURE} src=${DIRECT ? "TxLINE-direct " + BASE : BASE}`);
  const market = Keypair.generate();
  const initIx = ix(Buffer.concat([disc("initialize_market"), kp.publicKey.toBuffer(), u16(KAPPA), u16(5000)]), [
    { pubkey: market.publicKey, isSigner: true, isWritable: true },
    { pubkey: kp.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);
  console.log("init market", market.publicKey.toBase58(), "tx", await send([initIx], [kp, market]));
  for (;;) {
    let snap;
    try { snap = parse(await getSnap()); }
    catch (e) { console.error("fetch err", e.message); await new Promise(r => setTimeout(r, POLL_MS)); continue; }
    if (!snap) { console.log("no records yet"); await new Promise(r => setTimeout(r, POLL_MS)); continue; }
    console.log("raw:", JSON.stringify(snap.raw).slice(0, 300));
    const p = pHomeWin(snap.hg, snap.ag, snap.minute);
    const probBps = Math.min(9999, Math.max(1, Math.round(p * 10000)));
    const tfBps = Math.min(10000, Math.max(0, Math.round((snap.minute / 90) * 10000)));
    console.log(`${snap.hg}-${snap.ag} min${snap.minute} pHome=${(p * 100).toFixed(1)}% probBps=${probBps} tf=${tfBps}`);
    const pushIx = ix(Buffer.concat([disc("push_oracle"), u16(probBps), u16(tfBps)]), [
      { pubkey: market.publicKey, isSigner: false, isWritable: true },
      { pubkey: kp.publicKey, isSigner: true, isWritable: false },
    ]);
    const fundIx = ix(disc("apply_funding"), [{ pubkey: market.publicKey, isSigner: false, isWritable: true }]);
    console.log("push+funding tx", await send([pushIx, fundIx], [kp]));
    if (snap.finalized) {
      const yes = snap.hg > snap.ag;
      const settleIx = ix(Buffer.concat([disc("settle"), Buffer.from([yes ? 1 : 0])]), [
        { pubkey: market.publicKey, isSigner: false, isWritable: true },
        { pubkey: kp.publicKey, isSigner: true, isWritable: false },
      ]);
      console.log("SETTLED yes=" + yes, "tx", await send([settleIx], [kp]));
      console.log("final:", decodeMarket((await conn.getAccountInfo(market.publicKey)).data));
      break;
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}
main().catch(e => { console.error("\u274c", e.message || e); process.exit(1); });
