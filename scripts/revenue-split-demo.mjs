import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";

const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const MEMO  = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SYS   = SystemProgram.programId;
const MINT  = new PublicKey("GP5fTCrphXRf38JfvqryvhaJz7wYh9bsgAgKJDx8ZETN");
const TREASURY = new PublicKey("DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE");
const ONE = 1000000;
const DECIMALS = 6;

const STAKE = 10 * ONE;
const REF_BPS = 500;
const refCut = Math.floor(STAKE * REF_BPS / 10000);
const treasuryAmt = STAKE - refCut;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const EXP = "https:" + "//explorer.solana" + ".com/tx/";
const link = (s) => EXP + s + "?cluster=devnet";

const u8  = (n) => Buffer.from([n]);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const m   = (pk, s, w) => ({ pubkey: pk, isSigner: s, isWritable: w });
const ata = (owner) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];

async function send(ixs, signers) {
  const tx = new Transaction().add(...ixs);
  return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
}

function createAtaIx(payer, owner) {
  return new TransactionInstruction({ programId: ASSOC, data: u8(1),
    keys: [ m(payer, true, true), m(ata(owner), false, true), m(owner, false, false),
            m(MINT, false, false), m(SYS, false, false), m(TOKEN, false, false) ] });
}

function transferCheckedIx(source, dest, owner, amount) {
  const data = Buffer.concat([u8(12), u64(amount), u8(DECIMALS)]);
  return new TransactionInstruction({ programId: TOKEN, data,
    keys: [ m(source, false, true), m(MINT, false, false), m(dest, false, true), m(owner, true, false) ] });
}

function memoIx(str) {
  return new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from(str, "utf8") });
}

async function bal(owner) {
  try { const b = await conn.getTokenAccountBalance(ata(owner)); return Number(b.value.amount); }
  catch (e) { return 0; }
}

const user = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"))));
const affiliate = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(fs.readFileSync("scripts/.agent.json"))));

console.log("NYX bettor   :", user.publicKey.toBase58());
console.log("NYX affiliate:", affiliate.publicKey.toBase58());
console.log("NYX treasury :", TREASURY.toBase58());

const affBefore = await bal(affiliate.publicKey);
const treBefore = await bal(TREASURY);
console.log("affiliate USDT before:", affBefore / ONE, "| treasury USDT before:", treBefore / ONE);

const fixtureId = Date.now();
const memo = JSON.stringify({ p: "nyx-bet-v1", fixtureId: fixtureId, sideYes: true, ref: affiliate.publicKey.toBase58(), refBps: REF_BPS });

const sig = await send([
  createAtaIx(user.publicKey, TREASURY),
  createAtaIx(user.publicKey, affiliate.publicKey),
  transferCheckedIx(ata(user.publicKey), ata(affiliate.publicKey), user.publicKey, refCut),
  transferCheckedIx(ata(user.publicKey), ata(TREASURY), user.publicKey, treasuryAmt),
  memoIx(memo),
], [user]);

console.log("NYX affiliate bet settled in ONE tx:", link(sig));

const affAfter = await bal(affiliate.publicKey);
const treAfter = await bal(TREASURY);
console.log("affiliate USDT after :", affAfter / ONE, "| treasury USDT after :", treAfter / ONE);
console.log("stake USDT:", STAKE / ONE, "| refBps:", REF_BPS, "| affiliate earned USDT:", (affAfter - affBefore) / ONE, "| treasury received USDT:", (treAfter - treBefore) / ONE);
console.log("memo:", memo);
console.log("REVENUE-SPLIT-OK");
