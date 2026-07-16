// Trustless settlement demo: bound market -> optimistic oracle -> PDA pushResolution.
// Proves no human key ever calls resolve(): the bridge PDA writes the outcome via CPI.
import fs from "fs";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";
import { settlement, dispute, bridge, pda, decodeMarket, decodeAssertion } from "../sdk/nyx-txodds-settlement/src/index.mjs";

const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS = SystemProgram.programId;
const MINT = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const ONE = 1000000;

const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
const EXP = "https:" + "//explorer.solana" + ".com/tx/";
const link = (s) => EXP + s + "?cluster=devnet";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const u8 = (n) => Buffer.from([n]);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const m = (pk, s, w) => ({ pubkey: pk, isSigner: s, isWritable: w });
const ata = (owner) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];

async function send(ixs, signers) {
  const tx = new Transaction().add(...ixs);
  return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
}
async function bal(owner) {
  try { return Number((await conn.getTokenAccountBalance(ata(owner))).value.amount); } catch (e) { return 0; }
}
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

const user = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"))));
const agent = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("scripts/.agent.json"))));

console.log("NYX trustless settlement (bound market -> optimistic oracle -> PDA pushResolution)");
console.log("NYX user :", user.publicKey.toBase58());
console.log("NYX agent:", agent.publicKey.toBase58());

await send([createAtaIx(user.publicKey, user.publicKey), createAtaIx(user.publicKey, agent.publicKey)], [user]);
if ((await conn.getBalance(agent.publicKey)) < 10000000) {
  await send([SystemProgram.transfer({ fromPubkey: user.publicKey, toPubkey: agent.publicKey, lamports: 20000000 })], [user]);
}
if ((await bal(agent.publicKey)) < 2 * ONE) {
  await send([splTransferIx(user.publicKey, agent.publicKey, 2 * ONE)], [user]);
}

const fixtureId = Math.floor(Date.now() / 1000);
const marketKey = [21, 0, 0, 0, 0, 0, 0, 0];
const closeTs = Math.floor(Date.now() / 1000) + 3600;
const market = pda.market(fixtureId, marketKey);
const oraclePda = pda.oracle();

// 1) market whose oracle IS the bridge PDA -- no human oracle key exists
const sBound = await send([bridge.createBoundMarket({ fixtureId, marketKey, closeTs, mint: MINT })], [user]);
console.log("NYX bound market " + market.toBase58());
console.log("NYX market.oracle = bridge PDA " + oraclePda.toBase58() + " (no human key): " + link(sBound));

// 2) both sides take a position
await send([settlement.placeBet({ fixtureId, marketKey, bettor: user.publicKey, bettorAta: ata(user.publicKey), sideYes: true, amount: 2 * ONE })], [user]);
await send([settlement.placeBet({ fixtureId, marketKey, bettor: agent.publicKey, bettorAta: ata(agent.publicKey), sideYes: false, amount: 2 * ONE })], [agent]);
console.log("NYX positions: YES(user)=2 USDT, NO(counterparty)=2 USDT");

// 3) optimistic oracle: propose outcome under bond, undisputed, finalize after liveness
const LIVENESS = 3, BOND = 1 * ONE;
await send([dispute.propose({ fixtureId, marketKey, proposer: user.publicKey, proposerAta: ata(user.publicKey), mint: MINT, arbiter: user.publicKey, outcomeYes: true, bond: BOND, liveness: LIVENESS })], [user]);
console.log("NYX outcome YES proposed under " + (BOND / ONE) + " USDT bond; liveness " + LIVENESS + "s (no challenger)");
await sleep((LIVENESS + 2) * 1000);
await send([dispute.settleUndisputed({ fixtureId, marketKey, proposer: user.publicKey, proposerAta: ata(user.publicKey) })], [user]);
const asrt = decodeAssertion((await conn.getAccountInfo(pda.assertion(fixtureId, marketKey))).data);
console.log("NYX assertion finalized undisputed: state=" + asrt.state + " finalOutcomeYes=" + asrt.finalOutcomeYes);

// 4) THE trustless step: bridge PDA pushes finalized outcome into settlement via CPI.
//    Signed by the agent as a plain fee-payer -- it is NOT the oracle. Anyone could send this.
const sPush = await send([bridge.pushResolution({ fixtureId, marketKey })], [agent]);
const mk = decodeMarket((await conn.getAccountInfo(market)).data);
console.log("NYX resolved by bridge PDA via CPI, tx fee-payer " + agent.publicKey.toBase58() + " (not an oracle): " + link(sPush));
console.log("NYX market.resolved=" + mk.resolved + " outcomeYes=" + mk.outcomeYes);

// 5) winner claims from the PDA vault
const before = await bal(user.publicKey);
const sClaim = await send([settlement.claim({ fixtureId, marketKey, bettor: user.publicKey, bettorAta: ata(user.publicKey) })], [user]);
const after = await bal(user.publicKey);
console.log("NYX user (YES) claimed " + ((after - before) / ONE) + " USDT: " + link(sClaim));
console.log("NYX done: the winning outcome was written to the market by a program PDA through the dispute game -- no human ever signed resolve().");
