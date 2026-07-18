# Nyx — On-chain deployments (Solana devnet)

All programs, accounts and transactions below are **real and verifiable** on Solana devnet.
Verify any program yourself: `solana program show <ID> --url devnet`.
The mainnet path is implemented (`NYX_NETWORK=mainnet` + `NYX_ALLOW_MAINNET=1`, real Tether
USD₮ mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`) and awaits a funded wallet.

## Programs (Solana devnet)

| Program | Program Id | Data length | Last deployed (slot) |
|---|---|---|---|
| `nyx_settlement` — escrowed YES/NO markets, `place_bet_for`, resolve, claim | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` | 350608 | 476607588 |
| `nyx_dispute` — optimistic oracle: propose / dispute / arbitrate / slash | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` | 299904 | 476514823 |
| `nyx_oracle_bridge` — PDA oracle, forwards finalized outcome via CPI | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` | 241584 | 476519651 |
| `nyx_verifier` — proof-gated settlement via CPI into TxODDS `txoracle` | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` | 218000 | 476358150 |
| `nyx_pamm` — recentred-LMSR probability AMM | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` | 371344 | 476125352 |
| `lop` — recentred-LMSR market (proof-gated stack) | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` | 223928 | 476281766 |
| `positions` — user positions (proof-gated stack) | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` | 222920 | 476312703 |

Upgrade authority: `7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6` · Cluster: devnet (https://api.devnet.solana.com)

### Third-party programs used
| Program | Program Id | Notes |
|---|---|---|
| Subscriptions & Allowances (Solana Foundation) | `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44` | mainnet + devnet; powers zero-custody `place_bet_for` |
| TxODDS `txoracle` (dependency) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | devnet; `validate_stat_v2` is the CPI target of `nyx_verifier` |

## Two settlement modes (both live)

1. **Proof-gated (fast path).** `nyx_verifier.settle_verified` forwards `validate_stat_v2`
   to TxODDS `txoracle` via CPI and settles only if the oracle returns `verified = true`.
   No trusted keeper decides the outcome — TxODDS's own oracle does.
2. **Optimistic dispute game (fallback).** For stats the oracle cannot directly attest, an
   outcome is proposed under bond, may be disputed, is arbitrated, and the wrong side is
   slashed; `nyx_oracle_bridge` (a PDA) then pushes the finalized outcome into
   `nyx_settlement` via CPI. No human key can call `resolve()`.

## Accounts & tokens
| Item | Address |
|---|---|
| Nyx settlement wallet (Tether WDK) | `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` |
| Test USD₮ mint (6 decimals) | `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` |
| Agent | `5Ybj5JBMzoEp7UVQV1xWQQ5V7RVgBWarBfBdNuXShKBU` |

## Transactions
| Event | Signature |
|---|---|
| Proof-gated CPI settle (`nyx_verifier` → `txoracle.validate_stat_v2`, verified=true) | `65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v` |
| Dispute-gated CPI resolve (oracle = PDA) | `q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ` |
| Dispute arbitrated, wrong side slashed | `KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm` |
| First on-chain USD₮ payout | `2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA` |
| Live auto-settlement payout | `5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy` |
| Affiliate revenue split (5% to creator) | `29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS` |
| On-chain Proof-of-Inference anchor (Memo) | `4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR` |
| Proof-of-Inference anchor — Solana MAINNET | `2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn` |

## Published SDKs
| Package | Registry | Path |
|---|---|---|
| `nyx-txodds-settlement` | npm | `sdk/nyx-txodds-settlement` |
| `nyx-txodds-allowance` | npm | `sdk/nyx-txodds-allowance` |
| `nyx-txodds-solana` | npm | `sdk/txodds-solana-js` |
| `nyx-txodds-oracle` | crates.io | `sdk/txodds-oracle` |
| `nyx-txodds-verifier` | crates.io | `sdk/txodds-verifier` |

## Reproduce (60s)
- `node scripts/nyx-agent-loop.mjs` — zero-custody agent: price -> bet for user -> claim
- `cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js` — on-chain PoI anchor (real Memo tx)
- `cd nyx-mesh && node src/inplay-demo.js` — live pricing; refuses to settle while undecided

## Live trustless run (verified end-to-end)

A full `node scripts/nyx-agent-loop.mjs` run in which the winning outcome is written to the market by the bridge PDA via CPI. The transaction fee-payer is the agent, which is **not** the market oracle, so no human key ever calls `resolve()`. Market oracle is bound to bridge PDA `MdnDBxDArjNTF161YkdnFAP7Qs3NYdY1yeqjnrdyRBJ`.

| Step | Signature |
| --- | --- |
| Bound market created (oracle = bridge PDA) | `5moT3zX5fdZ4hCi9FTbTfcZdiGMVfUEVLhCFEt7qbpBNnoPLaUAQxFDtKKhZGEwymeFi5kFC2UYRKYhs9a4eJqrR` |
| Trustless resolve (bridge PDA -> settlement via CPI; fee-payer is not the oracle) | `3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev` |
| User claimed winnings to own wallet | `2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X` |

## Settlement v2 (devnet, self-owned) - protocol-enforced affiliate split
- Program id: 5givnWMR71eqWPEFDfh1mdBuhZUCSpnj3MuHUuKhzoYb
- place_bet_with_ref: on-chain 5% referral cap, split enforced by the program.

### Live devnet proof (2026-07-18T18:04Z)
- Program: https://explorer.solana.com/address/5givnWMR71eqWPEFDfh1mdBuhZUCSpnj3MuHUuKhzoYb?cluster=devnet
- test-USD mint: GP5fTCrphXRf38JfvqryvhaJz7wYh9bsgAgKJDx8ZETN
- create_market: https://explorer.solana.com/tx/4UYMyE6Yfd5VDNXvwadQm2CQADPqKY2ek2W8cs8BzGScix4KGLZYCBPuMGff7AurKeAAge6i1HcY4EJ4aFKG3ES7?cluster=devnet
- place_bet_with_ref (5% split, program-enforced, 6% reverts): https://explorer.solana.com/tx/5ET4gP9xS5qfoP9JkpuRtUuXJDn57CzUM2yk4vyaSmoif8Uk2TamLm4qJAzzWhfYZybkr4E3GThJKJRLrjmSDhLf?cluster=devnet
- Bettor: 8Cdi74ccHUSnqE2deK1ejDNRQWzLGXkG4aKePQh5s3HZ
- Affiliate: 6JvwWCW6ehRZ1ExHArdWBo9itt8U5XqqWqKnLwPAQyJw
