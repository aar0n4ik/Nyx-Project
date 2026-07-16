# Nyx — Hackathon Submission

**Superteam × TxODDS World Cup Hackathon**
**Competing across all three tracks — Prediction Markets & Settlement · Trading Tools & Agents · Consumer & Fan Experiences.**

## TL;DR
One autonomous agent that **prices, bets, and settles** football markets on Solana in Tether USD₮ — with **zero custody** of user funds, **trust-minimized** on-chain outcomes, and **provable** AI inference. Live and verifiable on devnet; the on-chain Proof-of-Inference anchor also runs live on Solana mainnet.

- Live app: https://nyx-project-roan.vercel.app
- On-chain verifier: https://nyx-project-roan.vercel.app/verify
- SDK showcase: https://nyx-project-roan.vercel.app/sdk
- Repo: https://github.com/aar0n4ik/Nyx-Project

## Three tracks, one stack
Nyx is not three demos bolted together — it is one vertically integrated rail where each track is a layer of the same system.

| Track | What Nyx ships | Backed by |
| --- | --- | --- |
| **Prediction Markets & Settlement** | Trust-minimized parimutuel markets: an optimistic dispute game finalizes the outcome, then a **program PDA resolves the market via CPI — no human key**. A second, proof-gated path CPIs into TxLINE's on-chain Merkle validation and only settles if the proof passes. | `nyx_settlement`, `nyx_dispute`, `nyx_oracle_bridge`, `nyx_verifier` |
| **Trading Tools & Agents** | A zero-custody autonomous agent prices in-play markets off TxLINE, sizes with half-Kelly, and bets *for* the user under a capped, expiring on-chain allowance (`place_bet_for`) — the user always owns the position and the winnings. Plus a live pricing/liquidity core. | Subscriptions & Allowances delegation, `lop`, `positions`, `scripts/nyx-agent-loop.mjs` |
| **Consumer & Fan Experiences** | Bet and delegate straight from X/Discord via **Solana Blinks**, a **zero-CAC affiliate** split composed at the Action layer, and a multilingual in-play fan trading UI. | `/api/actions/bet`, `/api/actions/delegate`, Nyx Blinks + fan widget |

## The problem
Sports prediction markets need three things at once: a **trustworthy outcome**, **low-friction distribution**, and **capital efficiency**. Today:

- TxLINE proves a feed is internally consistent — not that an outcome is *true* — and every market built directly on a feed inherits an **admin key** that can rig or drain it.
- "AI betting" products are **custodial chatbots**: you hand your funds to a bot. That is a non-starter for trust and regulation.

## What Nyx does
1. **Zero-custody agent.** User grants a capped, expiring **on-chain allowance**. The agent bets on the user's behalf via `place_bet_for`; the **user owns the position and the winnings**; revoke anytime. Losing the agent key cannot drain a user.
2. **Trust-minimized settlement.** Composable Anchor programs. Outcomes survive an **optimistic dispute game** and are resolved by a **program PDA via CPI** — no human key. A parallel **proof-gated** path settles only after an on-chain TxLINE Merkle validation CPI succeeds.
3. **Provable inference.** Every model call emits a signed ed25519 Proof-of-Inference receipt whose digest is **anchored on-chain** (Solana Memo) — public, timestamped, tamper-evident.
4. **Distribution-native.** Bet and delegate from X/Discord via **Solana Blinks**, with a **zero-CAC affiliate** revenue split composed at the Action layer.

## What is live (real on-chain, no mocks)

| Program (devnet) | ID |
| --- | --- |
| nyx_settlement | AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3 |
| nyx_dispute | 7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN |
| nyx_oracle_bridge | BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk |
| nyx_verifier | GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY |
| nyx_pamm | 8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3 |
| lop | 6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83 |
| positions | 5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu |

Third-party building blocks (dependencies, not ours): TxODDS `txoracle` `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` (our CPI target) and Solana Foundation Subscriptions & Allowances `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`.

| Proof (devnet unless noted) | Tx |
| --- | --- |
| Proof-gated CPI settle (nyx_verifier → TxLINE validate_stat_v2) | [65r1Whd…MXfV9v](https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet) |
| Trustless resolve (bridge PDA → settlement via CPI, no oracle key) | [3DqcdD5…GMaev](https://explorer.solana.com/tx/3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev?cluster=devnet) |
| Dispute-gated CPI resolve | [q9yZGM…fwAkQ](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet) |
| Dispute slash (wrong side) | [KDsynE…dB2vPFm](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet) |
| Agent-loop payout claimed to user wallet | [2Xs7NdN…Xf9X](https://explorer.solana.com/tx/2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X?cluster=devnet) |
| First USD₮ payout | [2xXK…soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| Auto-settlement payout | [5fxc…jsbVy](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet) |
| Affiliate revenue split | [29zHMJ9A…MLNqRS](https://explorer.solana.com/tx/29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS?cluster=devnet) |
| On-chain PoI anchor | [4cHmiwce…ESdMUeR](https://explorer.solana.com/tx/4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR?cluster=devnet) |
| On-chain PoI anchor (Solana MAINNET) | [2SDKgy1A…TaaH7Vn](https://explorer.solana.com/tx/2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn) |

Published SDKs: `nyx-txodds-settlement` (npm), `nyx-txodds-allowance` (npm), `nyx-txodds-solana` (npm), `nyx-txodds-oracle` (crates.io), `nyx-txodds-verifier` (crates.io).

## Why this wins on commercial potential
- **Infrastructure, not a book.** Nyx never takes the other side of a bet — it earns on **rails**, so revenue scales with volume, not risk.
- **Four revenue lines:** settlement fee, pAMM/LP spread, Blink distribution, SDK/B2B data-verification.
- **Near-zero cost base:** inference runs on-device (QVAC); Solana settlement is fractions of a cent.
- **Zero custody is the moat.** It is the only structure viable under real trust and regulatory scrutiny — custodial competitors (voice-UI apps with manual deposit/claim) cannot match it without a rebuild.
- **Distribution wedge:** Blinks make Nyx the default betting rail embeddable in any third-party fan app or social post.

## Team
Built solo by Aaron (17). Everything here is real and reproducible — not a throwaway hack. The intent is to keep building Nyx well past the event and to work honestly with TxODDS and the Solana ecosystem long-term.

## Roadmap
Win → harden and broaden the settlement + agent stack → scale distribution and B2B verification. Direction over dates: the priority is durable, verifiable infrastructure rather than a fixed calendar.

## Verify in 60 seconds
    node scripts/nyx-agent-loop.mjs        # zero-custody agent: price -> bet for user -> trustless resolve -> claim
    node scripts/nyx-trustless-settle.mjs  # optimistic dispute -> bridge PDA resolves via CPI -> claim
    cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js  # on-chain PoI anchor (real Memo tx)
    cd nyx-mesh && node src/inplay-demo.js # live pricing; refuses to settle while undecided

Full technical detail in README.md, docs/TECHNICAL.md and DEPLOYMENTS.md.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS.
