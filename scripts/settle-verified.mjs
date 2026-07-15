import anchorPkg from "@coral-xyz/anchor";
const anchor = anchorPkg.default ?? anchorPkg;
const { AnchorProvider, Program, BN, Wallet } = anchor;
import { Connection, PublicKey, Keypair, ComputeBudgetProgram, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

try { for (const l of fs.readFileSync(".env.local","utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g,""); } } catch {}

const ORIGIN = process.env.TXLINE_ORIGIN || "https://txline-dev.txodds.com";
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const TXORACLE = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const NYX = new PublicKey("GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY");
const IDL_URL = "https://raw.githubusercontent.com/txodds/tx-on-chain/main/examples/devnet/idl/txoracle.json";

let jwt = process.env.TXLINE_JWT, apiToken = process.env.TXLINE_API_TOKEN;
if (!apiToken) { console.error("Нет TXLINE_API_TOKEN в .env.local"); process.exit(1); }
const getJwt = async () => (await (await fetch(`${ORIGIN}/auth/guest/start`,{method:"POST"})).json()).token;
async function api(q, retry=true){
  const r = await fetch(`${ORIGIN}/api${q}`,{headers:{Authorization:`Bearer ${jwt}`,"X-Api-Token":apiToken}});
  if (r.status===401 && retry){ jwt = await getJwt(); return api(q,false); }
  const t = await r.text(); if(!r.ok) throw new Error(`${r.status} ${q}: ${t.slice(0,200)}`);
  return t? JSON.parse(t): null;
}

const idl = await (await fetch(IDL_URL)).json();
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(),".config/solana/id.json"),"utf8"))));
const conn = new Connection(RPC,"confirmed");
const provider = new AnchorProvider(conn, new Wallet(kp), {commitment:"confirmed"});
anchor.setProvider(provider);
const program = new Program(idl, provider);

const to32 = v => { let b = Array.isArray(v)?Uint8Array.from(v): v instanceof Uint8Array? v: v.startsWith("0x")?Buffer.from(v.slice(2),"hex"):Buffer.from(v,"base64");
  if(b.length!==32) throw new Error(`ждём 32 байта, получили ${b.length}`); return Array.from(b); };
const pn = ns => ns.map(n=>({hash:to32(n.hash), isRightSibling:n.isRightSibling}));

const fixtureId = Number(process.env.FIXTURE_ID || 18175981);
const seq = Number(process.env.SEQ || 991);
const statKeys = process.env.STAT_KEYS || "1,2,3001";
const val = await api(`/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${statKeys}`);

const ts = val.summary.updateStats.minTimestamp, epochDay = Math.floor(ts/86400000);
const [pda] = PublicKey.findProgramAddressSync([Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer,"le",2)], TXORACLE);

const payload = { ts:new BN(ts),
  fixtureSummary:{ fixtureId:new BN(val.summary.fixtureId), updateStats:{ updateCount:val.summary.updateStats.updateCount,
    minTimestamp:new BN(val.summary.updateStats.minTimestamp), maxTimestamp:new BN(val.summary.updateStats.maxTimestamp) },
    eventsSubTreeRoot:to32(val.summary.eventStatsSubTreeRoot) },
  fixtureProof:pn(val.subTreeProof), mainTreeProof:pn(val.mainTreeProof), eventStatRoot:to32(val.eventStatRoot),
  stats:val.statsToProve.map((stat,i)=>({stat, statProof:pn(val.statProofs[i])})) };
const strategy = { geometricTargets:[], distancePredicate:null,
  discretePredicates:statKeys.split(",").map((_,i)=>({ single:{ index:i, predicate:{ threshold:0, comparison:{ greaterThan:{} } } } })) };

// 1) кодируем РОВНО ту же validate_stat_v2 -> это cpi_data
const vIx = await program.methods.validateStatV2(payload, strategy).accounts({ dailyScoresMerkleRoots: pda }).instruction();
const cpiData = vIx.data;
console.log("cpi_data байт:", cpiData.length);

// 2) наша инструкция settle_verified(cpi_data)
const disc = n => createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
const u32le = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n>>>0); return b; };
const data = Buffer.concat([disc("settle_verified"), u32le(cpiData.length), cpiData]);
const [recordPda] = PublicKey.findProgramAddressSync([Buffer.from("settle_rec")], NYX);

const ix = new TransactionInstruction({ programId: NYX, data, keys:[
  { pubkey: recordPda, isSigner:false, isWritable:true },
  { pubkey: pda, isSigner:false, isWritable:false },
  { pubkey: TXORACLE, isSigner:false, isWritable:false },
  { pubkey: kp.publicKey, isSigner:true, isWritable:true },
  { pubkey: SystemProgram.programId, isSigner:false, isWritable:false },
]});

const tx = new Transaction().add(ComputeBudgetProgram.setComputeUnitLimit({units:1_400_000}), ix);
const sig = await sendAndConfirmTransaction(conn, tx, [kp], {commitment:"confirmed"});
console.log("settle_verified TX:", sig);

// 3) читаем SettlementRecord
const acc = await conn.getAccountInfo(recordPda);
const b = acc.data;
const verified = b[8]===1, outcome = b[9]===1, slot = b.readBigUInt64LE(10);
console.log(`ЗАПИСЬ: verified=${verified} outcome=${outcome} slot=${slot}`);
fs.writeFileSync("public/settle-verified-trace.json", JSON.stringify({
  nyxProgram:NYX.toBase58(), txoracle:TXORACLE.toBase58(), record:recordPda.toBase58(),
  dailyScoresMerkleRoots:pda.toBase58(), fixtureId, seq, statKeys, epochDay,
  cpiDataLen:cpiData.length, tx:sig, verified, outcome, slot:Number(slot), settledAt:new Date().toISOString()
}, null, 2));
console.log("WROTE public/settle-verified-trace.json — расчёт прошёл через реальный он-чейн CPI в TxLINE.");
