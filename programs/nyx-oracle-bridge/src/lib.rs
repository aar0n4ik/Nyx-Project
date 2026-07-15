use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use nyx_settlement::program::NyxSettlement;
use nyx_settlement::cpi::accounts::{CreateMarket, Resolve};
use nyx_dispute::Assertion;

declare_id!("BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk");

/// Nyx oracle bridge — the trustless adapter between dispute and settlement.
/// A market created here is owned by THIS program's PDA as its oracle, so no
/// human key can resolve it. The only way an outcome reaches settlement is via
/// `push_resolution`, which forwards the exact outcome the nyx_dispute layer
/// already finalized (assert -> challenge -> slash -> finalize).
#[program]
pub mod nyx_oracle_bridge {
    use super::*;

    /// Create a settlement market whose oracle is this bridge's PDA.
    pub fn create_bound_market(ctx: Context<CreateBoundMarket>, fixture_id: u64, market_key: [u8; 8], close_ts: i64) -> Result<()> {
        let bump = ctx.bumps.oracle_authority;
        let seeds: &[&[u8]] = &[b"oracle", &[bump]];
        let signer = &[seeds];
        nyx_settlement::cpi::create_market(
            CpiContext::new_with_signer(
                ctx.accounts.settlement_program.to_account_info(),
                CreateMarket {
                    market: ctx.accounts.market.to_account_info(),
                    authority: ctx.accounts.oracle_authority.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    vault: ctx.accounts.vault.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            fixture_id,
            market_key,
            close_ts,
        )
    }

    /// Permissionless: anyone may call, but it can only push the outcome that the
    /// dispute layer finalized. Reverts if the assertion is not RESOLVED.
    pub fn push_resolution(ctx: Context<PushResolution>) -> Result<()> {
        require!(ctx.accounts.assertion.state == nyx_dispute::STATE_RESOLVED, BridgeError::NotFinalized);
        let outcome_yes = ctx.accounts.assertion.final_outcome_yes;
        let bump = ctx.bumps.oracle_authority;
        let seeds: &[&[u8]] = &[b"oracle", &[bump]];
        let signer = &[seeds];
        nyx_settlement::cpi::resolve(
            CpiContext::new_with_signer(
                ctx.accounts.settlement_program.to_account_info(),
                Resolve {
                    market: ctx.accounts.market.to_account_info(),
                    oracle: ctx.accounts.oracle_authority.to_account_info(),
                },
                signer,
            ),
            outcome_yes,
        )
    }
}

#[derive(Accounts)]
#[instruction(fixture_id: u64, market_key: [u8; 8])]
pub struct CreateBoundMarket<'info> {
    /// CHECK: initialized by the settlement program via CPI; address bound by seeds::program.
    #[account(mut, seeds = [b"market", fixture_id.to_le_bytes().as_ref(), market_key.as_ref()], bump, seeds::program = settlement_program.key())]
    pub market: UncheckedAccount<'info>,
    /// System-owned PDA that owns market resolution rights. Must be pre-funded with SOL.
    #[account(mut, seeds = [b"oracle"], bump)]
    pub oracle_authority: SystemAccount<'info>,
    /// CHECK: SPL mint, validated inside the settlement CPI.
    pub mint: UncheckedAccount<'info>,
    /// CHECK: settlement vault PDA, initialized inside the settlement CPI.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub settlement_program: Program<'info, NyxSettlement>,
}

#[derive(Accounts)]
pub struct PushResolution<'info> {
    #[account(seeds = [b"assertion", assertion.fixture_id.to_le_bytes().as_ref(), assertion.market_key.as_ref()], bump, seeds::program = dispute_program.key())]
    pub assertion: Account<'info, Assertion>,
    /// CHECK: settlement market PDA, bound to the same fixture_id + market_key as the assertion.
    #[account(mut, seeds = [b"market", assertion.fixture_id.to_le_bytes().as_ref(), assertion.market_key.as_ref()], bump, seeds::program = settlement_program.key())]
    pub market: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"oracle"], bump)]
    pub oracle_authority: SystemAccount<'info>,
    /// CHECK: pinned to the nyx_dispute program id.
    #[account(address = nyx_dispute::ID)]
    pub dispute_program: UncheckedAccount<'info>,
    pub settlement_program: Program<'info, NyxSettlement>,
}

#[error_code]
pub enum BridgeError {
    #[msg("Assertion is not finalized (must be RESOLVED)")]
    NotFinalized,
}
