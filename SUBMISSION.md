# Nyx — Hackathon Submission

**Superteam × TxODDS World Cup Hackathon.** Nyx ships three standalone products — one per track — each built specifically for that track's criteria on shared open-source Solana infrastructure: Prediction Markets & Settlement · Trading Tools & Agents · Consumer & Fan Experiences. Each is submitted separately, with its own demo entry point and its own guide under [tracks/](tracks/README.md).

## TL;DR
One autonomous agent that **prices, bets, and settles** football markets on Solana in Tether USD₮ — with **zero custody** of user funds, **trust-minimized** on-chain outcomes, and **provable** AI inference. Live and verifiable on devnet; the on-chain Proof-of-Inference anchor also runs live on Solana mainnet.

- Live app: https://nyx-project-roan.vercel.app
- On-chain verifier: https://nyx-project-roan.vercel.app/verify
- SDK showcase: https://nyx-project-roan.vercel.app/sdk
- Repo: https://github.com/aar0n4ik/Nyx-Project
- Per-track guides: [tracks/](tracks/README.md)

## The problem
Sports prediction markets need three things at once: a **trustworthy outcome**, **low-friction distribution**, and **capital efficiency**. Today:

- TxLINE proves a feed is internally consistent — not that an outcome is *true* — and every market built directly on a feed inherits an **admin key** that can rig or drain it.
- "AI betting" products are **custodial chatbots**: you hand your funds to a bot. That is a non-starter for trust and regulation.

## What Nyx does
1. **Zero-custody agent.** User grants a capped, expiring **on-chain allowance**. The agent bets on the user's behalf via `place_bet_for`; the **user owns the position and the winnings**; revoke anytime. Losing the agent key cannot drain a user.
2. **Trust-minimized settlement.** Outcomes are either cryptographically verified against TxODDS `txoracle` via CPI, or survive an **optimistic dispute game** and are resolved by a **program PDA via CPI** — no human key.
3. **Provable inference.** Every model call emits a signed ed25519 Proof-of-Inference receipt whose digest is **anchored on-chain** (Solana Memo) — public, timestamped, tamper-evident.
4. **Distribution-native.** Bet and delegate from X/Discord via **Solana Blinks**, with a **zero-CAC affiliate** revenue split composed at the Action layer.

## Three products, one shared rail
Each track is a distinct product with its own entry point, README, and demo deep-link, built specifically for that track. They share open-source Solana settlement infrastructure, but each stands on its own.

| Track | What Nyx ships | Where it lives |
| --- | --- | --- |
| 🏁 Prediction Markets & Settlement | Proof-gated + dispute-gated on-chain settlement; outcomes decided by oracle CPI or a bonded dispute game, never an admin key. | `programs/nyx-settlement`, `nyx-dispute`, `nyx-oracle-bridge`, `nyx_verifier` · [tracks/prediction-markets-settlement](tracks/prediction-markets-settlement/README.md) |
| 🤖 Trading Tools & Agents | Zero-custody agent (on-chain allowance + `place_bet_for`), recentred-LMSR pricing, half-Kelly sizing, non-custodial order API. | `scripts/nyx-agent-loop.mjs`, `pamm-math`, `programs/lop`+`positions`, `app/api/place-order` · [tracks/trading-tools-agents](tracks/trading-tools-agents/README.md) |
| 🎉 Consumer & Fan Experiences | One-tap Blinks to bet or delegate from any post, zero-CAC affiliate split, offline-first multilingual PWA. | `app/api/actions/*`, `public/nyx` · [tracks/consumer-fan-experiences](tracks/consumer-fan-experiences/README.md) |

## What is live (real on-chain, no mocks)

| Program (Solana devnet) | ID |
| --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |
| `nyx_verifier` | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` |
| `lop` | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` |
| `positions` | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` |
| `nyx_pamm` | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` |
| TxODDS `txoracle` (dependency, CPI target) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| Subscriptions & Allowances (Solana Foundation) | `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44` |

## Proof by track (devnet unless noted)

| Track | What | Tx |
| --- | --- | --- |
| 🏁 T1 | Proof-gated CPI settle (verifier → txoracle) | [65r1Whd…MXfV9v](https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet) |
| 🏁 T1 | Trustless resolve (bridge PDA, no oracle key) | [3DqcdD5…GMaev](https://explorer.solana.com/tx/3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev?cluster=devnet) |
| 🏁 T1 | Dispute-gated CPI resolve | [q9yZGM…fwAkQ](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet) |
| 🏁 T1 | Dispute slash (wrong side) | [KDsynE…dB2vPFm](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet) |
| 🤖 T2 | Agent bets for user under allowance | [7JFQB78…doFwBME](https://explorer.solana.com/tx/7JFQB78pxJ1BCNFBdpP8Hou9rUjvLncXT6P3bBPJBbiDdMaXnPxcQaNGvMLuqkL7weT51DeduzrrkPxqdoFwBME?cluster=devnet) |
| 🤖 T2 | User claims agent-won payout | [2Xs7NdN…Xf9X](https://explorer.solana.com/tx/2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X?cluster=devnet) |
| 🏁🤖 | First on-chain USD₮ payout | [2xXK…soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| 🏁🤖 | Live auto-settlement payout | [5fxc…jsbVy](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet) |
| 🎉 T3 | Zero-CAC affiliate revenue split (5% to creator) | [29zHMJ9A…MLNqRS](https://explorer.solana.com/tx/29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS?cluster=devnet) |
| 🎉 T3 | On-chain Proof-of-Inference anchor | [4cHmiwce…ESdMUeR](https://explorer.solana.com/tx/4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR?cluster=devnet) |
| 🎉 T3 | PoI anchor on **Solana MAINNET** | [2SDKgy1A…TaaH7Vn](https://explorer.solana.com/tx/2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn) |

Published SDKs: `nyx-txodds-settlement` (npm), `nyx-txodds-allowance` (npm), `nyx-txodds-solana` (npm), `nyx-txodds-oracle` (crates.io), `nyx-txodds-verifier` (crates.io).

## Why this wins on commercial potential
- **Infrastructure, not a book.** Nyx never takes the other side of a bet — it earns on **rails**, so revenue scales with volume, not risk.
- **Four revenue lines:** settlement fee, pAMM/LP spread, Blink distribution, SDK/B2B data-verification.
- **Near-zero cost base:** inference runs on-device (QVAC); Solana settlement is fractions of a cent.
- **Zero custody is the moat.** It is the only structure viable under real trust and regulatory scrutiny — custodial competitors cannot match it without a rebuild.
- **Distribution wedge:** Blinks make Nyx the default betting rail embeddable in any third-party fan app or social post.

## Team
Solo build by Aaron (17). This is a genuine long-term project, not a hackathon throwaway — the architecture (zero custody, trust-minimized settlement, published SDKs) is chosen to keep shipping and to onboard collaborators and B2B integrators after the event. Open to feedback and to working closely with TxODDS and the Superteam ecosystem.

## Roadmap
Direction, not deadlines:
- Harden dispute-game economics (bond curves, challenge windows) and expand market types beyond 1X2 / totals / BTTS.
- Broaden data coverage to more sports and feeds on top of the same verifier rail.
- Promote settlement to Solana mainnet once economics and audits are ready (the PoI anchor already runs on mainnet today).
- Grow SDK / B2B verifier adoption as a standalone trust-tooling product.
- Deepen Blink distribution and creator/affiliate tooling.

## Verify in 60 seconds
    node scripts/nyx-agent-loop.mjs                                # zero-custody agent: price -> bet for user -> claim
    cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js  # on-chain PoI anchor (real Memo tx)
    cd nyx-mesh && node src/inplay-demo.js                         # live pricing; refuses to settle while undecided

Full technical detail in `README.md`, `docs/TECHNICAL.md`, and `DEPLOYMENTS.md`.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS. "TxODDS" and "TxLINE" are trademarks of their respective owners, used only to describe compatibility.
