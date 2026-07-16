// nyx-txodds-settlement
// Trust-minimized sports settlement on Solana for TxLINE / TxODDS data feeds.
// Instruction builders, PDA derivation and account decoders for three programs:
//   nyx_settlement    escrowed YES/NO market; pays winners from a PDA vault
//   nyx_dispute       optimistic oracle: propose -> dispute -> arbitrate -> slash
//   nyx_oracle_bridge binds a market's oracle to a program PDA and forwards the
//                     finalized dispute outcome via CPI, so no human key resolves
//
// No IDL required: instructions are built from Anchor's stable sighash convention.
import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { createHash } from "node:crypto";

export const PROGRAM_IDS = {
  settlement: new PublicKey("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3"),
  dispute: new PublicKey("7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN"),
  bridge: new PublicKey("BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk"),
};

// SPL Token program (hard-coded so the SDK has no @solana/spl-token dependency).
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export const STATE = { PROPOSED: 0, DISPUTED: 1, RESOLVED: 2 };

// Anchor discriminators.
export const disc = (name) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
export const accountDisc = (name) => createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);

export const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
export const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };

const asKey = (k) => (k instanceof PublicKey ? k : new PublicKey(k));
const mk8 = (marketKey) => {
  const b = Buffer.from(marketKey);
  if (b.length !== 8) throw new Error("marketKey must be exactly 8 bytes");
  return b;
};
const ro = (pubkey, isSigner = false) => ({ pubkey: asKey(pubkey), isSigner, isWritable: false });
const rw = (pubkey, isSigner = false) => ({ pubkey: asKey(pubkey), isSigner, isWritable: true });

// ---- PDA derivation (deterministic; match the on-chain seeds exactly) ----
export const pda = {
  market: (fixtureId, marketKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("market"), u64le(fixtureId), mk8(marketKey)], PROGRAM_IDS.settlement)[0],
  vault: (market) =>
    PublicKey.findProgramAddressSync([Buffer.from("vault"), asKey(market).toBuffer()], PROGRAM_IDS.settlement)[0],
  position: (market, owner) =>
    PublicKey.findProgramAddressSync([Buffer.from("pos"), asKey(market).toBuffer(), asKey(owner).toBuffer()], PROGRAM_IDS.settlement)[0],
  assertion: (fixtureId, marketKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("assertion"), u64le(fixtureId), mk8(marketKey)], PROGRAM_IDS.dispute)[0],
  disputeVault: (assertion) =>
    PublicKey.findProgramAddressSync([Buffer.from("dispute_vault"), asKey(assertion).toBuffer()], PROGRAM_IDS.dispute)[0],
  oracle: () =>
    PublicKey.findProgramAddressSync([Buffer.from("oracle")], PROGRAM_IDS.bridge)[0],
};

// ---- nyx_settlement ----
export const settlement = {
  createMarket({ fixtureId, marketKey, closeTs, authority, mint }) {
    const market = pda.market(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.settlement,
      keys: [rw(market), rw(authority, true), ro(mint), rw(pda.vault(market)), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY)],
      data: Buffer.concat([disc("create_market"), u64le(fixtureId), mk8(marketKey), i64le(closeTs)]),
    });
  },
  placeBet({ fixtureId, marketKey, bettor, bettorAta, sideYes, amount }) {
    const market = pda.market(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.settlement,
      keys: [rw(market), rw(pda.position(market, bettor)), rw(bettor, true), rw(bettorAta), rw(pda.vault(market)), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId)],
      data: Buffer.concat([disc("place_bet"), Buffer.from([sideYes ? 1 : 0]), u64le(amount)]),
    });
  },
  placeBetFor({ fixtureId, marketKey, owner, agent, agentAta, sideYes, amount }) {
    const market = pda.market(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.settlement,
      keys: [rw(market), rw(pda.position(market, owner)), ro(owner), rw(agent, true), rw(agentAta), rw(pda.vault(market)), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId)],
      data: Buffer.concat([disc("place_bet_for"), Buffer.from([sideYes ? 1 : 0]), u64le(amount)]),
    });
  },
  claim({ fixtureId, marketKey, bettor, bettorAta }) {
    const market = pda.market(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.settlement,
      keys: [rw(market), rw(pda.position(market, bettor)), rw(bettor, true), rw(bettorAta), rw(pda.vault(market)), ro(TOKEN_PROGRAM_ID)],
      data: disc("claim"),
    });
  },
  // Direct resolve (oracle signs). In production the oracle is the bridge PDA;
  // use bridge.pushResolution instead of calling this with a human key.
  resolve({ fixtureId, marketKey, oracle, outcomeYes }) {
    return new TransactionInstruction({
      programId: PROGRAM_IDS.settlement,
      keys: [rw(pda.market(fixtureId, marketKey)), ro(oracle, true)],
      data: Buffer.concat([disc("resolve"), Buffer.from([outcomeYes ? 1 : 0])]),
    });
  },
};

// ---- nyx_dispute (optimistic oracle) ----
export const dispute = {
  propose({ fixtureId, marketKey, proposer, proposerAta, mint, arbiter, outcomeYes, bond, liveness }) {
    const assertion = pda.assertion(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.dispute,
      keys: [rw(assertion), rw(pda.disputeVault(assertion)), rw(proposer, true), rw(proposerAta), ro(mint), ro(arbiter), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY)],
      data: Buffer.concat([disc("propose"), u64le(fixtureId), mk8(marketKey), Buffer.from([outcomeYes ? 1 : 0]), u64le(bond), i64le(liveness)]),
    });
  },
  dispute({ fixtureId, marketKey, disputer, disputerAta }) {
    const assertion = pda.assertion(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.dispute,
      keys: [rw(assertion), rw(pda.disputeVault(assertion)), rw(disputer, true), rw(disputerAta), ro(TOKEN_PROGRAM_ID)],
      data: disc("dispute"),
    });
  },
  settleUndisputed({ fixtureId, marketKey, proposer, proposerAta }) {
    const assertion = pda.assertion(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.dispute,
      keys: [rw(assertion), rw(pda.disputeVault(assertion)), rw(proposer, true), rw(proposerAta), ro(TOKEN_PROGRAM_ID)],
      data: disc("settle_undisputed"),
    });
  },
  arbitrate({ fixtureId, marketKey, arbiter, winnerAta, finalOutcomeYes }) {
    const assertion = pda.assertion(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.dispute,
      keys: [rw(assertion), rw(pda.disputeVault(assertion)), ro(arbiter, true), rw(winnerAta), ro(TOKEN_PROGRAM_ID)],
      data: Buffer.concat([disc("arbitrate"), Buffer.from([finalOutcomeYes ? 1 : 0])]),
    });
  },
};

// ---- nyx_oracle_bridge (trustless adapter) ----
export const bridge = {
  createBoundMarket({ fixtureId, marketKey, closeTs, mint }) {
    const market = pda.market(fixtureId, marketKey);
    return new TransactionInstruction({
      programId: PROGRAM_IDS.bridge,
      keys: [rw(market), rw(pda.oracle()), ro(mint), rw(pda.vault(market)), ro(TOKEN_PROGRAM_ID), ro(SystemProgram.programId), ro(SYSVAR_RENT_PUBKEY), ro(PROGRAM_IDS.settlement)],
      data: Buffer.concat([disc("create_bound_market"), u64le(fixtureId), mk8(marketKey), i64le(closeTs)]),
    });
  },
  // Permissionless: anyone may push, but only the outcome the dispute layer finalized.
  pushResolution({ fixtureId, marketKey }) {
    return new TransactionInstruction({
      programId: PROGRAM_IDS.bridge,
      keys: [ro(pda.assertion(fixtureId, marketKey)), rw(pda.market(fixtureId, marketKey)), rw(pda.oracle()), ro(PROGRAM_IDS.dispute), ro(PROGRAM_IDS.settlement)],
      data: disc("push_resolution"),
    });
  },
};

// ---- account decoders (offsets after the 8-byte Anchor discriminator) ----
export function decodeMarket(data) {
  const b = Buffer.from(data);
  return {
    authority: new PublicKey(b.subarray(8, 40)).toBase58(),
    oracle: new PublicKey(b.subarray(40, 72)).toBase58(),
    vault: new PublicKey(b.subarray(72, 104)).toBase58(),
    mint: new PublicKey(b.subarray(104, 136)).toBase58(),
    fixtureId: b.readBigUInt64LE(136),
    marketKey: [...b.subarray(144, 152)],
    closeTs: b.readBigInt64LE(152),
    poolYes: b.readBigUInt64LE(160),
    poolNo: b.readBigUInt64LE(168),
    resolved: b[176] === 1,
    outcomeYes: b[177] === 1,
    bump: b[178],
  };
}
export function decodeAssertion(data) {
  const b = Buffer.from(data);
  return {
    arbiter: new PublicKey(b.subarray(8, 40)).toBase58(),
    mint: new PublicKey(b.subarray(40, 72)).toBase58(),
    vault: new PublicKey(b.subarray(72, 104)).toBase58(),
    proposer: new PublicKey(b.subarray(104, 136)).toBase58(),
    disputer: new PublicKey(b.subarray(136, 168)).toBase58(),
    fixtureId: b.readBigUInt64LE(168),
    marketKey: [...b.subarray(176, 184)],
    proposedOutcomeYes: b[184] === 1,
    finalOutcomeYes: b[185] === 1,
    bond: b.readBigUInt64LE(186),
    challengeEndTs: b.readBigInt64LE(194),
    state: b[202],
    bump: b[203],
  };
}
