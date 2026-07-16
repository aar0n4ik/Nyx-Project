import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";
import { settlement, pda, decodeMarket } from "../sdk/nyx-txodds-settlement/src/index.mjs";

const ALLOW = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS   = SystemProgram.programId;
const MINT  = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const ONE = 1000000;
const CAP = 6 * ONE, BET = 5 * ONE;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const EXP = "https:" + "//explorer.solana" + ".com/tx/";
const link = (s) => EXP + s + "?cluster=devnet";

const u8  = (n) => Buffer.from([n]);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const m   = (pk, s, w) => ({ pubkey: pk, isSigner: s, isWritable: w });
const apda = (seeds) => PublicKey.findProgramAddressSync(seeds, ALLOW)[0];
const ata = (owner) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];

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
  const acc = await conn.getAccountInfo(sa);
  return acc.data.readBigInt64LE(98);
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
async function usdt(owner) {
  try { const b = await conn.getTokenAccountBalance(ata(owner)); return Number(b.value.amount); }
  catch (e) { return 0; }
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

const fixtureId = Date.now();
const marketKey = [1, 0, 0, 0, 0, 0, 0, 0];
const closeTs = Math.floor(Date.now() / 1000) + 3600;
const market = pda.market(fixtureId, marketKey);
const sM = await send([settlement.createMarket({ fixtureId, marketKey, closeTs, authority: user.publicKey, mint: MINT })], [user]);
console.log("NYX market created " + market.toBase58() + " " + link(sM));

const sa = await initSaIfNeeded(user);
const initId = await readInitId(sa);
const nonce = Date.now();
const sG = await send([createDelegationIx(user.publicKey, agent.publicKey, nonce, CAP, 0, initId)], [user]);
console.log("NYX granted agent " + (CAP / ONE) + " USDT budget: " + link(sG));

const before = decodeMarket((await conn.getAccountInfo(market)).data);
const agentBefore = await usdt(agent.publicKey);
console.log("NYX poolYes before: " + Number(before.poolYes) / ONE + " | agent USDT before: " + agentBefore / ONE);
const sB = await send([
  transferFixedIx(agent.publicKey, user.publicKey, nonce, BET, agent.publicKey),
  settlement.placeBet({ fixtureId, marketKey, bettor: agent.publicKey, bettorAta: ata(agent.publicKey), sideYes: true, amount: BET }),
], [agent]);
console.log("NYX agent pulled " + (BET / ONE) + " USDT + bet YES in ONE tx: " + link(sB));

const after = decodeMarket((await conn.getAccountInfo(market)).data);
const posAcc = await conn.getAccountInfo(pda.position(market, agent.publicKey));
console.log("NYX poolYes after : " + Number(after.poolYes) / ONE + " | agent USDT after: " + (await usdt(agent.publicKey)) / ONE);
console.log("NYX position recorded: " + (!!posAcc));
console.log("NYX done: user capped funds -> agent -> on-chain YES bet, no user signature on the bet");
