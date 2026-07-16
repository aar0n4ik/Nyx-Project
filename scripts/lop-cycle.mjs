import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, TransactionInstruction, sendAndConfirmTransaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const NYX_URL = process.env.NYX_URL || "http://localhost:3000/api/txline";
const conn = new Connection(RPC, "confirmed");

const disc = (name) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const bool = (v) => Buffer.from([v ? 1 : 0]);
const ex = (s) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;
const exAddr = (a) => `https://explorer.solana.com/address/${a}?cluster=devnet`;

function loadWallet() {
  const path = process.env.WALLET || `${os.homedir()}/.config/solana/id.json`;
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}

async function send(ix, signers, label) {
  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), signers, { commitment: "confirmed" });
  console.log(`  \u2714 ${label}\n     ${ex(sig)}`);
  return sig;
}

async function resolveProbBps(minuteHint) {
  if (process.env.PROB_BPS) return Math.max(0, Math.min(10000, Number(process.env.PROB_BPS)));
  try {
    const j = await (await fetch(NYX_URL)).json();
    const cand = j?.probability ?? j?.prob ?? j?.yesProb ?? j?.homeWinProb ?? j?.homeProb ?? j?.p ?? j?.data?.probability ?? j?.result?.probability;
    let v = Number(cand);
    if (Number.isFinite(v)) {
      if (v > 0 && v <= 1) v *= 10000;
      else if (v > 1 && v <= 100) v *= 100;
      return Math.round(Math.max(0, Math.min(10000, v)));
    }
    console.log(`  ! No probability in TxLINE response: ${JSON.stringify(j).slice(0,180)}`);
  } catch (e) {
    console.log(`  ! TxLINE unavailable (${NYX_URL}): ${e.message}`);
  }
  const sim = { 20: 5200, 60: 6100, 85: 7400 }[minuteHint] ?? 5000;
  console.log(`  \u2192 fallback PROB_BPS=${sim} (run Next / set NYX_URL or PROB_BPS for live TxLINE)`);
  return sim;
}

function decodeMarket(buf) {
  let o = 8;
  const pk = () => { const p = new PublicKey(buf.subarray(o, o+32)); o += 32; return p.toBase58(); };
  const r16 = () => { const v = buf.readUInt16LE(o); o += 2; return v; };
  const rb = () => { const v = buf[o] === 1; o += 1; return v; };
  const ri64 = () => { const v = buf.readBigInt64LE(o); o += 8; return v; };
  return { authority: pk(), oracle: pk(), oracle_prob_bps: r16(), time_fraction_bps: r16(), market_price_bps: r16(), kappa_bps: r16(), decided: rb(), terminal_yes: rb(), cum_funding_bps: ri64().toString() };
}
async function showMarket(pk) {
  const m = decodeMarket((await conn.getAccountInfo(pk)).data);
  console.log(`     price=${(m.market_price_bps/100).toFixed(2)}%  oracle=${(m.oracle_prob_bps/100).toFixed(2)}%  cumFunding=${m.cum_funding_bps}bps  decided=${m.decided} yes=${m.terminal_yes}`);
}

async function main() {
  const wallet = loadWallet();
  const oracle = wallet;               // MVP: wallet = oracle = authority
  const market = Keypair.generate();
  console.log(`RPC: ${RPC}\nWallet/Oracle: ${wallet.publicKey.toBase58()}\nMarket: ${exAddr(market.publicKey.toBase58())}\n`);

  console.log("STEP 1 — initialize_market (start 50%)");
  await send(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: market.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("initialize_market"), oracle.publicKey.toBuffer(), u16(1500), u16(5000)]),
  }), [wallet, market], "market initialized");
  await showMarket(market.publicKey);

  const pushOracle = (probBps, timeBps, label) => send(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: market.publicKey, isSigner: false, isWritable: true },
      { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([disc("push_oracle"), u16(probBps), u16(timeBps)]),
  }), [oracle], label);

  const applyFunding = async (label) => {
    await send(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [{ pubkey: market.publicKey, isSigner: false, isWritable: true }],
      data: disc("apply_funding"),
    }), [wallet], label);
    await showMarket(market.publicKey);
  };

  for (const [min, timeBps] of [[20, 2222], [60, 6666], [85, 9444]]) {
    console.log(`\nSTEP — TxLINE @${min}' + funding`);
    await pushOracle(await resolveProbBps(min), timeBps, `oracle @${min}'`);
    await applyFunding(`funding tick @${min}'`);
  }

  console.log("\nSTEP — settle(YES) + final funding tick (= SETTLEMENT)");
  await send(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: market.publicKey, isSigner: false, isWritable: true },
      { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([disc("settle"), bool(true)]),
  }), [oracle], "match decided: YES");
  await applyFunding("SETTLEMENT tick (price \u2192 100%)");

  console.log(`\n\u2705 Full cycle on devnet. Market: ${exAddr(market.publicKey.toBase58())}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
