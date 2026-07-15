//! # txodds-verifier (unofficial)
//!
//! Verify **TxODDS TxLINE** sports data on **Solana** through an on-chain
//! Cross-Program Invocation (CPI) into the `txoracle` program's
//! `validate_stat_v2` instruction.
//!
//! > **Unofficial / community project.** Not affiliated with or endorsed by
//! > TxODDS. The `txoracle` program, its IDL, and all data belong to TxODDS.
//!
//! What you get:
//! - Borsh types matching the txoracle IDL byte-for-byte
//!   ([`StatValidationInput`], [`NDimensionalStrategy`], [`StatPredicate`], ...).
//! - [`build_validate_stat_v2_data`] — exact instruction data (discriminator + args).
//! - [`validate_stat_v2_instruction`] — a ready-to-send [`Instruction`].
//! - [`verify_stat_cpi`] / [`verify_stat_cpi_raw`] — CPI from your program, read the `bool`.
//! - [`derive_daily_scores_roots_pda`] — the daily scores root PDA.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke},
    program_error::ProgramError,
    pubkey::Pubkey,
};

/// Anchor discriminator for `validate_stat_v2` = sha256("global:validate_stat_v2")[..8].
pub const VALIDATE_STAT_V2_DISCRIMINATOR: [u8; 8] = [208, 215, 194, 214, 241, 71, 246, 178];

/// `txoracle` program id on devnet.
pub const TXORACLE_DEVNET: Pubkey =
    solana_program::pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

/// `txoracle` program id on mainnet-beta.
pub const TXORACLE_MAINNET: Pubkey =
    solana_program::pubkey!("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");

/// PDA seed prefix for the daily scores merkle roots account.
pub const DAILY_SCORES_ROOTS_SEED: &[u8] = b"daily_scores_roots";

/// Milliseconds per day, used for the `epoch_day` PDA seed.
pub const MS_PER_DAY: i64 = 86_400_000;

// --------------------------- IDL-matching types ---------------------------

/// A single Merkle proof node. Mirrors `ProofNode`.
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

/// A provable key/value statistic. Mirrors `ScoreStat`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

/// Update statistics for a fixture batch. Mirrors `ScoresUpdateStats`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

/// Per-fixture scores summary within a 5-minute batch. Mirrors `ScoresBatchSummary`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

/// A stat plus its Merkle proof. Mirrors `StatLeaf`.
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct StatLeaf {
    pub stat: ScoreStat,
    pub stat_proof: Vec<ProofNode>,
}

/// Full input for `validate_stat_v2`. Mirrors `StatValidationInput`.
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct StatValidationInput {
    pub ts: i64,
    pub fixture_summary: ScoresBatchSummary,
    pub fixture_proof: Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
    pub event_stat_root: [u8; 32],
    pub stats: Vec<StatLeaf>,
}

/// Comparison operator. Variant order matches the IDL.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

/// A threshold comparison. Mirrors `TraderPredicate`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

impl TraderPredicate {
    pub fn greater_than(threshold: i32) -> Self { Self { threshold, comparison: Comparison::GreaterThan } }
    pub fn less_than(threshold: i32) -> Self { Self { threshold, comparison: Comparison::LessThan } }
    pub fn equal_to(threshold: i32) -> Self { Self { threshold, comparison: Comparison::EqualTo } }
}

/// Binary arithmetic op between two stats. Variant order matches the IDL.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum BinaryExpression {
    Add,
    Subtract,
}

/// A discrete predicate over one or two stats. Mirrors `StatPredicate`.
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum StatPredicate {
    Single { index: u8, predicate: TraderPredicate },
    Binary { index_a: u8, index_b: u8, op: BinaryExpression, predicate: TraderPredicate },
}

impl StatPredicate {
    pub fn single(index: u8, predicate: TraderPredicate) -> Self { Self::Single { index, predicate } }
    pub fn binary(index_a: u8, index_b: u8, op: BinaryExpression, predicate: TraderPredicate) -> Self {
        Self::Binary { index_a, index_b, op, predicate }
    }
}

/// A geometric target for distance-based strategies. Mirrors `GeometricTarget`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct GeometricTarget {
    pub stat_index: u8,
    pub prediction: i32,
}

/// The strategy applied to the proven stats. Mirrors `NDimensionalStrategy`.
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct NDimensionalStrategy {
    pub geometric_targets: Vec<GeometricTarget>,
    pub distance_predicate: Option<TraderPredicate>,
    pub discrete_predicates: Vec<StatPredicate>,
}

impl NDimensionalStrategy {
    /// Purely discrete strategy (no geometric targets / distance predicate).
    pub fn discrete(discrete_predicates: Vec<StatPredicate>) -> Self {
        Self { geometric_targets: Vec::new(), distance_predicate: None, discrete_predicates }
    }
    /// Geometric strategy with a distance predicate.
    pub fn geometric(geometric_targets: Vec<GeometricTarget>, distance_predicate: TraderPredicate) -> Self {
        Self { geometric_targets, distance_predicate: Some(distance_predicate), discrete_predicates: Vec::new() }
    }
}

// --------------------- encoding + instruction building ---------------------

/// Serialize the full `validate_stat_v2` instruction data:
/// 8-byte discriminator + borsh(payload) + borsh(strategy).
pub fn build_validate_stat_v2_data(
    payload: &StatValidationInput,
    strategy: &NDimensionalStrategy,
) -> Result<Vec<u8>, ProgramError> {
    let mut data = Vec::with_capacity(512);
    data.extend_from_slice(&VALIDATE_STAT_V2_DISCRIMINATOR);
    data.extend_from_slice(&borsh::to_vec(payload).map_err(|_| ProgramError::InvalidInstructionData)?);
    data.extend_from_slice(&borsh::to_vec(strategy).map_err(|_| ProgramError::InvalidInstructionData)?);
    Ok(data)
}

/// Build a ready-to-send `validate_stat_v2` [`Instruction`].
pub fn validate_stat_v2_instruction(
    txoracle_program_id: &Pubkey,
    daily_scores_merkle_roots: &Pubkey,
    payload: &StatValidationInput,
    strategy: &NDimensionalStrategy,
) -> Result<Instruction, ProgramError> {
    Ok(Instruction {
        program_id: *txoracle_program_id,
        accounts: vec![AccountMeta::new_readonly(*daily_scores_merkle_roots, false)],
        data: build_validate_stat_v2_data(payload, strategy)?,
    })
}

/// Derive the `daily_scores_roots` PDA for the given `epoch_day`.
pub fn derive_daily_scores_roots_pda(txoracle_program_id: &Pubkey, epoch_day: u16) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[DAILY_SCORES_ROOTS_SEED, &epoch_day.to_le_bytes()],
        txoracle_program_id,
    )
}

/// Compute `epoch_day` (u16) from a millisecond timestamp.
pub fn epoch_day_from_millis(ts_millis: i64) -> u16 {
    (ts_millis / MS_PER_DAY) as u16
}

// --------------------------- on-chain CPI helpers ---------------------------

fn read_verified_bool(txoracle_program_id: &Pubkey) -> Result<bool, ProgramError> {
    let (returning_program, data) = get_return_data().ok_or(ProgramError::InvalidAccountData)?;
    if &returning_program != txoracle_program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(matches!(data.first(), Some(&b) if b != 0))
}

/// CPI into `txoracle::validate_stat_v2` and return the verified boolean.
pub fn verify_stat_cpi<'a>(
    txoracle_program: &AccountInfo<'a>,
    daily_scores_merkle_roots: &AccountInfo<'a>,
    payload: &StatValidationInput,
    strategy: &NDimensionalStrategy,
) -> Result<bool, ProgramError> {
    let ix = validate_stat_v2_instruction(
        txoracle_program.key,
        daily_scores_merkle_roots.key,
        payload,
        strategy,
    )?;
    invoke(&ix, &[daily_scores_merkle_roots.clone(), txoracle_program.clone()])?;
    read_verified_bool(txoracle_program.key)
}

/// Same as [`verify_stat_cpi`], but takes pre-serialized instruction data
/// (discriminator + borsh args), e.g. produced by the companion JS client.
pub fn verify_stat_cpi_raw<'a>(
    txoracle_program: &AccountInfo<'a>,
    daily_scores_merkle_roots: &AccountInfo<'a>,
    cpi_data: Vec<u8>,
) -> Result<bool, ProgramError> {
    let ix = Instruction {
        program_id: *txoracle_program.key,
        accounts: vec![AccountMeta::new_readonly(*daily_scores_merkle_roots.key, false)],
        data: cpi_data,
    };
    invoke(&ix, &[daily_scores_merkle_roots.clone(), txoracle_program.clone()])?;
    read_verified_bool(txoracle_program.key)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_payload() -> StatValidationInput {
        StatValidationInput {
            ts: 1_752_000_000_000,
            fixture_summary: ScoresBatchSummary {
                fixture_id: 17_926_686,
                update_stats: ScoresUpdateStats { update_count: 3, min_timestamp: 1, max_timestamp: 2 },
                events_sub_tree_root: [7u8; 32],
            },
            fixture_proof: vec![ProofNode { hash: [1u8; 32], is_right_sibling: true }],
            main_tree_proof: vec![ProofNode { hash: [2u8; 32], is_right_sibling: false }],
            event_stat_root: [9u8; 32],
            stats: vec![StatLeaf {
                stat: ScoreStat { key: 1, value: 3, period: 0 },
                stat_proof: vec![ProofNode { hash: [4u8; 32], is_right_sibling: true }],
            }],
        }
    }

    #[test]
    fn discriminator_matches_anchor() {
        assert_eq!(VALIDATE_STAT_V2_DISCRIMINATOR, [208, 215, 194, 214, 241, 71, 246, 178]);
    }

    #[test]
    fn data_has_discriminator_prefix() {
        let payload = sample_payload();
        let strategy = NDimensionalStrategy::discrete(vec![
            StatPredicate::single(0, TraderPredicate::greater_than(0)),
        ]);
        let data = build_validate_stat_v2_data(&payload, &strategy).unwrap();
        assert_eq!(&data[..8], &VALIDATE_STAT_V2_DISCRIMINATOR);
        assert!(data.len() > 8);
    }

    #[test]
    fn types_roundtrip_via_borsh() {
        let payload = sample_payload();
        let bytes = borsh::to_vec(&payload).unwrap();
        assert_eq!(payload, StatValidationInput::try_from_slice(&bytes).unwrap());

        let strategy = NDimensionalStrategy::geometric(
            vec![GeometricTarget { stat_index: 0, prediction: 1 }],
            TraderPredicate::less_than(2),
        );
        let sbytes = borsh::to_vec(&strategy).unwrap();
        assert_eq!(strategy, NDimensionalStrategy::try_from_slice(&sbytes).unwrap());
    }

    #[test]
    fn enum_discriminants_match_idl_order() {
        assert_eq!(borsh::to_vec(&Comparison::GreaterThan).unwrap(), vec![0]);
        assert_eq!(borsh::to_vec(&Comparison::LessThan).unwrap(), vec![1]);
        assert_eq!(borsh::to_vec(&Comparison::EqualTo).unwrap(), vec![2]);
        assert_eq!(borsh::to_vec(&BinaryExpression::Add).unwrap(), vec![0]);
        assert_eq!(borsh::to_vec(&BinaryExpression::Subtract).unwrap(), vec![1]);
    }

    #[test]
    fn pda_is_deterministic() {
        assert_eq!(
            derive_daily_scores_roots_pda(&TXORACLE_DEVNET, 20_275),
            derive_daily_scores_roots_pda(&TXORACLE_DEVNET, 20_275),
        );
    }
}
