import type { Program } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js"

export const TXORACLE_DEVNET: string
export const TXORACLE_MAINNET: string
export const TXORACLE_IDL_URL: string
export const DAILY_SCORES_ROOTS_SEED: string
export const MS_PER_DAY: number
export const VALIDATE_STAT_V2_DISCRIMINATOR: Uint8Array

export type Comparison = "greaterThan" | "lessThan" | "equalTo"
export type BinaryOp = "add" | "subtract"

export interface ProofNode { hash: number[]; isRightSibling: boolean }
export interface TraderPredicate { threshold: number; comparison: Record<string, {}> }
export type StatPredicate = Record<string, unknown>
export interface GeometricTarget { statIndex: number; prediction: number }
export interface NDimensionalStrategy {
  geometricTargets: GeometricTarget[]
  distancePredicate: TraderPredicate | null
  discretePredicates: StatPredicate[]
}

export function to32(x: ArrayLike<number>): number[]
export function proofNodes(
  nodes: Array<{ hash: ArrayLike<number>; isRightSibling: boolean }> | null | undefined
): ProofNode[]
export function epochDayFromMillis(ms: number): number
export function deriveDailyScoresRootsPda(
  programId: PublicKey | string,
  epochDay: number
): [PublicKey, number]
export function buildStatValidationPayload(val: any): any
export function traderPredicate(threshold: number, comparison?: Comparison): TraderPredicate
export function single(index: number, predicate: TraderPredicate): StatPredicate
export function binary(
  indexA: number,
  indexB: number,
  op: BinaryOp,
  predicate: TraderPredicate
): StatPredicate
export function discreteStrategy(predicates: StatPredicate[]): NDimensionalStrategy
export function geometricStrategy(
  targets: GeometricTarget[],
  distancePredicate: TraderPredicate | null
): NDimensionalStrategy
export function defaultDiscreteStrategy(
  statCount: number,
  opts?: { threshold?: number; comparison?: Comparison }
): NDimensionalStrategy
export function fetchTxoracleIdl(url?: string): Promise<any>
export function buildValidateStatV2IxData(
  program: Program,
  payload: any,
  strategy: NDimensionalStrategy,
  pda: PublicKey
): Promise<Buffer>
export function validateStatV2View(
  program: Program,
  payload: any,
  strategy: NDimensionalStrategy,
  pda: PublicKey,
  computeUnits?: number
): Promise<boolean>
