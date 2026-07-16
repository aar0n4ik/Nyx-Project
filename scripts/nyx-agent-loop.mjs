import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";
import { settlement, dispute, bridge, pda, decodeMarket } from "../sdk/nyx-txodds-settlement/src/index.mjs";

const ALLOW = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS   = SystemProgram.programId;
const MINT  = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const ONE = 1000000;

const CAP = 10 * ONE;
const NO_SEED = 4 * ONE;
const REF_PROB = Number(process.env.NYX_REF_PROB || "0.6");
const THRESHOLD = 0.03;
const MAX_TICKET = 3 * ONE;
const MIN_TICKET = 0.25 * ONE;
const MAX_ITERS = 6;
const INTERVAL_MS = 1500;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const EXP = "https:" + "//explorer.solana" + ".com/tx/";
const link = (s) => EXP + s + "?cluster=devnet";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  try { return Number((await conn.getTokenAccountBalance(ata(owner))).value.amount); }
  catch (e) { return 0; }
}
async function readMarket(market) { return decodeMarket((await conn.getAccountInfo(market)).data); }

const saPda = (user) => apda([Buffer.from("SubscriptionAuthority"), user.toBuffer(), MINT.toBuffer()]);
const delegPda = (user, agent, nonce) =>
  apda([Buffer.from("delegation"), saPda(user).toBuffer(), user.toBuffer(), agent.toBuffer(), u64(nonce)]);

function createAtaIx(payer, owner) {
  return new TransactionInstruction({ programId: ASSOC, data: u8(1),
    keys: [ m(payer, true, true), m(ata(owner), false, true), m(owner, false, false),
            m(MINT, false, false), m(SYS, false, false), m(TOKEN, false, false) ] });
}
function splTransferIx(fromOwner, toOwner, amount) {
  const data = Buffer.concat([u8(3), u64(amount)]);
  return new TransactionInstruction({ programId: TOKEN, data,
    keys: [ m(ata(fromOwner), false, true), m(ata(toOwner), false, true), m(fromOwner, true, false) ] });
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

console.log("NYX autonomous zero-custody betting agent");
console.log("NYX user :", user.publicKey.toBase58());
console.log("NYX agent:", agent.publicKey.toBase58());
console.log("NYX reference P(YES) (TxLINE input, set via NYX_REF_PROB):", REF_PROB);

await send([createAtaIx(user.publicKey, user.publicKey), createAtaIx(user.publicKey, agent.publicKey)], [user]);
if ((await conn.getBalance(agent.publicKey)) < 10000000) {
  await send([SystemProgram.transfer({ fromPubkey: user.publicKey, toPubkey: agent.publicKey, lamports: 20000000 })], [user]);
}
if ((await bal(agent.publicKey)) < NO_SEED) {
  await send([splTransferIx(user.publicKey, agent.publicKey, NO_SEED)], [user]);
  console.log("NYX seeded agent with demo counterparty liquidity");
}

const fixtureId = Math.floor(Date.now() / 1000);
const marketKey = [11, 0, 0, 0, 0, 0, 0, 0];
const closeTs = Math.floor(Date.now() / 1000) + 3600;
const market = pda.market(fixtureId, marketKey);
await send([bridge.createBoundMarket({ fixtureId, marketKey, closeTs, mint: MINT })], [user]);
console.log("NYX market oracle bound to bridge PDA " + pda.oracle().toBase58() + " -- no human key can resolve");
await send([settlement.placeBet({ fixtureId, marketKey, bettor: agent.publicKey, bettorAta: ata(agent.publicKey), sideYes: false, amount: NO_SEED })], [agent]);
console.log("NYX market " + market.toBase58() + " opened with " + (NO_SEED / ONE) + " USDT of NO liquidity (stand-in for other bettors)");

const sa = await initSaIfNeeded(user);
const initId = await readInitId(sa);
const nonce = Date.now();
await send([createDelegationIx(user.publicKey, agent.publicKey, nonce, CAP, 0, initId)], [user]);
console.log("NYX user delegated a " + (CAP / ONE) + " USDT capped budget (single fixed allowance)");

let spent = 0;
for (let i = 1; i <= MAX_ITERS; i++) {
  await sleep(INTERVAL_MS);
  const mk = await readMarket(market);
  const py = Number(mk.poolYes), pn = Number(mk.poolNo);
  const total = py + pn;
  const implied = total === 0 ? 0.5 : py / total;
  const edge = REF_PROB - implied;
  const remaining = CAP - spent;
  console.log("NYX tick " + i + ": market P(YES)=" + implied.toFixed(3) + " | edge=" + edge.toFixed(3) + " | budget_left=" + (remaining / ONE));
  if (edge <= THRESHOLD) { console.log("NYX   edge gone -> agent holds, market matches the feed"); break; }
  if (remaining < MIN_TICKET) { console.log("NYX   budget exhausted -> agent stops"); break; }
  let x = Math.floor((REF_PROB * total - py) / (1 - REF_PROB));
  x = Math.min(x, MAX_TICKET, remaining);
  if (x < MIN_TICKET) { console.log("NYX   edge too small to size a ticket -> agent holds"); break; }
  const pull = transferFixedIx(agent.publicKey, user.publicKey, nonce, x, agent.publicKey);
  const betFor = settlement.placeBetFor({ fixtureId, marketKey, owner: user.publicKey, agent: agent.publicKey, agentAta: ata(agent.publicKey), sideYes: true, amount: x });
  const sig = await send([pull, betFor], [agent]);
  spent += x;
  console.log("NYX   -> agent bet " + (x / ONE) + " USDT on YES FOR the user (user-owned): " + link(sig));
}
console.log("NYX total auto-staked from the capped budget: " + (spent / ONE) + " / " + (CAP / ONE) + " USDT");

const LIVENESS = 3, BOND = 1 * ONE;
await send([dispute.propose({ fixtureId, marketKey, proposer: user.publicKey, proposerAta: ata(user.publicKey), mint: MINT, arbiter: user.publicKey, outcomeYes: true, bond: BOND, liveness: LIVENESS })], [user]);
console.log("NYX outcome YES proposed under a " + (BOND / ONE) + " USDT bond; " + LIVENESS + "s liveness, no challenger");
await sleep((LIVENESS + 2) * 1000);
await send([dispute.settleUndisputed({ fixtureId, marketKey, proposer: user.publicKey, proposerAta: ata(user.publicKey) })], [user]);
const sResolve = await send([bridge.pushResolution({ fixtureId, marketKey })], [agent]);
console.log("NYX resolved trustlessly: bridge PDA wrote the outcome via CPI; fee-payer " + agent.publicKey.toBase58() + " is NOT an oracle: " + link(sResolve));
const before = await bal(user.publicKey);
const sClaim = await send([settlement.claim({ fixtureId, marketKey, bettor: user.publicKey, bettorAta: ata(user.publicKey) })], [user]);
const after = await bal(user.publicKey);
console.log("NYX YES won; user claimed " + ((after - before) / ONE) + " USDT to their OWN wallet: " + link(sClaim));
console.log("NYX done: an autonomous agent priced the market to the reference feed using ONLY the user's protocol-capped budget; every position it opened is owned by the user and was claimed back to the user's wallet -- zero custody.");
