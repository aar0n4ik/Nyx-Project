# Track 1 — Prediction Markets & Settlement

**What Nyx ships:** trust-minimized, non-custodial markets whose outcomes are decided **on-chain, never by an admin key**. Every market is backed by two live settlement modes on Solana devnet.

## The two settlement modes
### Mode 1 · Proof-gated (fast path)
`nyx_verifier.settle_verified` forwards TxODDS's own `validate_stat_v2` check to the `txoracle` program via CPI and settles **only if** it returns `verified = true` — no trusted keeper decides the outcome.

    nyx_verifier --CPI--> txoracle.validate_stat_v2 -> settle only if verified = true

### Mode 2 · Optimistic dispute game (fallback)
For stats the oracle cannot directly attest, a bonded challenge runs, then a program PDA (not a human) pushes the result into settlement:

    propose(bond) -> dispute(bond) -> arbitrate -> slash wrong side
    nyx_oracle_bridge PDA --CPI--> nyx_settlement.resolve   (no human key)

## Where it lives
| Component | Path |
| --- | --- |
| Settlement (markets, bets, `place_bet_for`, resolve, claim) | [../../programs/nyx-settlement](../../programs/nyx-settlement) |
| Optimistic dispute game (bond / challenge / slash) | [../../programs/nyx-dispute](../../programs/nyx-dispute) |
| PDA oracle bridge → settlement via CPI | [../../programs/nyx-oracle-bridge](../../programs/nyx-oracle-bridge) |
| Proof-gated verifier (CPI into txoracle) | [../../programs/nyx_verifier](../../programs/nyx_verifier) |
| Proof-gated market + positions | [../../programs/lop](../../programs/lop) · [../../programs/positions](../../programs/positions) |
| Settlement scripts | [../../scripts/nyx-trustless-settle.mjs](../../scripts/nyx-trustless-settle.mjs) · [../../scripts/settle-verified.mjs](../../scripts/settle-verified.mjs) · [../../scripts/txline-settle-gated.mjs](../../scripts/txline-settle-gated.mjs) |
| SDKs | [../../sdk/nyx-txodds-settlement](../../sdk/nyx-txodds-settlement) · [../../sdk/txodds-verifier](../../sdk/txodds-verifier) |

## Deployed (devnet)
| Program | ID |
| --- | --- |
| nyx_settlement | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| nyx_dispute | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| nyx_oracle_bridge | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |
| nyx_verifier | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` |
| lop | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` |
| positions | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` |
| txoracle (TxODDS dependency, CPI target) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

## On-chain proofs (devnet)
- Proof-gated CPI settle (verifier → txoracle): [65r1Whd…MXfV9v](https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet)
- Trustless resolve (bridge PDA, no oracle key): [3DqcdD5…GMaev](https://explorer.solana.com/tx/3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev?cluster=devnet)
- Dispute-gated CPI resolve: [q9yZGM…fwAkQ](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet)
- Dispute slash (wrong side): [KDsynE…dB2vPFm](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet)
- First USD₮ payout: [2xXK…soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet)
- Auto-settlement payout: [5fxc…jsbVy](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet)

## Run it (devnet)
    node scripts/nyx-trustless-settle.mjs   # dispute -> bridge PDA resolves via CPI -> claim
    node scripts/settle-verified.mjs        # proof-gated: settles only if txoracle verifies

← Back to the [overview](../../README.md) · full ledger in [DEPLOYMENTS.md](../../DEPLOYMENTS.md)
