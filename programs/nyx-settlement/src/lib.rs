use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
declare_id!("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3");
/// Nyx settlement program — parimutuel, oracle-settled markets. Real escrow, no house risk.
#[program]
pub mod nyx_settlement {
    use super::*;
    pub fn create_market(ctx: Context<CreateMarket>, fixture_id: u64, market_key: [u8; 8], close_ts: i64) -> Result<()> {
        let m = &mut ctx.accounts.market;
        m.authority = ctx.accounts.authority.key(); m.oracle = ctx.accounts.authority.key();
        m.vault = ctx.accounts.vault.key(); m.mint = ctx.accounts.mint.key();
        m.fixture_id = fixture_id; m.market_key = market_key; m.close_ts = close_ts;
        m.pool_yes = 0; m.pool_no = 0; m.resolved = false; m.outcome_yes = false; m.bump = ctx.bumps.market;
        Ok(())
    }
    pub fn place_bet(ctx: Context<PlaceBet>, side_yes: bool, amount: u64) -> Result<()> {
        require!(amount > 0, NyxError::ZeroAmount);
        let now = Clock::get()?.unix_timestamp;
        require!(now < ctx.accounts.market.close_ts, NyxError::MarketClosed);
        require!(!ctx.accounts.market.resolved, NyxError::AlreadyResolved);
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.bettor_ata.to_account_info(), to: ctx.accounts.vault.to_account_info(), authority: ctx.accounts.bettor.to_account_info() }), amount)?;
        let m = &mut ctx.accounts.market;
        if side_yes { m.pool_yes = m.pool_yes.checked_add(amount).unwrap(); } else { m.pool_no = m.pool_no.checked_add(amount).unwrap(); }
        let pos = &mut ctx.accounts.position;
        pos.market = m.key(); pos.owner = ctx.accounts.bettor.key(); pos.side_yes = side_yes;
        pos.amount = pos.amount.checked_add(amount).unwrap(); pos.claimed = false; pos.bump = ctx.bumps.position;
        Ok(())
    }
    pub fn resolve(ctx: Context<Resolve>, outcome_yes: bool) -> Result<()> {
        let m = &mut ctx.accounts.market;
        require_keys_eq!(ctx.accounts.oracle.key(), m.oracle, NyxError::NotOracle);
        require!(!m.resolved, NyxError::AlreadyResolved);
        m.resolved = true; m.outcome_yes = outcome_yes; Ok(())
    }
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let m = &ctx.accounts.market;
        require!(m.resolved, NyxError::NotResolved);
        let pos = &mut ctx.accounts.position;
        require!(!pos.claimed, NyxError::AlreadyClaimed);
        require_keys_eq!(pos.owner, ctx.accounts.owner.key(), NyxError::NotOwner);
        require!(pos.side_yes == m.outcome_yes, NyxError::LosingPosition);
        let win_pool = if m.outcome_yes { m.pool_yes } else { m.pool_no };
        let lose_pool = if m.outcome_yes { m.pool_no } else { m.pool_yes };
        require!(win_pool > 0, NyxError::EmptyPool);
        let share = (pos.amount as u128).checked_mul(lose_pool as u128).unwrap().checked_div(win_pool as u128).unwrap() as u64;
        let payout = pos.amount.checked_add(share).unwrap();
        let fixture = m.fixture_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"market", fixture.as_ref(), m.market_key.as_ref(), &[m.bump]];
        let signer = &[seeds];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.owner_ata.to_account_info(), authority: ctx.accounts.market.to_account_info() }, signer), payout)?;
        pos.claimed = true; Ok(())
    }
}
#[account]
pub struct Market { pub authority: Pubkey, pub oracle: Pubkey, pub vault: Pubkey, pub mint: Pubkey, pub fixture_id: u64, pub market_key: [u8; 8], pub close_ts: i64, pub pool_yes: u64, pub pool_no: u64, pub resolved: bool, pub outcome_yes: bool, pub bump: u8 }
impl Market { pub const LEN: usize = 32 * 4 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1; }
#[account]
pub struct Position { pub market: Pubkey, pub owner: Pubkey, pub side_yes: bool, pub amount: u64, pub claimed: bool, pub bump: u8 }
impl Position { pub const LEN: usize = 32 + 32 + 1 + 8 + 1 + 1; }
#[derive(Accounts)]
#[instruction(fixture_id: u64, market_key: [u8; 8])]
pub struct CreateMarket<'info> {
    #[account(init, payer = authority, space = 8 + Market::LEN, seeds = [b"market", fixture_id.to_le_bytes().as_ref(), market_key.as_ref()], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)] pub authority: Signer<'info>,
    /// CHECK: SPL mint of the USD₮ token
    pub mint: AccountInfo<'info>,
    #[account(init, payer = authority, token::mint = mint, token::authority = market, seeds = [b"vault", market.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>, pub system_program: Program<'info, System>, pub rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)] pub market: Account<'info, Market>,
    #[account(init_if_needed, payer = bettor, space = 8 + Position::LEN, seeds = [b"pos", market.key().as_ref(), bettor.key().as_ref()], bump)]
    pub position: Account<'info, Position>,
    #[account(mut)] pub bettor: Signer<'info>,
    #[account(mut)] pub bettor_ata: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault)] pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>, pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Resolve<'info> { #[account(mut)] pub market: Account<'info, Market>, pub oracle: Signer<'info> }
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)] pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"pos", market.key().as_ref(), owner.key().as_ref()], bump = position.bump)]
    pub position: Account<'info, Position>,
    #[account(mut)] pub owner: Signer<'info>,
    #[account(mut)] pub owner_ata: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault)] pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
#[error_code]
pub enum NyxError {
    #[msg("Amount must be greater than zero")] ZeroAmount,
    #[msg("Market is closed for betting")] MarketClosed,
    #[msg("Market already resolved")] AlreadyResolved,
    #[msg("Market is not resolved yet")] NotResolved,
    #[msg("Only the oracle authority may resolve")] NotOracle,
    #[msg("Position already claimed")] AlreadyClaimed,
    #[msg("Not the position owner")] NotOwner,
    #[msg("Losing position cannot claim")] LosingPosition,
    #[msg("Winning pool is empty")] EmptyPool,
}
