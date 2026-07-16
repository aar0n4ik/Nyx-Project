use anchor_lang::prelude::*;

declare_id!("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");

#[program]
pub mod lop {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        oracle: Pubkey,
        kappa_bps: u16,
        initial_price_bps: u16,
    ) -> Result<()> {
        require!(kappa_bps <= 10_000 && initial_price_bps <= 10_000, LopError::OutOfRange);
        let m = &mut ctx.accounts.market;
        m.authority = ctx.accounts.authority.key();
        m.oracle = oracle;
        m.kappa_bps = kappa_bps;
        m.market_price_bps = initial_price_bps;
        m.oracle_prob_bps = initial_price_bps;
        m.time_fraction_bps = 0;
        m.decided = false;
        m.terminal_yes = false;
        m.cum_funding_bps = 0;
        Ok(())
    }

    // Oracle (TxLINE keeper) pushes the live probability and match phase.
    pub fn push_oracle(
        ctx: Context<PushOracle>,
        oracle_prob_bps: u16,
        time_fraction_bps: u16,
    ) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require!(!m.decided, LopError::MarketDecided);
        require_keys_eq!(ctx.accounts.oracle.key(), m.oracle, LopError::Unauthorized);
        require!(oracle_prob_bps <= 10_000 && time_fraction_bps <= 10_000, LopError::OutOfRange);
        m.oracle_prob_bps = oracle_prob_bps;
        m.time_fraction_bps = time_fraction_bps;
        Ok(())
    }

    // CORE: funding = settlement. Permissionless crank.
    // If decided => target=0/1, rate=100% => this is the final payout.
    pub fn apply_funding(ctx: Context<ApplyFunding>) -> Result<()> {
        let m = &mut ctx.accounts.market;
        let (target, rate_bps): (i64, i64) = if m.decided {
            (if m.terminal_yes { 10_000 } else { 0 }, 10_000)
        } else {
            (m.oracle_prob_bps as i64, m.kappa_bps as i64)
        };
        let mkt = m.market_price_bps as i64;
        let transfer = (target - mkt) * rate_bps / 10_000;
        m.cum_funding_bps = m.cum_funding_bps.checked_add(transfer).unwrap();
        m.market_price_bps = (mkt + transfer).clamp(0, 10_000) as u16;
        emit!(FundingApplied {
            market: m.key(),
            target,
            transfer,
            new_price_bps: m.market_price_bps,
            settlement: m.decided,
        });
        Ok(())
    }

    // Lock the outcome. Settlement happens on the next apply_funding.
    pub fn settle(ctx: Context<Settle>, terminal_yes: bool) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require_keys_eq!(ctx.accounts.oracle.key(), m.oracle, LopError::Unauthorized);
        m.decided = true;
        m.terminal_yes = terminal_yes;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub oracle: Pubkey,
    pub oracle_prob_bps: u16,
    pub time_fraction_bps: u16,
    pub market_price_bps: u16,
    pub kappa_bps: u16,
    pub decided: bool,
    pub terminal_yes: bool,
    pub cum_funding_bps: i64,
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(init, payer = authority, space = 8 + Market::INIT_SPACE)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PushOracle<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApplyFunding<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub oracle: Signer<'info>,
}

#[event]
pub struct FundingApplied {
    pub market: Pubkey,
    pub target: i64,
    pub transfer: i64,
    pub new_price_bps: u16,
    pub settlement: bool,
}

#[error_code]
pub enum LopError {
    #[msg("Market already decided")]
    MarketDecided,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Value out of range")]
    OutOfRange,
}
