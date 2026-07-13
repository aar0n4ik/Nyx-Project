# Nyx — On-chain deployments (Solana devnet)

All artifacts below are real and verifiable on Solana **devnet**. No mocks.

## Accounts & tokens
| Item | Address |
|---|---|
| Nyx settlement wallet (WDK) | `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` |
| Test USD₮ mint (6 decimals) | `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` |
| `nyx_settlement` program id | _pending `anchor deploy`_ |

## Transactions
| Event | Signature |
|---|---|
| First on-chain USD₮ payout | `2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA` |

Explorer:
- Wallet — https://explorer.solana.com/address/8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF?cluster=devnet
- USD₮ mint — https://explorer.solana.com/address/5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS?cluster=devnet
- First payout — https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet

## Auto-settlement flow
1. TxLINE match state is gossiped over the Hyperswarm mesh.
2. `NyxAgent.analyze()` marks a market **GUARANTEED (100%)** the moment the score decides it (goals never un-happen).
3. `NyxAgent.autoSettle()` fires a **real USD₮ transfer** via the Tether WDK to the winner — no human in the loop.

Reproduce:
\`\`\`bash
cd nyx-mesh
node src/setup-usdt.js                 # create test USD₮ mint + fund the wallet (once)
NYX_AUTOPAY_DEMO=1 node src/index.js   # agent detects a decided market -> pays on-chain
\`\`\`

## Anchor program deploy checklist (devnet)
\`\`\`bash
cd /workspaces/Nyx-Project
solana config set --url devnet
solana-keygen new            # only if ~/.config/solana/id.json does not exist yet
solana address               # your deploy wallet
solana airdrop 5             # or fund it at https://faucet.solana.com (Devnet)
anchor build
anchor keys sync             # writes the real program id into declare_id!/Anchor.toml
anchor build                 # rebuild with the synced id
anchor deploy
anchor keys list             # -> copy the nyx_settlement program id
\`\`\`
Then set the id in `public/nyx/nyx-config.js` (`window.NYX_PROGRAM_ID`) and in `public/nyx/deployments.json` (`settlementProgramId`).

## nyx_settlement — Solana devnet (LIVE)
- **Program Id:** `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3`
- **ProgramData:** `8iuCCZv8cm8LBc5E3b38d6K4BTR6ra1S8UPdkpWDm7BL`
- **Upgrade Authority:** `7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6`
- **Cluster:** devnet (https://api.devnet.solana.com)
- **Deployed slot:** 475861414
- **Binary size:** 310608 bytes
- **Date:** 2026-07-12 (America/Chicago)
- **Explorer:** https://explorer.solana.com/address/AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3?cluster=devnet

## nyx_settlement — Solana devnet (LIVE)
- **Program Id:** `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3`
- **ProgramData:** `8iuCCZv8cm8LBc5E3b38d6K4BTR6ra1S8UPdkpWDm7BL`
- **Upgrade Authority:** `7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6`
- **Cluster:** devnet (https://api.devnet.solana.com)
- **Deployed slot:** 475861414
- **Binary size:** 310608 bytes
- **Date:** 2026-07-12 (America/Chicago)
- **Explorer:** https://explorer.solana.com/address/AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3?cluster=devnet

## Auto-settlement (killer feature) — LIVE on devnet
- **Trigger:** agent detected GUARANTEED win — Over 2.5 reached (fixture 17588232 seeded 3:1 FT), deterministic verdict fairProb=100% edge=95%
- **Agent auto-paid:** 39 USD₮ (no human in the loop)
- **From (treasury):** `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF`
- **To (winner, WDK acct #1):** `D3Uf37hQh3CEBZcuHX1fFpGGMBnAua1dZRXCTCnNBCz4`
- **Mint (test USD₮):** `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS`
- **Tx:** `5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy`
- **Explorer:** https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet
- **Date:** 2026-07-12 (America/Chicago)

## Auto-settlement (killer feature) — LIVE on devnet
- **Trigger:** agent detected GUARANTEED win — Over 2.5 reached (fixture 17588232 seeded 3:1 FT), deterministic verdict fairProb=100% edge=95%
- **Agent auto-paid:** 39 USD₮ (no human in the loop)
- **From (treasury):** `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF`
- **To (winner, WDK acct #1):** `D3Uf37hQh3CEBZcuHX1fFpGGMBnAua1dZRXCTCnNBCz4`
- **Mint (test USD₮):** `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS`
- **Tx:** `5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy`
- **Explorer:** https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet
- **Date:** 2026-07-12 (America/Chicago)

## nyx_pamm — live-probability AMM (Solana devnet)
- Program Id: `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3`
- ProgramData: `HLSD4aE8FSuxDt6JWJqZPKgbi1VV36Tm792jeJY7KWio`
- Upgrade authority: `7tMb9N3L4YvMNwYoexd2MmHUDi4pnC19PYfm3LKRdRB6`
- Deployed slot: 476046975 · size 331344 bytes · 2026-07-13
- Explorer: https://explorer.solana.com/address/8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3?cluster=devnet
- Recentred-LMSR maker: init_pool / buy / sell / push_oracle / resolve / claim. Core math in `pamm-math` (12 tests). Max LP loss bounded by b*ln(n).
