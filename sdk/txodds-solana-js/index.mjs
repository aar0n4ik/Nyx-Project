// nyx-txodds-solana — Unofficial community SDK. Not affiliated with TxODDS.
// Build & verify txoracle `validate_stat_v2` instructions on Solana.
import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js"
import BN from "bn.js"

export const TXORACLE_DEVNET = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"
export const TXORACLE_MAINNET = "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"
export const TXORACLE_IDL_URL =
  "https://raw.githubusercontent.com/txodds/tx-on-chain/main/examples/devnet/idl/txoracle.json"
export const DAILY_SCORES_ROOTS_SEED = "daily_scores_roots"
export const MS_PER_DAY = 86_400_000
export const VALIDATE_STAT_V2_DISCRIMINATOR = Uint8Array.from([
  208, 215, 194, 214, 241, 71, 246, 178,
])

// --- byte helpers ---
export function to32(x) {
  const arr = Array.from(x)
  if (arr.length !== 32) throw new Error(`Expected 32 bytes, got ${arr.length}`)
  return arr
}

export function proofNodes(nodes) {
  return (nodes ?? []).map((n) => ({
    hash: to32(n.hash),
    isRightSibling: n.isRightSibling,
  }))
}

export function epochDayFromMillis(ms) {
  return Math.floor(ms / MS_PER_DAY)
}

// PDA = ["daily_scores_roots", u16_le(epochDay)] under txoracle program id
export function deriveDailyScoresRootsPda(programId, epochDay) {
  const pid = typeof programId === "string" ? new PublicKey(programId) : programId
  const epochBuf = Buffer.alloc(2)
  epochBuf.writeUInt16LE(epochDay, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DAILY_SCORES_ROOTS_SEED), epochBuf],
    pid
  )
}

// Map a raw /scores/stat-validation response ("val") -> StatValidationInput payload.
// Field mapping mirrors the official TxODDS example (subscription_scores_v2.ts).
export function buildStatValidationPayload(val) {
  return {
    ts: new BN(val.summary.updateStats.minTimestamp),
    fixtureSummary: {
      fixtureId: new BN(val.summary.fixtureId),
      updateStats: {
        updateCount: val.summary.updateStats.updateCount,
        minTimestamp: new BN(val.summary.updateStats.minTimestamp),
        maxTimestamp: new BN(val.summary.updateStats.maxTimestamp),
      },
      eventsSubTreeRoot: to32(val.summary.eventStatsSubTreeRoot),
    },
    fixtureProof: proofNodes(val.subTreeProof),
    mainTreeProof: proofNodes(val.mainTreeProof),
    eventStatRoot: to32(val.eventStatRoot),
    stats: val.statsToProve.map((statObj, i) => ({
      stat: statObj,
      statProof: proofNodes(val.statProofs[i]),
    })),
  }
}

// --- strategy builders (anchor camelCase enum shapes) ---
export function traderPredicate(threshold, comparison = "greaterThan") {
  return { threshold, comparison: { [comparison]: {} } }
}

export function single(index, predicate) {
  return { single: { index, predicate } }
}

export function binary(indexA, indexB, op, predicate) {
  return { binary: { indexA, indexB, op: { [op]: {} }, predicate } }
}

export function discreteStrategy(predicates) {
  return { geometricTargets: [], distancePredicate: null, discretePredicates: predicates }
}

export function geometricStrategy(targets, distancePredicate) {
  return {
    geometricTargets: targets,
    distancePredicate: distancePredicate ?? null,
    discretePredicates: [],
  }
}

// One `single` predicate per stat index — a sane default for validating N stats.
export function defaultDiscreteStrategy(statCount, opts = {}) {
  const { threshold = 0, comparison = "greaterThan" } = opts
  const preds = []
  for (let i = 0; i < statCount; i++) {
    preds.push(single(i, traderPredicate(threshold, comparison)))
  }
  return discreteStrategy(preds)
}

// --- anchor program helpers ---
export async function fetchTxoracleIdl(url = TXORACLE_IDL_URL) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch txoracle IDL: ${res.status}`)
  return await res.json()
}

// Returns the raw instruction data (Buffer) for validate_stat_v2 — the exact
// bytes you pass into a CPI-forwarding program (e.g. nyx_verifier.settle_verified).
export async function buildValidateStatV2IxData(program, payload, strategy, pda) {
  const ix = await program.methods
    .validateStatV2(payload, strategy)
    .accounts({ dailyScoresMerkleRoots: pda })
    .instruction()
  return ix.data
}

// Read-only simulate: returns the boolean verification result off-chain.
export async function validateStatV2View(
  program,
  payload,
  strategy,
  pda,
  computeUnits = 1_400_000
) {
  return await program.methods
    .validateStatV2(payload, strategy)
    .accounts({ dailyScoresMerkleRoots: pda })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
    ])
    .view()
}
