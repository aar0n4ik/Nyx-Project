// nyx_dispute LIVE on devnet: assert / challenge / slash.
// Talks to the deployed program with hand-built instructions (no IDL needed).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN");
const RPC = process.env.NYX_RPC_URL || "https://api.devnet.solana.com";
const DECIMALS = 6;
const BOND = 10 * 10 ** DECIMALS; // 10 USD₮

const disc = (name) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loadKeypair = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));

const conn = new Connection(RPC, "confirmed");
const payer = loadKeypair(process.env.ANCHOR_WALLET || `${homedir()}/.config/solana/id.json`);
console.log("Payer / arbiter:", payer.publicKey.toBase58());

const mint = await createMint(conn, payer, payer.publicKey, null, DECIMALS);
console.log("Test bond mint:", mint.toBase58());

const ro = (pk, s = false) => ({ pubkey: pk, isSigner: s, isWritable: false });
const rw = (pk, s = false) => ({ pubkey: pk, isSigner: s, isWritable: true });
const ix = (keys, data) => new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

async function send(instrs, signers, feePayer) {
  const tx = new Transaction().add(...instrs);
  tx.feePayer = feePayer;
  return sendAndConfirmTransaction(conn, tx, signers);
}
async function fundSol(pubkey, lamports) {
  await send([SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: pubkey, lamports })], [payer], payer.publicKey);
}
const assertionPda = (fixtureId, marketKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("assertion"), u64le(fixtureId), Buffer.from(marketKey)], PROGRAM_ID)[0];
const vaultPda = (assertion) =>
  PublicKey.findProgramAddressSync([Buffer.from("dispute_vault"), assertion.toBuffer()], PROGRAM_ID)[0];
const balance = async (ata) => Number((await getAccount(conn, ata)).amount) / 10 ** DECIMALS;

async function setupParty(bond) {
  const kp = Keypair.generate();
  await fundSol(kp.publicKey, 20_000_000); // 0.02 SOL for fees + rent
  const ata = await getOrCreateAssociatedTokenAccount(conn, payer, mint, kp.publicKey);
  await mintTo(conn, payer, mint, ata.address, payer, bond);
  return { kp, ata: ata.address };
}

// ---------- Scenario A: disputed -> arbitrated -> slash ----------
console.log("\n=== A: proposer says YES, disputer challenges, arbiter rules NO -> disputer wins ===");
{
  const fixtureId = 1001, marketKey = [1, 0, 0, 0, 0, 0, 0, 0];
  const proposer = await setupParty(BOND);
  const disputer = await setupParty(BOND);
  const assertion = assertionPda(fixtureId, marketKey);
  const vault = vaultPda(assertion);

  const proposeData = Buffer.concat([disc("propose"), u64le(fixtureId), Buffer.from(marketKey), Buffer.from([1]), u64le(BOND), i64le(3600)]);
  await send([ix([
    rw(assertion), rw(vault), rw(proposer.kp.publicKey, true), rw(proposer.ata),
    ro(mint), ro(payer.publicKey), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY),
  ], proposeData)], [proposer.kp], proposer.kp.publicKey);
  console.log(`proposer bonded 10 -> balance ${await balance(proposer.ata)}`);

  await send([ix([
    rw(assertion), rw(vault), rw(disputer.kp.publicKey, true), rw(disputer.ata), ro(TOKEN_PROGRAM_ID),
  ], disc("dispute"))], [disputer.kp], disputer.kp.publicKey);
  console.log(`disputer bonded 10 -> balance ${await balance(disputer.ata)}`);

  const arbData = Buffer.concat([disc("arbitrate"), Buffer.from([0])]); // final=NO, proposed=YES -> disputer wins
  const sig = await send([ix([
    rw(assertion), rw(vault), ro(payer.publicKey, true), rw(disputer.ata), ro(TOKEN_PROGRAM_ID),
  ], arbData)], [payer], payer.publicKey);
  console.log(`arbiter ruled NO -> tx ${sig}`);
  console.log(`FINAL: proposer=${await balance(proposer.ata)} (slashed 10), disputer=${await balance(disputer.ata)} (won both bonds = 20)`);
}

// ---------- Scenario B: undisputed -> auto settle ----------
console.log("\n=== B: proposer says YES, nobody challenges, auto-finalizes after liveness ===");
{
  const fixtureId = 1002, marketKey = [2, 0, 0, 0, 0, 0, 0, 0];
  const proposer = await setupParty(BOND);
  const assertion = assertionPda(fixtureId, marketKey);
  const vault = vaultPda(assertion);

  const proposeData = Buffer.concat([disc("propose"), u64le(fixtureId), Buffer.from(marketKey), Buffer.from([1]), u64le(BOND), i64le(2)]);
  await send([ix([
    rw(assertion), rw(vault), rw(proposer.kp.publicKey, true), rw(proposer.ata),
    ro(mint), ro(payer.publicKey), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY),
  ], proposeData)], [proposer.kp], proposer.kp.publicKey);
  console.log(`proposer bonded 10 -> balance ${await balance(proposer.ata)}; waiting out 2s liveness...`);
  await sleep(4000);

  await send([ix([
    rw(assertion), rw(vault), rw(proposer.kp.publicKey, true), rw(proposer.ata), ro(TOKEN_PROGRAM_ID),
  ], disc("settle_undisputed"))], [proposer.kp], proposer.kp.publicKey);
  console.log(`FINAL: undisputed outcome finalized -> proposer reclaimed bond, balance ${await balance(proposer.ata)}`);
}

console.log("\n▸ Trust-minimized settlement live on devnet. Honest asserters keep their bond; wrong asserters get slashed. Program:", PROGRAM_ID.toBase58());
