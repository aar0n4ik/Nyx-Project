use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::{Instruction, AccountMeta}, program::{invoke, get_return_data}};

declare_id!("GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY");

#[program]
pub mod nyx_verifier {
    use super::*;

    /// Accepts a serialized (disc+args) validate_stat_v2 instruction and performs
    /// a real CPI into TxLINE. An invalid Merkle proof reverts the CPI -> nothing is recorded.
    pub fn settle_verified(ctx: Context<SettleVerified>, cpi_data: Vec<u8>) -> Result<()> {
        let txoracle = ctx.accounts.txoracle_program.key();
        require!(txoracle.to_string() == "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J", VErr::WrongProgram);
        let ix = Instruction {
            program_id: txoracle,
            accounts: vec![AccountMeta::new_readonly(ctx.accounts.daily_scores_merkle_roots.key(), false)],
            data: cpi_data,
        };
        invoke(&ix, &[
            ctx.accounts.daily_scores_merkle_roots.to_account_info(),
            ctx.accounts.txoracle_program.to_account_info(),
        ])?;
        let outcome = match get_return_data() {
            Some((prog, data)) if prog == txoracle && !data.is_empty() => data[0] == 1,
            _ => false,
        };
        let rec = &mut ctx.accounts.record;
        rec.verified = true;
        rec.outcome = outcome;
        rec.slot = Clock::get()?.slot;
        msg!("TxLINE validate_stat_v2 CPI verified on-chain. terminal_yes = {}", outcome);
        Ok(())
    }
}

#[account]
pub struct SettlementRecord { pub verified: bool, pub outcome: bool, pub slot: u64 }

#[derive(Accounts)]
pub struct SettleVerified<'info> {
    #[account(init_if_needed, payer = signer, space = 8 + 1 + 1 + 8, seeds = [b"settle_rec"], bump)]
    pub record: Account<'info, SettlementRecord>,
    /// CHECK: TxLINE daily_scores_roots PDA
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
    /// CHECK: TxLINE oracle program (validated by the require above)
    pub txoracle_program: UncheckedAccount<'info>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum VErr { #[msg("wrong txoracle program")] WrongProgram }
