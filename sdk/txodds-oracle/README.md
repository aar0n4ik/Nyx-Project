# nyx-txodds-oracle

Rust building blocks for the Nyx trust-minimized settlement stack on Solana:
program IDs, Anchor discriminators, PDA derivation, borsh account decoders,
instruction-data builders, and an on-chain CPI helper that pushes a
dispute-finalized outcome into settlement. No Anchor dependency — just
`solana-program` + `borsh`.

```toml
[dependencies]
nyx-txodds-oracle = "0.1"
```

## Why

TxLINE proves a feed is internally consistent (a Merkle root), not that an outcome
is *true*, and it gives you no on-chain way to challenge a bad signer. Built naively,
every prediction market ends up with an admin key that can call `resolve()` — one
leaked key and the market is drained or rigged. This crate is the Rust side of
removing that key: the market's oracle is a **program PDA**, and an outcome reaches
settlement only after `propose -> dispute -> arbitrate` via `push_resolution`, which
forwards exactly the finalized result — anything else reverts.

## What you get

- `SETTLEMENT_PROGRAM_ID`, `DISPUTE_PROGRAM_ID`, `ORACLE_BRIDGE_PROGRAM_ID`, `TOKEN_PROGRAM_ID`
- `ix_disc` / `account_disc` — 8-byte Anchor sighashes
- `Market`, `Assertion` + `decode_market`, `decode_assertion` — borsh account decoders
- instruction-data builders: `create_market`, `place_bet`, `claim`, `resolve`, `propose`,
  `dispute`, `settle_undisputed`, `arbitrate`, `create_bound_market`, `push_resolution`
- PDA helpers: `market_pda`, `vault_pda`, `position_pda`, `assertion_pda`,
  `dispute_vault_pda`, `oracle_pda`
- `push_resolution_instruction` / `push_resolution_cpi` — the trustless bridge call

## Programs (Solana devnet)

| Program | ID |
| --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |

## On-chain CPI

```rust
use nyx_txodds_oracle::push_resolution_cpi;
use solana_program::account_info::{next_account_info, AccountInfo};

// inside your instruction handler, after the dispute is RESOLVED:
let it = &mut accounts.iter();
let bridge_program     = next_account_info(it)?;
let assertion          = next_account_info(it)?;
let market             = next_account_info(it)?;
let oracle             = next_account_info(it)?;
let dispute_program    = next_account_info(it)?;
let settlement_program = next_account_info(it)?;

// Forwards ONLY the finalized outcome into settlement. Reverts otherwise.
push_resolution_cpi(bridge_program, assertion, market, oracle, dispute_program, settlement_program)?;
```

## Companion packages

- npm `nyx-txodds-settlement` — JS/TS instruction builders + decoders for the same stack.
- crates.io `nyx-txodds-verifier` — verify TxLINE Merkle data via CPI into `txoracle`.

## License

MIT.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by
> TxODDS or Tether. "TxODDS", "TxLINE" and "USD₮" are trademarks of their respective
> owners; used only to describe compatibility.
