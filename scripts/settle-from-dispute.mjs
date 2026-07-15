// Oracle bridge: nyx_dispute -> nyx_settlement.
// Settlement takes an outcome ONLY after it survived the dispute challenge window.
// Reads a finalized Assertion on-chain (manual decode, no IDL) and optionally
// pushes its final outcome into nyx_settlement.resolve as the oracle.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";

const DISPUTE_PID = new PublicKey("7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN");
const SETTLE_PID = new PublicKey("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3");
const RPC = process.env.NYX_RPC_URL || "https://api.devnet.solana.com";

const disc = (n) => createHash("sha256").update(`global:${n}`).digest().subarray(0, 8);
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const loadKeypair = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(p, "utf8"))));
const STATE = ["PROPOSED", "DISPUTED", "RESOLVED"];

const conn = new Connection(RPC, "confirmed");
const assertionPda = (fixtureId, marketKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("assertion"), u64le(fixtureId), Buffer.from(marketKey)], DISPUTE_PID)[0];

function decodeAssertion(buf) {
  return {
    fixtureId: buf.readBigUInt64LE(168),
    proposedYes: buf[184] === 1,
    finalYes: buf[185] === 1,
    bond: buf.readBigUInt64LE(186),
    state: buf[202],
  };
}
async function readAssertion(fixtureId, marketKey) {
  const pda = assertionPda(fixtureId, marketKey);
  const info = await conn.getAccountInfo(pda);
  if (!info) { console.log(`assertion ${fixtureId}: not found`); return null; }
  const a = decodeAssertion(info.data);
  console.log(`assertion ${fixtureId} @ ${pda.toBase58()}`);
  console.log(`  state=${STATE[a.state]} proposed=${a.proposedYes ? "YES" : "NO"} final=${a.finalYes ? "YES" : "NO"} bond=${Number(a.bond) / 1e6}`);
  return { pda, ...a };
}
async function resolveSettlement(marketPubkey, oracle, outcomeYes) {
  const data = Buffer.concat([disc("resolve"), Buffer.from([outcomeYes ? 1 : 0])]);
  const ixn = new TransactionInstruction({
    programId: SETTLE_PID,
    keys: [
      { pubkey: marketPubkey, isSigner: false, isWritable: true },
      { pubkey: oracle.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
  const tx = new Transaction().add(ixn);
  tx.feePayer = oracle.publicKey;
  return sendAndConfirmTransaction(conn, tx, [oracle]);
}

console.log("Oracle bridge: nyx_dispute -> nyx_settlement\n");
const a1 = await readAssertion(1001, [1, 0, 0, 0, 0, 0, 0, 0]);
const a2 = await readAssertion(1002, [2, 0, 0, 0, 0, 0, 0, 0]);

const target = a1 || a2;
if (target && target.state === 2) {
  console.log(`\n▸ Assertion ${target.fixtureId} survived the challenge window. Authoritative outcome = ${target.finalYes ? "YES" : "NO"}.`);
  const marketEnv = process.env.NYX_MARKET;
  if (marketEnv) {
    const oracle = loadKeypair(process.env.NYX_ORACLE_KEYPAIR || `${homedir()}/.config/solana/id.json`);
    const sig = await resolveSettlement(new PublicKey(marketEnv), oracle, target.finalYes);
    console.log(`  pushed to nyx_settlement.resolve -> tx ${sig}`);
  } else {
    console.log("  set NYX_MARKET=<market pubkey> (+ NYX_ORACLE_KEYPAIR) to push this outcome into a live settlement market.");
  }
} else {
  console.log("\nNo finalized assertion yet. Run scripts/dispute-demo.mjs first.");
}
console.log("\n▸ Loop closed: an outcome reaches settlement only after passing propose -> challenge -> finalize.");
