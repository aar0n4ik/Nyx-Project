# Nyx — On-chain deployments (Solana devnet)

All artifacts below are real and verifiable on Solana **devnet**. No mocks.
The mainnet settlement path is implemented (`NYX_NETWORK=mainnet` + `NYX_ALLOW_MAINNET=1`,
real USDT mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`) and awaits a funded wallet.

## Accounts & tokens
| Item | Address |
|---|---|
| Nyx settlement wallet (WDK) | `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` |
| Test USD₮ mint (6 decimals) | `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` |

## Programs
| Program | Program Id | Details |
|---|---|---|
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` | ProgramData `8iuCCZv8cm8LBc5E3b38d6K4BTR6ra1S8UPdkpWDm7BL`; deployed slot 475861414; 310608 bytes; 2026-07-12 |
| `nyx_pamm` | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` | ProgramData `HLSD4aE8FSuxDt6JWJqZPKgbi1VV36Tm792jeJY7KWio`; deployed slot 476046975; 331344 bytes; 2026-07-13 |

Upgrade authority (both): `7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6` · Cluster: devnet (https://api.devnet.solana.com)

Explorer:
- Settlement program — https://explorer.solana.com/address/AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3?cluster=devnet
- pAMM program — https://explorer.solana.com/address/8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3?cluster=devnet
- Wallet — https://explorer.solana.com/address/8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF?cluster=devnet
- USD₮ mint — https://explorer.solana.com/address/5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS?cluster=devnet

## Transactions
| Event | Signature |
|---|---|
| First on-chain USD₮ payout | `2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA` |
| Live auto-settlement payout | `5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy` |

- First payout — https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet
- Auto-settlement — https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet

## Auto-settlement flow
1. TxLINE match state is gossiped over the Hyperswarm mesh.
2. `NyxAgent.analyze()` prices the live market (Poisson + half-Kelly) and marks it **GUARANTEED (100%)** the moment the score decides it (goals never un-happen).
3. `NyxAgent.autoSettle()` fires a **real USD₮ transfer** via the Tether WDK to the winner — no human in the loop.

Reproduce (undecided → no payout, then decided → real payout):
\`\`\`bash
cd nyx-mesh
node src/setup-usdt.js                 # create test USD₮ mint + fund the wallet (once)
node src/inplay-demo.js                # live edge, refuses to settle, then pays on the guaranteeing goal
\`\`\`

## Auto-settlement (killer feature) — LIVE on devnet
- **Trigger:** agent detected GUARANTEED win — Over 2.5 reached (fixture 17588232 seeded 3:1 FT), deterministic verdict fairProb=100% edge=95%
- **Agent auto-paid:** 39 USD₮ (no human in the loop)
- **From (treasury):** `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF`
- **To (winner, WDK acct #1):** `D3Uf37hQh3CEBZcuHX1fFpGGMBnAua1dZRXCTCnNBCz4`
- **Mint (test USD₮):** `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS`
- **Tx:** `5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy`
- **Date:** 2026-07-12 (America/Chicago)

## pAMM — recentred-LMSR probability AMM
- Instructions: `init_pool` / `buy` / `sell` / `push_oracle` / `resolve` / `claim`.
- Core market engine `pamm-math`: 12 passing tests; LP max loss bounded at `b·ln(n)`.

## Mainnet (live)

- Network: Solana mainnet-beta
- Proof-of-Inference anchor tx: 2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn
- Explorer: https://explorer.solana.com/tx/2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn
- Digest anchored: 4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8
- Signer (anchor key): 7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6
