use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Deployed devnet program id. Keep in sync via `anchor keys sync`.
declare_id!("EmnQbU9cHP5WWX8Q1LufdgLC7Z8vuQbZyivoK9cWo7BA");

/// Nyx optimistic dispute — an assert / challenge / slash layer on top of TxLINE.
/// TxLINE proves data is the data it committed (Merkle root); it does NOT prove
/// the data is TRUE, and there is no on-chain way to challenge a bad signer.
/// This program adds that missing layer: an outcome is PROPOSED with a bond,
/// anyone can DISPUTE it with a matching bond during a liveness window,
/// undisputed outcomes finalize automatically, and disputed ones are arbitrated
/// with the loser's bond slashed to the winner. Trust-MINIMIZED, not trust-required.
pub const STATE_PROPOSED: u8 = 0;
pub const STATE_DISPUTED: u8 = 1;
pub const STATE_RESOLVED: u8 = 2;

#[program]
pub mod nyx_dispute {
    use super::*;

    pub fn propose(ctx: Context<Propose>, fixture_id: u64, market_key: [u8; 8], outcome_yes: bool, bond: u64, liveness: i64) -> Result<()> {
        require!(bond > 0, DisputeError::ZeroBond);
        require!(liveness > 0, DisputeError::BadLiveness);
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.proposer_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.proposer.to_account_info(),
        }), bond)?;
        let now = Clock::get()?.unix_timestamp;
        let a = &mut ctx.accounts.assertion;
        a.arbiter = ctx.accounts.arbiter.key();
        a.mint = ctx.accounts.mint.key();
        a.vault = ctx.accounts.vault.key();
        a.fixture_id = fixture_id;
        a.market_key = market_key;
        a.proposer = ctx.accounts.proposer.key();
        a.disputer = Pubkey::default();
        a.proposed_outcome_yes = outcome_yes;
        a.final_outcome_yes = false;
        a.bond = bond;
        a.challenge_end_ts = now.checked_add(liveness).unwrap();
        a.state = STATE_PROPOSED;
        a.bump = ctx.bumps.assertion;
        Ok(())
    }

    pub fn dispute(ctx: Context<DisputeIx>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        {
            let a = &ctx.accounts.assertion;
            require!(a.state == STATE_PROPOSED, DisputeError::NotProposed);
            require!(now < a.challenge_end_ts, DisputeError::WindowClosed);
        }
        let bond = ctx.accounts.assertion.bond;
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.disputer_ata.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.disputer.to_account_info(),
        }), bond)?;
        let a = &mut ctx.accounts.assertion;
        a.disputer = ctx.accounts.disputer.key();
        a.state = STATE_DISPUTED;
        Ok(())
    }

    /// Undisputed outcome finalizes after the liveness window; proposer reclaims bond.
    pub fn settle_undisputed(ctx: Context<SettleUndisputed>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let (bond, fixture, mkey, bump) = {
            let a = &ctx.accounts.assertion;
            require!(a.state == STATE_PROPOSED, DisputeError::NotProposed);
            require!(now >= a.challenge_end_ts, DisputeError::WindowOpen);
            require_keys_eq!(ctx.accounts.proposer.key(), a.proposer, DisputeError::NotProposer);
            (a.bond, a.fixture_id, a.market_key, a.bump)
        };
        let fixture_bytes = fixture.to_le_bytes();
        let seeds: &[&[u8]] = &[b"assertion", fixture_bytes.as_ref(), mkey.as_ref(), &[bump]];
        let signer = &[seeds];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.proposer_ata.to_account_info(),
            authority: ctx.accounts.assertion.to_account_info(),
        }, signer), bond)?;
        let a = &mut ctx.accounts.assertion;
        a.final_outcome_yes = a.proposed_outcome_yes;
        a.state = STATE_RESOLVED;
        Ok(())
    }

    /// Disputed outcome resolved by the arbiter; loser's bond is slashed to the winner.
    pub fn arbitrate(ctx: Context<Arbitrate>, final_outcome_yes: bool) -> Result<()> {
        let (bond, fixture, mkey, bump, proposer, disputer, proposed) = {
            let a = &ctx.accounts.assertion;
            require!(a.state == STATE_DISPUTED, DisputeError::NotDisputed);
            require_keys_eq!(ctx.accounts.arbiter.key(), a.arbiter, DisputeError::NotArbiter);
            (a.bond, a.fixture_id, a.market_key, a.bump, a.proposer, a.disputer, a.proposed_outcome_yes)
        };
        // Proposer wins iff the arbitrated truth matches the original proposal.
        let winner = if final_outcome_yes == proposed { proposer } else { disputer };
        require_keys_eq!(ctx.accounts.winner_ata.owner, winner, DisputeError::WrongWinnerAta);
        let total = bond.checked_mul(2).unwrap(); // both bonds go to the winner
        let fixture_bytes = fixture.to_le_bytes();
        let seeds: &[&[u8]] = &[b"assertion", fixture_bytes.as_ref(), mkey.as_ref(), &[bump]];
        let signer = &[seeds];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.winner_ata.to_account_info(),
            authority: ctx.accounts.assertion.to_account_info(),
        }, signer), total)?;
        let a = &mut ctx.accounts.assertion;
        a.final_outcome_yes = final_outcome_yes;
        a.state = STATE_RESOLVED;
        Ok(())
    }
}

#[account]
pub struct Assertion {
    pub arbiter: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub proposer: Pubkey,
    pub disputer: Pubkey,
    pub fixture_id: u64,
    pub market_key: [u8; 8],
    pub proposed_outcome_yes: bool,
    pub final_outcome_yes: bool,
    pub bond: u64,
    pub challenge_end_ts: i64,
    pub state: u8,
    pub bump: u8,
}
impl Assertion { pub const LEN: usize = 32 * 5 + 8 + 8 + 1 + 1 + 8 + 8 + 1 + 1; }

#[derive(Accounts)]
#[instruction(fixture_id: u64, market_key: [u8; 8])]
pub struct Propose<'info> {
    #[account(init, payer = proposer, space = 8 + Assertion::LEN,
        seeds = [b"assertion", fixture_id.to_le_bytes().as_ref(), market_key.as_ref()], bump)]
    pub assertion: Account<'info, Assertion>,
    #[account(init, payer = proposer, token::mint = mint, token::authority = assertion,
        seeds = [b"dispute_vault", assertion.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub proposer: Signer<'info>,
    #[account(mut)] pub proposer_ata: Account<'info, TokenAccount>,
    /// CHECK: SPL mint of the USD₮ bond token
    pub mint: AccountInfo<'info>,
    /// CHECK: arbiter authority allowed to resolve disputes (e.g. a DAO multisig)
    pub arbiter: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DisputeIx<'info> {
    #[account(mut)] pub assertion: Account<'info, Assertion>,
    #[account(mut, address = assertion.vault)] pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub disputer: Signer<'info>,
    #[account(mut)] pub disputer_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleUndisputed<'info> {
    #[account(mut)] pub assertion: Account<'info, Assertion>,
    #[account(mut, address = assertion.vault)] pub vault: Account<'info, TokenAccount>,
    #[account(mut)] pub proposer: Signer<'info>,
    #[account(mut)] pub proposer_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Arbitrate<'info> {
    #[account(mut)] pub assertion: Account<'info, Assertion>,
    #[account(mut, address = assertion.vault)] pub vault: Account<'info, TokenAccount>,
    pub arbiter: Signer<'info>,
    #[account(mut)] pub winner_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum DisputeError {
    #[msg("Bond must be greater than zero")] ZeroBond,
    #[msg("Liveness must be positive")] BadLiveness,
    #[msg("Assertion is not in the proposed state")] NotProposed,
    #[msg("Assertion is not disputed")] NotDisputed,
    #[msg("Challenge window has closed")] WindowClosed,
    #[msg("Challenge window is still open")] WindowOpen,
    #[msg("Only the proposer may settle an undisputed assertion")] NotProposer,
    #[msg("Only the arbiter may resolve a dispute")] NotArbiter,
    #[msg("Winner ATA owner does not match the computed winner")] WrongWinnerAta,
}
