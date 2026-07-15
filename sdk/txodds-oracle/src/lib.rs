//! # nyx-txodds-oracle (unofficial)
//!
//! Rust building blocks for the **Nyx** trust-minimized settlement stack on
//! **Solana**: program IDs, Anchor discriminators, PDA derivation, borsh account
//! decoders, instruction-data builders, and an on-chain CPI helper to push a
//! dispute-finalized outcome into settlement. No Anchor dependency — just
//! `solana-program` + `borsh`.
//!
//! > **Unofficial / community project.** Not affiliated with or endorsed by
//! > TxODDS or Tether. "TxODDS", "TxLINE" and "USD₮" are trademarks of their
//! > respective owners; used here only to describe compatibility.
//!
//! ## Why this exists
//! TxLINE proves a feed is internally consistent (a Merkle root), not that an
//! outcome is *true*, and gives no on-chain way to challenge a bad signer. Built
//! naively, every market keeps an admin key that can call `resolve()`. This crate
//! is the Rust side of removing that key: a market's oracle is a program PDA, and
//! an outcome reaches settlement only after `propose -> dispute -> arbitrate` via
//! `push_resolution`, which forwards exactly the finalized result.

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    instruction::{AccountMeta, Instruction},
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};

// ------------------------------- program ids -------------------------------

/// `nyx_settlement` program id (devnet).
pub const SETTLEMENT_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3");
/// `nyx_dispute` program id (devnet).
pub const DISPUTE_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN");
/// `nyx_oracle_bridge` program id (devnet).
pub const ORACLE_BRIDGE_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk");
/// SPL Token program id.
pub const TOKEN_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// Assertion lifecycle states (mirrors `nyx_dispute`).
pub const STATE_PROPOSED: u8 = 0;
pub const STATE_DISPUTED: u8 = 1;
pub const STATE_RESOLVED: u8 = 2;

// ------------------------------ discriminators -----------------------------

fn sighash(namespace: &str, name: &str) -> [u8; 8] {
    let pre = format!("{namespace}:{name}");
    let full = solana_program::hash::hash(pre.as_bytes()).to_bytes();
    let mut out = [0u8; 8];
    out.copy_from_slice(&full[..8]);
    out
}

/// Anchor instruction discriminator = sha256("global:<name>")[..8].
pub fn ix_disc(name: &str) -> [u8; 8] {
    sighash("global", name)
}

/// Anchor account discriminator = sha256("account:<Name>")[..8].
pub fn account_disc(name: &str) -> [u8; 8] {
    sighash("account", name)
}

// ------------------------------ account decoders ---------------------------

/// `nyx_settlement` Market account (fields after the 8-byte discriminator).
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct Market {
    pub authority: [u8; 32],
    pub oracle: [u8; 32],
    pub vault: [u8; 32],
    pub mint: [u8; 32],
    pub fixture_id: u64,
    pub market_key: [u8; 8],
    pub close_ts: i64,
    pub pool_yes: u64,
    pub pool_no: u64,
    pub resolved: bool,
    pub outcome_yes: bool,
    pub bump: u8,
}

/// `nyx_dispute` Assertion account (fields after the 8-byte discriminator).
#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub struct Assertion {
    pub arbiter: [u8; 32],
    pub mint: [u8; 32],
    pub vault: [u8; 32],
    pub proposer: [u8; 32],
    pub disputer: [u8; 32],
    pub fixture_id: u64,
    pub market_key: [u8; 8],
    pub proposed_outcome_yes: bool,
    pub final_outcome_yes: bool,
    pub bond: u64,
    pub challenge_end_ts: i64,
    pub state: u8,
    pub bump: u8,
}

/// Decode a Market account, skipping its 8-byte discriminator.
pub fn decode_market(account_data: &[u8]) -> Result<Market, ProgramError> {
    let body = account_data.get(8..).ok_or(ProgramError::InvalidAccountData)?;
    Market::try_from_slice(body).map_err(|_| ProgramError::InvalidAccountData)
}

/// Decode an Assertion account, skipping its 8-byte discriminator.
pub fn decode_assertion(account_data: &[u8]) -> Result<Assertion, ProgramError> {
    let body = account_data.get(8..).ok_or(ProgramError::InvalidAccountData)?;
    Assertion::try_from_slice(body).map_err(|_| ProgramError::InvalidAccountData)
}

// --------------------------- instruction data ------------------------------

fn with_disc(name: &str) -> Vec<u8> {
    ix_disc(name).to_vec()
}

/// `nyx_settlement::create_market(fixture_id, market_key, close_ts)`.
pub fn create_market_data(fixture_id: u64, market_key: &[u8; 8], close_ts: i64) -> Vec<u8> {
    let mut d = with_disc("create_market");
    d.extend_from_slice(&fixture_id.to_le_bytes());
    d.extend_from_slice(market_key);
    d.extend_from_slice(&close_ts.to_le_bytes());
    d
}

/// `nyx_settlement::place_bet(side_yes, amount)`.
pub fn place_bet_data(side_yes: bool, amount: u64) -> Vec<u8> {
    let mut d = with_disc("place_bet");
    d.push(side_yes as u8);
    d.extend_from_slice(&amount.to_le_bytes());
    d
}

/// `nyx_settlement::claim()`.
pub fn claim_data() -> Vec<u8> {
    with_disc("claim")
}

/// `nyx_settlement::resolve(outcome_yes)`.
pub fn resolve_data(outcome_yes: bool) -> Vec<u8> {
    let mut d = with_disc("resolve");
    d.push(outcome_yes as u8);
    d
}

/// `nyx_dispute::propose(fixture_id, market_key, outcome_yes, bond, liveness)`.
pub fn propose_data(
    fixture_id: u64,
    market_key: &[u8; 8],
    outcome_yes: bool,
    bond: u64,
    liveness: i64,
) -> Vec<u8> {
    let mut d = with_disc("propose");
    d.extend_from_slice(&fixture_id.to_le_bytes());
    d.extend_from_slice(market_key);
    d.push(outcome_yes as u8);
    d.extend_from_slice(&bond.to_le_bytes());
    d.extend_from_slice(&liveness.to_le_bytes());
    d
}

/// `nyx_dispute::dispute()`.
pub fn dispute_data() -> Vec<u8> {
    with_disc("dispute")
}

/// `nyx_dispute::settle_undisputed()`.
pub fn settle_undisputed_data() -> Vec<u8> {
    with_disc("settle_undisputed")
}

/// `nyx_dispute::arbitrate(final_outcome_yes)`.
pub fn arbitrate_data(final_outcome_yes: bool) -> Vec<u8> {
    let mut d = with_disc("arbitrate");
    d.push(final_outcome_yes as u8);
    d
}

/// `nyx_oracle_bridge::create_bound_market(fixture_id, market_key, close_ts)`.
pub fn create_bound_market_data(fixture_id: u64, market_key: &[u8; 8], close_ts: i64) -> Vec<u8> {
    let mut d = with_disc("create_bound_market");
    d.extend_from_slice(&fixture_id.to_le_bytes());
    d.extend_from_slice(market_key);
    d.extend_from_slice(&close_ts.to_le_bytes());
    d
}

/// `nyx_oracle_bridge::push_resolution()`.
pub fn push_resolution_data() -> Vec<u8> {
    with_disc("push_resolution")
}

// -------------------------------- PDAs -------------------------------------

/// Market PDA: `["market", fixture_id_le, market_key]` under settlement.
pub fn market_pda(fixture_id: u64, market_key: &[u8; 8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[&b"market"[..], &fixture_id.to_le_bytes()[..], &market_key[..]],
        &SETTLEMENT_PROGRAM_ID,
    )
}

/// Vault PDA: `["vault", market]` under settlement.
pub fn vault_pda(market: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&b"vault"[..], market.as_ref()], &SETTLEMENT_PROGRAM_ID)
}

/// Position PDA: `["pos", market, owner]` under settlement.
pub fn position_pda(market: &Pubkey, owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[&b"pos"[..], market.as_ref(), owner.as_ref()],
        &SETTLEMENT_PROGRAM_ID,
    )
}

/// Assertion PDA: `["assertion", fixture_id_le, market_key]` under dispute.
pub fn assertion_pda(fixture_id: u64, market_key: &[u8; 8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[&b"assertion"[..], &fixture_id.to_le_bytes()[..], &market_key[..]],
        &DISPUTE_PROGRAM_ID,
    )
}

/// Dispute vault PDA: `["dispute_vault", assertion]` under dispute.
pub fn dispute_vault_pda(assertion: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[&b"dispute_vault"[..], assertion.as_ref()],
        &DISPUTE_PROGRAM_ID,
    )
}

/// Oracle PDA: `["oracle"]` under the bridge (the market's non-human oracle).
pub fn oracle_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&b"oracle"[..]], &ORACLE_BRIDGE_PROGRAM_ID)
}

// --------------------------- bridge CPI helper -----------------------------

/// Build the `nyx_oracle_bridge::push_resolution` instruction.
///
/// Accounts: assertion (ro), market (w), oracle (w), dispute_program (ro),
/// settlement_program (ro). It forwards *only* the outcome the dispute layer
/// already finalized; anything else reverts on-chain.
pub fn push_resolution_instruction(assertion: &Pubkey, market: &Pubkey, oracle: &Pubkey) -> Instruction {
    Instruction {
        program_id: ORACLE_BRIDGE_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new_readonly(*assertion, false),
            AccountMeta::new(*market, false),
            AccountMeta::new(*oracle, false),
            AccountMeta::new_readonly(DISPUTE_PROGRAM_ID, false),
            AccountMeta::new_readonly(SETTLEMENT_PROGRAM_ID, false),
        ],
        data: push_resolution_data(),
    }
}

/// CPI into `nyx_oracle_bridge::push_resolution` from your own program.
pub fn push_resolution_cpi<'a>(
    bridge_program: &AccountInfo<'a>,
    assertion: &AccountInfo<'a>,
    market: &AccountInfo<'a>,
    oracle: &AccountInfo<'a>,
    dispute_program: &AccountInfo<'a>,
    settlement_program: &AccountInfo<'a>,
) -> Result<(), ProgramError> {
    let ix = push_resolution_instruction(assertion.key, market.key, oracle.key);
    invoke(
        &ix,
        &[
            assertion.clone(),
            market.clone(),
            oracle.clone(),
            dispute_program.clone(),
            settlement_program.clone(),
            bridge_program.clone(),
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIX: u64 = 2001;
    const MK: [u8; 8] = [3, 0, 0, 0, 0, 0, 0, 0];

    #[test]
    fn discriminators_are_distinct_and_stable() {
        assert_eq!(ix_disc("place_bet").len(), 8);
        assert_ne!(ix_disc("create_market"), ix_disc("place_bet"));
        assert_ne!(ix_disc("resolve"), account_disc("Market"));
        assert_eq!(ix_disc("push_resolution"), ix_disc("push_resolution"));
    }

    #[test]
    fn instruction_data_layout_matches_programs() {
        let bet = place_bet_data(true, 10_000_000);
        assert_eq!(bet.len(), 17); // 8 disc + 1 side + 8 amount
        assert_eq!(bet[8], 1);
        assert_eq!(&bet[..8], &ix_disc("place_bet")[..]);

        let prop = propose_data(FIX, &MK, false, 10_000_000, 3600);
        assert_eq!(prop.len(), 41); // 8 + 8 + 8 + 1 + 8 + 8
        assert_eq!(prop[24], 0); // outcome_yes = false

        assert_eq!(claim_data().len(), 8);
        assert_eq!(push_resolution_data().len(), 8);
    }

    #[test]
    fn pdas_are_deterministic() {
        let (m, _) = market_pda(FIX, &MK);
        assert_eq!(market_pda(FIX, &MK).0, m);
        assert_eq!(vault_pda(&m).0, vault_pda(&m).0);
        assert_eq!(oracle_pda().0, oracle_pda().0);
    }

    #[test]
    fn market_layout_roundtrips_and_sizes() {
        let mkt = Market {
            authority: [1u8; 32],
            oracle: oracle_pda().0.to_bytes(),
            vault: [2u8; 32],
            mint: [3u8; 32],
            fixture_id: FIX,
            market_key: MK,
            close_ts: 1_800_000_000,
            pool_yes: 10_000_000,
            pool_no: 5_000_000,
            resolved: true,
            outcome_yes: true,
            bump: 254,
        };
        let bytes = borsh::to_vec(&mkt).unwrap();
        assert_eq!(bytes.len(), 171); // account size on-chain = 8 + 171 = 179
        let mut acct = account_disc("Market").to_vec();
        acct.extend_from_slice(&bytes);
        assert_eq!(acct.len(), 179);
        assert_eq!(decode_market(&acct).unwrap(), mkt);
    }

    #[test]
    fn assertion_layout_roundtrips_and_sizes() {
        let a = Assertion {
            arbiter: [9u8; 32],
            mint: [3u8; 32],
            vault: [2u8; 32],
            proposer: [4u8; 32],
            disputer: [5u8; 32],
            fixture_id: FIX,
            market_key: MK,
            proposed_outcome_yes: false,
            final_outcome_yes: true,
            bond: 10_000_000,
            challenge_end_ts: 1_800_003_600,
            state: STATE_RESOLVED,
            bump: 253,
        };
        let bytes = borsh::to_vec(&a).unwrap();
        assert_eq!(bytes.len(), 196); // account size on-chain = 8 + 196 = 204
        let mut acct = account_disc("Assertion").to_vec();
        acct.extend_from_slice(&bytes);
        let back = decode_assertion(&acct).unwrap();
        assert_eq!(back, a);
        assert_eq!(back.state, STATE_RESOLVED);
    }
}
