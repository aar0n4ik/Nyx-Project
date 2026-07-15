// Offline sanity check — no network, no keys. Verifies wire format + layouts.
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_IDS, STATE, disc, accountDisc, pda,
  settlement, dispute, bridge, decodeMarket, decodeAssertion,
} from "../src/index.mjs";

let count = 0;
const ok = (msg) => { count++; console.log("  ok -", msg); };

// 1. discriminators are 8 bytes and deterministic
assert.equal(disc("place_bet").length, 8);
assert.equal(Buffer.compare(disc("resolve"), disc("resolve")), 0);
ok("discriminators are stable 8-byte sighashes");

// 2. PDA derivation is deterministic
const FIX = 2001, MK = [3, 0, 0, 0, 0, 0, 0, 0];
assert.ok(pda.market(FIX, MK).equals(pda.market(FIX, MK)));
assert.ok(pda.oracle() instanceof PublicKey);
ok("PDA derivation is deterministic");

// 3. instruction wire format
const bettor = PROGRAM_IDS.settlement, ata = PROGRAM_IDS.dispute, mint = PROGRAM_IDS.bridge;
const bet = settlement.placeBet({ fixtureId: FIX, marketKey: MK, bettor, bettorAta: ata, sideYes: true, amount: 10_000000 });
assert.ok(bet.programId.equals(PROGRAM_IDS.settlement));
assert.equal(bet.keys.length, 7);
assert.equal(Buffer.compare(bet.data.subarray(0, 8), disc("place_bet")), 0);
assert.equal(bet.data.length, 17); // 8 disc + 1 side + 8 amount
assert.equal(bet.data[8], 1);

const prop = dispute.propose({ fixtureId: FIX, marketKey: MK, proposer: bettor, proposerAta: ata, mint, arbiter: bettor, outcomeYes: false, bond: 10_000000, liveness: 3600 });
assert.equal(prop.keys.length, 9);
assert.equal(prop.data.length, 41); // 8 + 8 + 8 + 1 + 8 + 8
assert.equal(prop.data[24], 0);

const push = bridge.pushResolution({ fixtureId: FIX, marketKey: MK });
assert.equal(push.keys.length, 5);
assert.equal(push.keys[0].isWritable, false); // assertion is read-only
assert.equal(push.keys[1].isWritable, true);  // market is written via CPI
ok("instruction builders emit correct discriminators, sizes and account metas");

// 4. account layout round-trip
const buf = Buffer.alloc(179);
accountDisc("Market").copy(buf, 0);
PROGRAM_IDS.settlement.toBuffer().copy(buf, 8);
PROGRAM_IDS.bridge.toBuffer().copy(buf, 40);   // oracle = bridge PDA (trustless)
PROGRAM_IDS.dispute.toBuffer().copy(buf, 72);
PROGRAM_IDS.settlement.toBuffer().copy(buf, 104);
buf.writeBigUInt64LE(BigInt(FIX), 136);
Buffer.from(MK).copy(buf, 144);
buf.writeBigInt64LE(1799999999n, 152);
buf.writeBigUInt64LE(10_000000n, 160);
buf.writeBigUInt64LE(10_000000n, 168);
buf[176] = 1; buf[177] = 1; buf[178] = 254;
const m = decodeMarket(buf);
assert.equal(m.oracle, PROGRAM_IDS.bridge.toBase58());
assert.equal(m.fixtureId, BigInt(FIX));
assert.deepEqual(m.marketKey, MK);
assert.equal(m.poolYes, 10_000000n);
assert.equal(m.resolved, true);
assert.equal(m.outcomeYes, true);
ok("Market layout decodes at the correct byte offsets");

const abuf = Buffer.alloc(204);
accountDisc("Assertion").copy(abuf, 0);
abuf.writeBigUInt64LE(BigInt(FIX), 168);
Buffer.from(MK).copy(abuf, 176);
abuf[185] = 1; abuf[202] = STATE.RESOLVED;
const a = decodeAssertion(abuf);
assert.equal(a.fixtureId, BigInt(FIX));
assert.equal(a.finalOutcomeYes, true);
assert.equal(a.state, STATE.RESOLVED);
ok("Assertion layout decodes at the correct byte offsets");

console.log(`\nAll ${count} checks passed.`);
