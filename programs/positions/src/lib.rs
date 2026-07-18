use anchor_lang::prelude::*;

declare_id!("Ff7WZq4FcmsyVkD2hjjSxTKMkBzzNmM1cu5ZFQsHoCQB");

#[program]
pub mod positions {
    use super::*;

    pub fn open_position(ctx: Context<OpenPosition>, side: u8, notional: u64) -> Result<()> {
        require!(side <= 1, PosErr::BadSide);
        let data = ctx.accounts.market.try_borrow_data()?;
        require!(data.len() >= 82, PosErr::BadMarket);
        let price = u16::from_le_bytes([data[76], data[77]]);
        let decided = data[80] != 0;
        require!(!decided, PosErr::AlreadyDecided);
        drop(data);
        let p = &mut ctx.accounts.position;
        p.owner = ctx.accounts.user.key();
        p.market = ctx.accounts.market.key();
        p.side = side;
        p.notional = notional;
        p.entry_price_bps = price;
        p.settled = false;
        p.pnl_bps = 0;
        p.bump = ctx.bumps.position;
        emit!(Opened { owner: p.owner, market: p.market, side, entry_price_bps: price, notional });
        Ok(())
    }

    pub fn settle_position(ctx: Context<SettlePosition>) -> Result<()> {
        let data = ctx.accounts.market.try_borrow_data()?;
        require!(data.len() >= 82, PosErr::BadMarket);
        let decided = data[80] != 0;
        let terminal_yes = data[81] != 0;
        require!(decided, PosErr::NotDecided);
        drop(data);
        let p = &mut ctx.accounts.position;
        require!(!p.settled, PosErr::AlreadySettled);
        let won = (p.side == 1 && terminal_yes) || (p.side == 0 && !terminal_yes);
        let entry = if p.side == 1 { p.entry_price_bps as i64 } else { 10000i64 - p.entry_price_bps as i64 };
        let entry = entry.clamp(1, 9999);
        let pnl = if won { 10000i64 - entry } else { -entry };
        p.settled = true;
        p.pnl_bps = pnl as i32;
        emit!(Settled { owner: p.owner, market: p.market, won, pnl_bps: p.pnl_bps });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(init, payer = user, space = 8 + Position::LEN,
        seeds = [b"pos", market.key().as_ref(), user.key().as_ref()], bump)]
    pub position: Account<'info, Position>,
    /// CHECK: external lop market, validated by length + byte layout
    pub market: UncheckedAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePosition<'info> {
    #[account(mut, has_one = market,
        seeds = [b"pos", market.key().as_ref(), owner.key().as_ref()], bump = position.bump)]
    pub position: Account<'info, Position>,
    /// CHECK: external lop market
    pub market: UncheckedAccount<'info>,
    /// CHECK: owner pubkey used only as PDA seed
    pub owner: UncheckedAccount<'info>,
}

#[account]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub side: u8,
    pub notional: u64,
    pub entry_price_bps: u16,
    pub settled: bool,
    pub pnl_bps: i32,
    pub bump: u8,
}
impl Position { pub const LEN: usize = 32 + 32 + 1 + 8 + 2 + 1 + 4 + 1; }

#[event] pub struct Opened { pub owner: Pubkey, pub market: Pubkey, pub side: u8, pub entry_price_bps: u16, pub notional: u64 }
#[event] pub struct Settled { pub owner: Pubkey, pub market: Pubkey, pub won: bool, pub pnl_bps: i32 }

#[error_code]
pub enum PosErr {
    #[msg("bad side")] BadSide,
    #[msg("bad market account")] BadMarket,
    #[msg("market already decided")] AlreadyDecided,
    #[msg("market not decided")] NotDecided,
    #[msg("already settled")] AlreadySettled,
}
