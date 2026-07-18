use anchor_lang::prelude::*;

declare_id!("NyxAgent11111111111111111111111111111111111");

#[program]
pub mod nyx_agent {
    use super::*;

    pub fn execute_agent_bet(
        ctx: Context<ExecuteAgentBet>,
        market_id: Pubkey,
        side_yes: bool,
        amount: u64,
        max_price_bps: u16,
        risk_score_bps: u16,
        cot_digest: [u8; 32],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        {
            let d = &ctx.accounts.delegation;
            require!(d.expiry == 0 || now < d.expiry, NyxAgentError::DelegationExpired);
            require!(amount <= d.remaining, NyxAgentError::CapExceeded);
            require!(risk_score_bps <= d.max_risk_bps, NyxAgentError::RiskTooHigh);
            require!(max_price_bps <= 10_000, NyxAgentError::BadPrice);
        }

        let user = ctx.accounts.delegation.user;
        let rec = &mut ctx.accounts.decision;
        rec.market = market_id;
        rec.user = user;
        rec.agent = ctx.accounts.agent.key();
        rec.cot_digest = cot_digest;
        rec.risk_score_bps = risk_score_bps;
        rec.amount = amount;
        rec.side_yes = side_yes;
        rec.ts = now;

        emit!(AgentDecision {
            market: market_id, user, agent: ctx.accounts.agent.key(),
            cot_digest, amount, side_yes, risk_score_bps,
        });

        // CPI -> nyx_settlement.place_bet_for (position owned by the USER, not the agent).
        // nyx_settlement::cpi::place_bet_for(ctx.accounts.settlement_ctx(), side_yes, amount, max_price_bps)?;

        let d = &mut ctx.accounts.delegation;
        d.remaining = d.remaining.checked_sub(amount).ok_or(NyxAgentError::CapExceeded)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ExecuteAgentBet<'info> {
    pub agent: Signer<'info>,
    #[account(mut, has_one = agent)]
    pub delegation: Account<'info, Delegation>,
    #[account(
        init_if_needed, payer = agent, space = 8 + DecisionRecord::LEN,
        seeds = [b"decision", delegation.key().as_ref(), &delegation.remaining.to_le_bytes()],
        bump
    )]
    pub decision: Account<'info, DecisionRecord>,
    pub system_program: Program<'info, System>,
    /// CHECK: nyx_settlement program wired for the CPI at integration time.
    pub settlement_program: UncheckedAccount<'info>,
}

#[account]
pub struct Delegation {
    pub user: Pubkey,
    pub agent: Pubkey,
    pub remaining: u64,
    pub max_risk_bps: u16,
    pub expiry: i64,
}

#[account]
pub struct DecisionRecord {
    pub market: Pubkey,
    pub user: Pubkey,
    pub agent: Pubkey,
    pub cot_digest: [u8; 32],
    pub risk_score_bps: u16,
    pub amount: u64,
    pub side_yes: bool,
    pub ts: i64,
}
impl DecisionRecord { pub const LEN: usize = 32 + 32 + 32 + 32 + 2 + 8 + 1 + 8; }

#[event]
pub struct AgentDecision {
    pub market: Pubkey,
    pub user: Pubkey,
    pub agent: Pubkey,
    pub cot_digest: [u8; 32],
    pub amount: u64,
    pub side_yes: bool,
    pub risk_score_bps: u16,
}

#[error_code]
pub enum NyxAgentError {
    #[msg("Delegation expired")] DelegationExpired,
    #[msg("Amount exceeds the capped allowance")] CapExceeded,
    #[msg("Risk score above the on-chain ceiling")] RiskTooHigh,
    #[msg("max_price_bps out of range")] BadPrice,
}
