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
const CAP = 6 * ONE, BET = 5 * ONE, NO_BET = 2 * ONE;

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
async function bal(owner) {
  try { return Number((await conn.getTokenAccountBalance(ata(owner))).value.amount) / ONE; }
  catch (e) { return 0; }
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
async function readInitId(sa) { return (await conn.getAccountInfo(sa)).data.readBigInt64LE(98); }
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

const fixtureId = Math.floor(Date.now() / 1000);
const marketKey = [9, 0, 0, 0, 0, 0, 0, 0];
const closeTs = Math.floor(Date.now() / 1000) + 3600;
const market = pda.market(fixtureId, marketKey);
const sMk = await send([settlement.createMarket({ fixtureId, marketKey, closeTs, authority: user.publicKey, mint: MINT })], [user]);
console.log("NYX market created " + market.toBase58() + " " + link(sMk));

const sNo = await send([settlement.placeBet({ fixtureId, marketKey, bettor: agent.publicKey, bettorAta: ata(agent.publicKey), sideYes: false, amount: NO_BET })], [agent]);
console.log("NYX agent placed NO 2 USDT with its OWN funds (this side will lose): " + link(sNo));

const sa = await initSaIfNeeded(user);
const initId = await readInitId(sa);
const nonce = Date.now();
await send([createDelegationIx(user.publicKey, agent.publicKey, nonce, CAP, 0, initId)], [user]);
console.log("NYX user granted agent 6 USDT budget (nonce " + nonce + ")");

const userBefore = await bal(user.publicKey);
const mBefore = decodeMarket((await conn.getAccountInfo(market)).data);
console.log("NYX before bet: user USDT " + userBefore + " | poolYes " + mBefore.poolYes + " | poolNo " + mBefore.poolNo);

const pullIx = transferFixedIx(agent.publicKey, user.publicKey, nonce, BET, agent.publicKey);
const betForIx = settlement.placeBetFor({ fixtureId, marketKey, owner: user.publicKey, agent: agent.publicKey, agentAta: ata(agent.publicKey), sideYes: true, amount: BET });
const sBet = await send([pullIx, betForIx], [agent]);
console.log("NYX agent pulled 5 USDT + bet YES FOR the user in ONE tx: " + link(sBet));

const posPk = pda.position(market, user.publicKey);
const posInfo = await conn.getAccountInfo(posPk);
const posOwner = new PublicKey(posInfo.data.subarray(40, 72)).toBase58();
console.log("NYX position owner is the USER? " + (posOwner === user.publicKey.toBase58()));

const sRes = await send([settlement.resolve({ fixtureId, marketKey, oracle: user.publicKey, outcomeYes: true })], [user]);
console.log("NYX user resolved market YES: " + link(sRes));
const sClaim = await send([settlement.claim({ fixtureId, marketKey, bettor: user.publicKey, bettorAta: ata(user.publicKey) })], [user]);
console.log("NYX user claimed payout to their OWN wallet: " + link(sClaim));

const userAfter = await bal(user.publicKey);
console.log("NYX after: user USDT " + userAfter + " (delta " + (userAfter - userBefore).toFixed(6) + ")");
console.log("NYX done: agent staked the user's capped funds, the USER owns the position, and the payout landed in the USER's wallet -- zero custody, zero user signature on the bet");
