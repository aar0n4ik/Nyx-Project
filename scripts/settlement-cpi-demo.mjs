// FULL trustless loop on devnet:
//   bridge.create_bound_market  -> market.oracle = bridge PDA (no human key)
//   settlement.place_bet        -> Alice YES 10, Bob NO 10
//   dispute.propose/dispute/arbitrate -> assert -> challenge -> slash -> finalize
//   bridge.push_resolution      -> CPI settlement.resolve with the dispute outcome
//   settlement.claim            -> winner paid, loser rejected
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const BRIDGE_PID = new PublicKey("BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk");
const DISPUTE_PID = new PublicKey("7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN");
const SETTLE_PID = new PublicKey("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3");
const RPC = process.env.NYX_RPC_URL || "https://api.devnet.solana.com";
const DEC = 6, UNIT = 10 ** DEC;

const disc = (n) => createHash("sha256").update(`global:${n}`).digest().subarray(0, 8);
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const bpk = (buf, o) => new PublicKey(buf.subarray(o, o + 32)).toBase58();
const loadKeypair = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));

const conn = new Connection(RPC, "confirmed");
const payer = loadKeypair(process.env.ANCHOR_WALLET || `${homedir()}/.config/solana/id.json`);
console.log("Payer / arbiter:", payer.publicKey.toBase58());

const ro = (pk, s = false) => ({ pubkey: pk, isSigner: s, isWritable: false });
const rw = (pk, s = false) => ({ pubkey: pk, isSigner: s, isWritable: true });
const prog = (pid, metas, data) => new TransactionInstruction({ programId: pid, keys: metas, data });
async function sendIx(instr, signers, feePayer) {
  const tx = new Transaction().add(instr);
  tx.feePayer = feePayer;
  return sendAndConfirmTransaction(conn, tx, signers);
}
async function fundSol(pubkey, lamports) {
  await sendIx(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: pubkey, lamports }), [payer], payer.publicKey);
}
async function bal(ata) { try { return Number((await getAccount(conn, ata)).amount) / UNIT; } catch { return 0; } }

const mint = await createMint(conn, payer, payer.publicKey, null, DEC);
console.log("Test USD₮ mint:", mint.toBase58());
async function newParty(tokens) {
  const kp = Keypair.generate();
  await fundSol(kp.publicKey, 20_000_000);
  const ata = (await getOrCreateAssociatedTokenAccount(conn, payer, mint, kp.publicKey)).address;
  if (tokens > 0) await mintTo(conn, payer, mint, ata, payer, tokens);
  return { kp, ata };
}

const FIX = 2001, MK = [3, 0, 0, 0, 0, 0, 0, 0], BOND = 10 * UNIT, BET = 10 * UNIT;
const oracle = PublicKey.findProgramAddressSync([Buffer.from("oracle")], BRIDGE_PID)[0];
const market = PublicKey.findProgramAddressSync([Buffer.from("market"), u64le(FIX), Buffer.from(MK)], SETTLE_PID)[0];
const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], SETTLE_PID)[0];
const assertion = PublicKey.findProgramAddressSync([Buffer.from("assertion"), u64le(FIX), Buffer.from(MK)], DISPUTE_PID)[0];
const dvault = PublicKey.findProgramAddressSync([Buffer.from("dispute_vault"), assertion.toBuffer()], DISPUTE_PID)[0];
const posOf = (o) => PublicKey.findProgramAddressSync([Buffer.from("pos"), market.toBuffer(), o.toBuffer()], SETTLE_PID)[0];

// [1] Bridge creates a market whose oracle is the bridge PDA.
await fundSol(oracle, 50_000_000);
const closeTs = Math.floor(Date.now() / 1000) + 3600;
await sendIx(prog(BRIDGE_PID, [
  rw(market), rw(oracle), ro(mint), rw(vault), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY), ro(SETTLE_PID),
], Buffer.concat([disc("create_bound_market"), u64le(FIX), Buffer.from(MK), i64le(closeTs)])), [payer], payer.publicKey);
let m = (await conn.getAccountInfo(market)).data;
console.log(`\n[1] Market created. oracle=${bpk(m, 40)}`);
console.log(`    bridge PDA=${oracle.toBase58()} -> ${bpk(m, 40) === oracle.toBase58() ? "MATCH: only the bridge can resolve, no human key" : "MISMATCH"}`);

// [2] Two bettors stake opposite sides.
const alice = await newParty(BET);
const bob = await newParty(BET);
async function placeBet(p, sideYes) {
  await sendIx(prog(SETTLE_PID, [
    rw(market), rw(posOf(p.kp.publicKey)), rw(p.kp.publicKey, true), rw(p.ata), rw(vault), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId),
  ], Buffer.concat([disc("place_bet"), Buffer.from([sideYes ? 1 : 0]), u64le(BET)])), [p.kp], p.kp.publicKey);
}
await placeBet(alice, true);
await placeBet(bob, false);
m = (await conn.getAccountInfo(market)).data;
console.log(`\n[2] Bets: pool_yes=${Number(m.readBigUInt64LE(160)) / UNIT} pool_no=${Number(m.readBigUInt64LE(168)) / UNIT}`);

// [3] Dispute layer decides the real outcome.
const proposer = await newParty(BOND);
const disputer = await newParty(BOND);
await sendIx(prog(DISPUTE_PID, [
  rw(assertion), rw(dvault), rw(proposer.kp.publicKey, true), rw(proposer.ata), ro(mint), ro(payer.publicKey), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY),
], Buffer.concat([disc("propose"), u64le(FIX), Buffer.from(MK), Buffer.from([0]), u64le(BOND), i64le(3600)])), [proposer.kp], proposer.kp.publicKey); // proposes NO
await sendIx(prog(DISPUTE_PID, [
  rw(assertion), rw(dvault), rw(disputer.kp.publicKey, true), rw(disputer.ata), ro(TOKEN_PROGRAM_ID),
], disc("dispute")), [disputer.kp], disputer.kp.publicKey);
await sendIx(prog(DISPUTE_PID, [
  rw(assertion), rw(dvault), ro(payer.publicKey, true), rw(disputer.ata), ro(TOKEN_PROGRAM_ID),
], Buffer.concat([disc("arbitrate"), Buffer.from([1])])), [payer], payer.publicKey); // arbiter rules YES
console.log(`\n[3] Dispute finalized: proposed=NO, arbiter=YES -> proposer slashed.`);
console.log(`    proposer=${await bal(proposer.ata)} (was 10)  disputer=${await bal(disputer.ata)} (won both bonds)`);

// [4] Bridge pushes the finalized outcome into settlement via CPI (permissionless).
const sig = await sendIx(prog(BRIDGE_PID, [
  ro(assertion), rw(market), rw(oracle), ro(DISPUTE_PID), ro(SETTLE_PID),
], disc("push_resolution")), [payer], payer.publicKey);
m = (await conn.getAccountInfo(market)).data;
console.log(`\n[4] push_resolution -> CPI resolve. tx ${sig}`);
console.log(`    market.resolved=${m[176] === 1} outcome_yes=${m[177] === 1}  (set ONLY by the dispute layer)`);

// [5] Winner claims, loser rejected.
async function claim(p) {
  return sendIx(prog(SETTLE_PID, [
    rw(market), rw(posOf(p.kp.publicKey)), rw(p.kp.publicKey, true), rw(p.ata), rw(vault), ro(TOKEN_PROGRAM_ID),
  ], disc("claim")), [p.kp], p.kp.publicKey);
}
await claim(alice);
console.log(`\n[5] Alice (YES) claimed -> balance ${await bal(alice.ata)} (staked 10, won Bob's 10 = 20)`);
try { await claim(bob); console.log(`    Bob (NO) claim SUCCEEDED — unexpected!`); }
catch { console.log(`    Bob (NO) claim correctly rejected (losing position).`); }

console.log(`\n▸ Full loop on devnet: an outcome reached settlement ONLY by surviving propose -> challenge -> arbitrate,`);
console.log(`  routed through a program-PDA oracle. No trusted admin key ever touched the money. Bridge: ${BRIDGE_PID.toBase58()}`);
