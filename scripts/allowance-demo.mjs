import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44");
const TOKEN      = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC      = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS        = SystemProgram.programId;
const MINT       = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const ONE = 1000000;
const CAP = 5 * ONE, DRAW = 2 * ONE;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const EXP = "https:" + "//explorer.solana" + ".com/tx/";
const link = (s) => EXP + s + "?cluster=devnet";

const u8  = (n) => Buffer.from([n]);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const m   = (pk, s, w) => ({ pubkey: pk, isSigner: s, isWritable: w });
const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
const ata = (owner) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];

async function send(ixs, signers) {
  const tx = new Transaction().add(...ixs);
  return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
}
function createAtaIx(payer, owner) {
  return new TransactionInstruction({
    programId: ASSOC, data: u8(1),
    keys: [ m(payer, true, true), m(ata(owner), false, true), m(owner, false, false),
            m(MINT, false, false), m(SYS, false, false), m(TOKEN, false, false) ],
  });
}
function initSaIx(user) {
  const sa = pda([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()]);
  return new TransactionInstruction({ programId: PROGRAM_ID, data: u8(0),
    keys: [ m(user, true, true), m(sa, false, true), m(MINT, false, false),
            m(ata(user), false, true), m(SYS, false, false), m(TOKEN, false, false) ] });
}
async function readInitId(sa) {
  const acc = await conn.getAccountInfo(sa);
  return acc.data.readBigInt64LE(98);
}
function createDelegationIx(user, agent, nonce, amount, expiry, initId) {
  const sa = pda([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()]);
  const deleg = pda([Buffer.from("delegation"), sa.toBuffer(), user.toBuffer(), agent.toBuffer(), u64(nonce)]);
  const data = Buffer.concat([u8(1), u64(nonce), u64(amount), i64(expiry), i64(initId)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, data,
    keys: [ m(user, true, true), m(sa, false, false), m(deleg, false, true),
            m(agent, false, false), m(SYS, false, false) ] });
}
function transferFixedIx(agent, user, nonce, amount, receiver) {
  const sa = pda([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()]);
  const deleg = pda([Buffer.from("delegation"), sa.toBuffer(), user.toBuffer(), agent.toBuffer(), u64(nonce)]);
  const ev = pda([Buffer.from("event_authority")]);
  const data = Buffer.concat([u8(4), u64(amount), user.toBuffer(), MINT.toBuffer()]);
  return new TransactionInstruction({ programId: PROGRAM_ID, data,
    keys: [ m(deleg, false, true), m(sa, false, false), m(ata(user), false, true),
            m(ata(receiver), false, true), m(MINT, false, false), m(TOKEN, false, false),
            m(agent, true, false), m(ev, false, false), m(PROGRAM_ID, false, false) ] });
}
async function usdt(owner) {
  try { const b = await conn.getTokenAccountBalance(ata(owner)); return Number(b.value.amount); }
  catch (e) { return 0; }
}

const user = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"))));
const agentPath = "scripts/.agent.json";
const agent = fs.existsSync(agentPath)
  ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(agentPath))))
  : (() => { const k = Keypair.generate(); fs.writeFileSync(agentPath, JSON.stringify([...k.secretKey])); return k; })();

console.log("NYX user :", user.publicKey.toBase58());
console.log("NYX agent:", agent.publicKey.toBase58());

await send([createAtaIx(user.publicKey, user.publicKey), createAtaIx(user.publicKey, agent.publicKey)], [user]);
if ((await conn.getBalance(agent.publicKey)) < 10000000) {
  await send([SystemProgram.transfer({ fromPubkey: user.publicKey, toPubkey: agent.publicKey, lamports: 20000000 })], [user]);
}

const sa = pda([Buffer.from("SubscriptionAuthority"), user.publicKey.toBuffer(), MINT.toBuffer()]);
try { const s = await send([initSaIx(user.publicKey)], [user]); console.log("NYX initSA:", link(s)); }
catch (e) { console.log("NYX initSA skipped (likely exists):", (e.message || "").split("\n")[0]); }
const initId = await readInitId(sa);
console.log("NYX sa_init_id:", initId.toString());

const nonce = Date.now();
const s2 = await send([createDelegationIx(user.publicKey, agent.publicKey, nonce, CAP, 0, initId)], [user]);
console.log("NYX granted agent " + (CAP / ONE) + " USDT budget (nonce " + nonce + "): " + link(s2));

const bal = await usdt(user.publicKey);
console.log("NYX user USDT balance:", bal / ONE);
if (bal < DRAW * 2) {
  console.log("NYX !! user has < " + (DRAW * 2 / ONE) + " USDT -> fund " + user.publicKey.toBase58() + " with devnet USDT and rerun to test the pull");
} else {
  for (let i = 0; i < 2; i++) {
    const s = await send([transferFixedIx(agent.publicKey, user.publicKey, nonce, DRAW, agent.publicKey)], [agent]);
    console.log("NYX agent pulled " + (DRAW / ONE) + " USDT: " + link(s));
  }
  console.log("NYX agent USDT balance:", (await usdt(agent.publicKey)) / ONE, "| spent 4/5 of cap");
  try {
    await send([transferFixedIx(agent.publicKey, user.publicKey, nonce, DRAW, agent.publicKey)], [agent]);
    console.log("NYX !! overspend NOT rejected -- investigate");
  } catch (e) {
    console.log("NYX cap enforced: overspend rejected as expected");
  }
}
console.log("NYX done");
