//! nyx-pamm — a live-probability AMM (recentred LMSR) that settles itself.
//! Pure market math lives in the `pamm-math` crate; this program is the thin,
//! audited on-chain layer that moves real USD₮ and enforces the rules.
//!
//! NOTE: fixed-point values are stored as `[u8; 16]` (little-endian i128) — NOT
//! as `i128` — because the pinned build toolchain miscompiles borsh (de)ser of
//! i128 in account structs / ix args (leaks a heap pointer into the next field).
//! All math still runs on real i128 via dec()/enc() below.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use pamm_math::pool::{Pool, MAX_OUTCOMES};

declare_id!("8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3");

/// fixed-point (9 decimals) -> USD₮ base units (6 decimals)
const FX_PER_TOKEN: i128 = 1_000;
fn fx_to_token(fx: i128) -> u64 {
    if fx <= 0 { 0 } else { (fx / FX_PER_TOKEN) as u64 }
}

/// borsh-safe fixed-point <-> i128 (never expose i128 to the derive layer)
#[inline]
fn dec(b: [u8; 16]) -> i128 { i128::from_le_bytes(b) }
#[inline]
fn enc(v: i128) -> [u8; 16] { v.to_le_bytes() }

fn load(p: &EventPool) -> Pool {
    let mut q = [0i128; MAX_OUTCOMES];
    let mut theta = [0i128; MAX_OUTCOMES];
    for i in 0..MAX_OUTCOMES {
        q[i] = dec(p.q[i]);
        theta[i] = dec(p.theta[i]);
    }
    Pool { n: p.n as usize, b: dec(p.b), q, theta, resolved: p.resolved, winner: p.winner as usize }
}
fn store(p: &mut EventPool, m: &Pool) {
    for i in 0..MAX_OUTCOMES {
        p.q[i] = enc(m.q[i]);
        p.theta[i] = enc(m.theta[i]);
    }
    p.resolved = m.resolved;
    p.winner = m.winner as u8;
}

#[program]
pub mod nyx_pamm {
    use super::*;

    /// Create a market and pre-fund the maker's *maximum possible loss* (b·ln n).
    /// After this, the pool can never become insolvent — proven in pamm-math.
    pub fn init_pool(ctx: Context<InitPool>, event_id: u64, n: u8, b: [u8; 16]) -> Result<()> {
        let b_val = dec(b);
        require!(n as usize >= 2 && n as usize <= MAX_OUTCOMES, PammError::BadOutcomes);
        require!(b_val > 0, PammError::BadLiquidity);

        let subsidy_fx = pamm_math::max_subsidy(n as usize, b_val);
        let amount = fx_to_token(subsidy_fx);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            amount,
        )?;

        let p = &mut ctx.accounts.pool;
        p.event_id = event_id;
        p.n = n;
        p.b = b;
        p.q = [[0u8; 16]; MAX_OUTCOMES];
        p.theta = [[0u8; 16]; MAX_OUTCOMES];
        p.resolved = false;
        p.winner = 0;
        p.keeper = ctx.accounts.creator.key();
        p.usdt_mint = ctx.accounts.usdt_mint.key();
        p.vault = ctx.accounts.vault.key();
        p.collateral = amount;
        p.bump = ctx.bumps.pool;
        Ok(())
    }

    /// Keeper (the Nyx agent) pushes the live oracle recentring vector each tick.
    pub fn push_oracle(ctx: Context<KeeperOnly>, theta: Vec<[u8; 16]>) -> Result<()> {
        let p = &mut ctx.accounts.pool;
        require_keys_eq!(p.keeper, ctx.accounts.keeper.key(), PammError::NotKeeper);
        require!(!p.resolved, PammError::AlreadyResolved);
        require!(theta.len() == p.n as usize, PammError::BadOutcomes);
        for i in 0..p.n as usize { p.theta[i] = theta[i]; }
        Ok(())
    }

    /// Back an outcome. Pays USD₮ = LMSR marginal cost into the vault.
    pub fn buy(ctx: Context<Trade>, outcome: u8, shares: [u8; 16], max_cost: u64) -> Result<()> {
        let shares = dec(shares);
        let p = &mut ctx.accounts.pool;
        require!(!p.resolved, PammError::AlreadyResolved);
        require!((outcome as usize) < p.n as usize && shares > 0, PammError::BadOutcomes);

        let mut m = load(p);
        let cost_fx = m.buy(outcome as usize, shares);
        store(p, &m);

        let amount = fx_to_token(cost_fx);
        require!(amount <= max_cost, PammError::Slippage);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;
        p.collateral = p.collateral.saturating_add(amount);

        let pos = &mut ctx.accounts.position;
        pos.pool = p.key();
        pos.owner = ctx.accounts.user.key();
        pos.outcome = outcome;
        pos.shares = enc(dec(pos.shares) + shares);
        pos.bump = ctx.bumps.position;
        Ok(())
    }

    /// Cash out any time before settlement. Returns USD₮ = LMSR refund.
    pub fn sell(ctx: Context<Trade>, outcome: u8, shares: [u8; 16], min_return: u64) -> Result<()> {
        let shares = dec(shares);
        let p = &mut ctx.accounts.pool;
        require!(!p.resolved, PammError::AlreadyResolved);
        {
            let pos = &ctx.accounts.position;
            require!(dec(pos.shares) >= shares && shares > 0, PammError::InsufficientShares);
        }

        let mut m = load(p);
        let ret_fx = m.sell(outcome as usize, shares);
        store(p, &m);

        let amount = fx_to_token(ret_fx);
        require!(amount >= min_return, PammError::Slippage);

        let event_id = p.event_id.to_le_bytes();
        let bump = [p.bump];
        let seeds: &[&[u8]] = &[b"pool", &event_id, &bump];
        let signer: &[&[&[u8]]] = &[seeds];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: p.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
        p.collateral = p.collateral.saturating_sub(amount);
        let pos = &mut ctx.accounts.position;
        pos.shares = enc(dec(pos.shares) - shares);
        Ok(())
    }

    /// Freeze the curve on a decided outcome (the GUARANTEED detector fires this).
    pub fn resolve(ctx: Context<KeeperOnly>, winner: u8) -> Result<()> {
        let p = &mut ctx.accounts.pool;
        require_keys_eq!(p.keeper, ctx.accounts.keeper.key(), PammError::NotKeeper);
        require!(!p.resolved, PammError::AlreadyResolved);
        require!((winner as usize) < p.n as usize, PammError::BadOutcomes);
        p.resolved = true;
        p.winner = winner;
        Ok(())
    }

    /// Winning shares redeem 1 USD₮ each.
    pub fn claim(ctx: Context<Trade>, outcome: u8) -> Result<()> {
        let p = &mut ctx.accounts.pool;
        require!(p.resolved, PammError::NotResolved);

        let shares = dec(ctx.accounts.position.shares);
        require!(shares > 0, PammError::InsufficientShares);

        let payout_fx = if outcome == p.winner { shares } else { 0 };
        let amount = fx_to_token(payout_fx);

        if amount > 0 {
            let event_id = p.event_id.to_le_bytes();
            let bump = [p.bump];
            let seeds: &[&[u8]] = &[b"pool", &event_id, &bump];
            let signer: &[&[&[u8]]] = &[seeds];
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.user_ata.to_account_info(),
                        authority: p.to_account_info(),
                    },
                    signer,
                ),
                amount,
            )?;
            p.collateral = p.collateral.saturating_sub(amount);
        }
        ctx.accounts.position.shares = [0u8; 16];
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct InitPool<'info> {
    #[account(init, payer = creator, space = EventPool::LEN,
        seeds = [b"pool", event_id.to_le_bytes().as_ref()], bump)]
    pub pool: Account<'info, EventPool>,
    #[account(init, payer = creator,
        seeds = [b"vault", pool.key().as_ref()], bump,
        token::mint = usdt_mint, token::authority = pool)]
    pub vault: Account<'info, TokenAccount>,
    pub usdt_mint: Account<'info, Mint>,
    #[account(mut, constraint = creator_ata.mint == usdt_mint.key())]
    pub creator_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct KeeperOnly<'info> {
    #[account(mut, seeds = [b"pool", pool.event_id.to_le_bytes().as_ref()], bump = pool.bump)]
    pub pool: Account<'info, EventPool>,
    pub keeper: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(outcome: u8)]
pub struct Trade<'info> {
    #[account(mut, seeds = [b"pool", pool.event_id.to_le_bytes().as_ref()], bump = pool.bump)]
    pub pool: Account<'info, EventPool>,
    #[account(mut, address = pool.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = user, space = Position::LEN,
        seeds = [b"pos", pool.key().as_ref(), user.key().as_ref(), &[outcome]], bump)]
    pub position: Account<'info, Position>,
    #[account(mut, constraint = user_ata.mint == pool.usdt_mint)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EventPool {
    pub event_id: u64,
    pub n: u8,
    pub b: [u8; 16],
    pub q: [[u8; 16]; MAX_OUTCOMES],
    pub theta: [[u8; 16]; MAX_OUTCOMES],
    pub resolved: bool,
    pub winner: u8,
    pub keeper: Pubkey,
    pub usdt_mint: Pubkey,
    pub vault: Pubkey,
    pub collateral: u64,
    pub bump: u8,
}
impl EventPool {
    pub const LEN: usize = 8 + 8 + 1 + 16 + 16 * MAX_OUTCOMES + 16 * MAX_OUTCOMES + 1 + 1 + 32 + 32 + 32 + 8 + 1;
}

#[account]
pub struct Position {
    pub pool: Pubkey,
    pub owner: Pubkey,
    pub outcome: u8,
    pub shares: [u8; 16],
    pub bump: u8,
}
impl Position {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 16 + 1;
}

#[error_code]
pub enum PammError {
    #[msg("outcome count/index invalid")] BadOutcomes,
    #[msg("liquidity b must be > 0")] BadLiquidity,
    #[msg("caller is not the keeper")] NotKeeper,
    #[msg("market already resolved")] AlreadyResolved,
    #[msg("market not resolved yet")] NotResolved,
    #[msg("slippage limit exceeded")] Slippage,
    #[msg("not enough shares")] InsufficientShares,
}
