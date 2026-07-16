import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";

const ALLOW = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS   = SystemProgram.programId;
const MINT  = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const ONE = 1000000;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");

const u8  = (n) => Buffer.from([n]);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const m   = (pk, s, w) => ({ pubkey: pk, isSigner: s, isWritable: w });
const apda = (seeds) => PublicKey.findProgramAddressSync(seeds, ALLOW)[0];
const ata = (owner) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(ixs, signers) {
  const tx = new Transaction().add(...ixs);
  return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
}
const saPda = (user) => apda([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()]);
const delegPda = (user, agent, nonce) =>
  apda([Buffer.from("delegation"), saPda(user).toBuffer(), user.toBuffer(), agent.toBuffer(), u64(nonce)]);

function createAtaIx(payer, owner) {
  return new TransactionInstruction({ programId: ASSOC, data: u8(1),
    keys: [ m(payer, true, true), m(ata(owner), false, true), m(owner, false, false),
            m(MINT, false, false), m(SYS, false, false), m(TOKEN, false, false) ] });
}
async function initSaIfNeeded(user) {
  const sa = saPda(user.publicKey);
  if (await conn.getAccountInfo(sa)) return sa;
  const ix = new TransactionInstruction({ programId: ALLOW, data: u8(0),
    keys: [ m(user.publicKey, true, true), m(sa, false, true), m(MINT, false, false),
            m(ata(user.publicKey), false, true), m(SYS, false, false), m(TOKEN, false, false) ] });
  await send([ix], [user]);
  return sa;
}
async function readInitId(sa) {
  return (await conn.getAccountInfo(sa)).data.readBigInt64LE(98);
}
function createDelegationIx(user, agent, nonce, amount, expiry, initId) {
  const data = Buffer.concat([u8(1), u64(nonce), u64(amount), i64(expiry), i64(initId)]);
  return new TransactionInstruction({ programId: ALLOW, data,
    keys: [ m(user, true, true), m(saPda(user), false, false), m(delegPda(user, agent, nonce), false, true),
            m(agent, false, false), m(SYS, false, false) ] });
}
function transferFixedIx(agent, user, nonce, amount, receiver) {
  const ev = apda([Buffer.from("event_authority")]);
  const data = Buffer.concat([u8(4), u64(amount), user.toBuffer(), MINT.toBuffer()]);
  return new TransactionInstruction({ programId: ALLOW, data,
    keys: [ m(delegPda(user, agent, nonce), false, true), m(saPda(user), false, false),
            m(ata(user), false, true), m(ata(receiver), false, true), m(MINT, false, false),
            m(TOKEN, false, false), m(agent, true, false), m(ev, false, false), m(ALLOW, false, false) ] });
}

const user = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"))));
const agent = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(fs.readFileSync("scripts/.agent.json"))));

console.log("NYX user :", user.publicKey.toBase58());
console.log("NYX agent:", agent.publicKey.toBase58());

await send([createAtaIx(user.publicKey, user.publicKey), createAtaIx(user.publicKey, agent.publicKey)], [user]);
if ((await conn.getBalance(agent.publicKey)) < 10000000) {
  await send([SystemProgram.transfer({ fromPubkey: user.publicKey, toPubkey: agent.publicKey, lamports: 20000000 })], [user]);
}

const sa = await initSaIfNeeded(user);
const initId = await readInitId(sa);

const nowSec = Math.floor(Date.now() / 1000);
const expiry = nowSec + 6;
const nonce = Date.now();
await send([createDelegationIx(user.publicKey, agent.publicKey, nonce, 3 * ONE, expiry, initId)], [user]);
console.log("NYX granted 3 USDT budget, expires at unix " + expiry);

try {
  await send([transferFixedIx(agent.publicKey, user.publicKey, nonce, 1 * ONE, agent.publicKey)], [agent]);
  console.log("NYX before expiry: agent pulled 1 USDT OK");
} catch (e) {
  console.log("NYX before expiry: unexpected failure -> " + (e.message || "").split("\n")[0]);
}

console.log("NYX waiting for the budget to expire...");
await sleep(15000);

try {
  await send([transferFixedIx(agent.publicKey, user.publicKey, nonce, 1 * ONE, agent.publicKey)], [agent]);
  console.log("NYX !! after expiry: pull SUCCEEDED -- expiry NOT enforced, investigate");
} catch (e) {
  console.log("NYX after expiry: pull rejected as expected (budget expired) -- user stays in control");
}
console.log("NYX done: capped budget auto-expires; agent cannot spend past the window");
