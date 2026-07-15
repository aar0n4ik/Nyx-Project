# nyx-txodds-verifier (unofficial)

Verify **TxODDS TxLINE** sports data on **Solana** with a real on-chain CPI into
`txoracle::validate_stat_v2`.

> ⚠️ **Unofficial / community project.** Not affiliated with or endorsed by TxODDS.
> The `txoracle` program, its IDL, and all data belong to TxODDS. This crate only
> provides open-source Rust bindings + a CPI helper around their public program.

## Why
TxODDS ships a TypeScript example + IDL for on-chain use, but no Rust crate for
verifying their data from inside a Solana program. This fills that gap so any program
can settle on TxODDS-proven results — the same shape Chainlink Data Streams uses for
its Solana on-chain Rust verifier.

## Install
    [dependencies]
    nyx-txodds-verifier = "0.1"

## Verify inside your program
    use nyx_txodds_verifier::{verify_stat_cpi, StatValidationInput, NDimensionalStrategy};

    let verified: bool = verify_stat_cpi(
        &txoracle_program_ai,          // AccountInfo of the txoracle program
        &daily_scores_merkle_roots_ai, // AccountInfo of the read-only roots PDA
        &payload,                      // StatValidationInput
        &strategy,                     // NDimensionalStrategy
    )?;
    require!(verified, MyError::NotVerified);

Bring-your-own-bytes (payload built off-chain by the JS client):

    let verified = nyx_txodds_verifier::verify_stat_cpi_raw(
        &txoracle_program_ai, &daily_scores_merkle_roots_ai, cpi_data,
    )?;

## Off-chain (build instruction data / PDA)
    let data = nyx_txodds_verifier::build_validate_stat_v2_data(&payload, &strategy)?;
    let (pda, _bump) = nyx_txodds_verifier::derive_daily_scores_roots_pda(
        &nyx_txodds_verifier::TXORACLE_DEVNET,
        nyx_txodds_verifier::epoch_day_from_millis(payload.ts),
    );

## Program IDs
- devnet:  `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
- mainnet: `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`

## Scope & limitations
- Targets `validate_stat_v2`. (v3 multiproof and odds/fixture validation not yet wrapped.)
- Types mirror the txoracle IDL v1.5.6, verified against the published devnet IDL.
- Tested on devnet. Verify against the live IDL before production use.

## License
MIT


## Trademark

"TxODDS" is a trademark of its respective owner. This crate is an independent, unofficial community project, not affiliated with, sponsored by, or endorsed by TxODDS. The name is used only to describe compatibility.
