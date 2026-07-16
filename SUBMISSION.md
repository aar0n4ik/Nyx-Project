# Nyx — Hackathon Submission

**Superteam × TxODDS World Cup Hackathon — Track: Prediction Markets & Settlement**

## TL;DR
One autonomous agent that **prices, bets, and settles** football markets on Solana in Tether USD₮ — with **zero custody** of user funds, **trust-minimized** on-chain outcomes, and **provable** AI inference. Live and verifiable on devnet; the mainnet path is implemented and config-ready.

- Live app: https://nyx-project-roan.vercel.app
- On-chain verifier: https://nyx-project-roan.vercel.app/verify
- SDK showcase: https://nyx-project-roan.vercel.app/sdk
- Repo: https://github.com/aar0n4ik/Nyx-Project

## The problem
Sports prediction markets need three things at once: a **trustworthy outcome**, **low-friction distribution**, and **capital efficiency**. Today:

- TxLINE proves a feed is internally consistent — not that an outcome is *true* — and every market built directly on a feed inherits an **admin key** that can rig or drain it.
- "AI betting" products are **custodial chatbots**: you hand your funds to a bot. That is a non-starter for trust and regulation.

## What Nyx does
1. **Zero-custody agent.** User grants a capped, expiring **on-chain allowance**. The agent bets on the user's behalf via `place_bet_for`; the **user owns the position and the winnings**; revoke anytime. Losing the agent key cannot drain a user.
2. **Trust-minimized settlement.** Three composable Anchor programs. Outcomes survive an **optimistic dispute game** and are resolved by a **program PDA via CPI** — no human key.
3. **Provable inference.** Every model call emits a signed ed25519 Proof-of-Inference receipt whose digest is **anchored on-chain** (Solana Memo) — public, timestamped, tamper-evident.
4. **Distribution-native.** Bet and delegate from X/Discord via **Solana Blinks**, with a **zero-CAC affiliate** revenue split composed at the Action layer.

## What is live (real on-chain, no mocks)

| Program (devnet) | ID |
| --- | --- |
| nyx_settlement | AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3 |
| nyx_dispute | 7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN |
| nyx_oracle_bridge | BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk |
| nyx_pamm | 8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3 |

| Proof (devnet) | Tx |
| --- | --- |
| Dispute-gated CPI resolve | [q9yZGM...fwAkQ](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet) |
| Dispute slash (wrong side) | [KDsynE...dB2vPFm](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet) |
| First USD₮ payout | [2xXK...soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| Auto-settlement payout | [5fxc...jsbVy](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet) |
| On-chain PoI anchor | [4cHmiwce...ESdMUeR](https://explorer.solana.com/tx/4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR?cluster=devnet) |

Published SDKs: `nyx-txodds-settlement` (npm), `nyx-txodds-allowance` (npm), `nyx-txodds-oracle` (crates.io).

## Why this wins on commercial potential
- **Infrastructure, not a book.** Nyx never takes the other side of a bet — it earns on **rails**, so revenue scales with volume, not risk.
- **Four revenue lines:** settlement fee, pAMM/LP spread, Blink distribution, SDK/B2B data-verification.
- **Near-zero cost base:** inference runs on-device (QVAC); Solana settlement is fractions of a cent.
- **Zero custody is the moat.** It is the only structure viable under real trust and regulatory scrutiny — custodial competitors (voice-UI apps with manual deposit/claim) cannot match it without a rebuild.
- **Distribution wedge:** Blinks make Nyx the default betting rail embeddable in any third-party fan app or social post.

## Verify in 60 seconds
    node scripts/nyx-agent-loop.mjs                               # zero-custody agent: price -> bet for user -> claim
    cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js  # on-chain PoI anchor (real Memo tx)
    cd nyx-mesh && node src/inplay-demo.js                         # live pricing; refuses to settle while undecided

Full technical detail in README.md and DEPLOYMENTS.md.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS.
