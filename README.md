# Nyx — Zero-Custody Prediction Markets & Trust-Minimized Settlement on Solana

**One autonomous agent that prices, bets, and settles football markets on Solana in Tether USD₮ — with zero custody of user funds, every outcome trust-minimized on-chain, and every AI inference cryptographically provable.**

Built for the Superteam × TxODDS World Cup Hackathon — one stack spanning all three tracks: **Prediction Markets & Settlement** (verifier- and dispute-gated on-chain settlement), **Trading Tools & Agents** (the zero-custody betting agent), and **Consumer & Fan Experiences** (one-tap Blinks + zero-CAC affiliate). Powered by TxLINE match data, Tether QVAC on-device inference, and Solana Actions/Blinks.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS. "TxODDS" and "TxLINE" are trademarks of their respective owners, used only to describe compatibility.

---

## Navigate by track

New here? Pick the track you care about — each folder has its own focused README (what it does, which files/programs implement it, the on-chain proofs, and how to run it). This page is the general overview that ties all three together.

| Track | Guide |
| --- | --- |
| 🏁 Prediction Markets \& Settlement | [tracks/prediction-markets-settlement](tracks/prediction-markets-settlement/README.md) |
| 🤖 Trading Tools \& Agents | [tracks/trading-tools-agents](tracks/trading-tools-agents/README.md) |
| 🎉 Consumer \& Fan Experiences | [tracks/consumer-fan-experiences](tracks/consumer-fan-experiences/README.md) |

---

## Why Nyx is different

Most "AI betting" is a chatbot with a custodial wallet. Nyx is the opposite:

- **Zero custody.** The agent never holds user funds. Users grant a capped, expiring on-chain **allowance** (Solana Foundation Subscriptions & Allowances program). The agent bets on the user's behalf via `place_bet_for`; the user owns the position and the winnings. Revoke anytime.
- **Trust-minimized outcomes.** No admin key can call `resolve()`. Outcomes survive an optimistic **dispute game** and are pushed into settlement by a **program PDA**, not a person.
- **Provable inference.** Every model call produces a signed Proof-of-Inference receipt whose digest is **anchored on-chain** in a Solana Memo tx — publicly timestamped, tamper-evident, independent of payment.
- **Distribution-native.** Bet and delegate straight from X/Discord via Solana Blinks, with a zero-CAC affiliate revenue split composed at the Action layer (Jupiter-style).

---

## The zero-custody agent (flagship)

    user grants allowance (cap + expiry)  --on-chain-->  SubscriptionAuthority PDA
              |                                                   |
              v                                                   v
    agent prices market (pAMM + Poisson/Kelly)           place_bet_for(user) --> user owns Position
              |                                                   |
              v                                                   v
    market resolves (dispute-gated oracle)               user claims winnings in USD₮
              |
              v
    agent self-stops at edge threshold; user can revoke() anytime

- Cap + expiry + revoke are enforced **on-chain**; overspend reverts with `AmountExceedsLimit`.
- Custody-stateless: losing the agent key cannot drain a user.

Proven end-to-end on devnet — run it yourself:

    node scripts/allowance-demo.mjs        # init authority, grant capped allowance, pull, reject overspend
    node scripts/allowance-expiry-demo.mjs # expiry enforced on-chain
    node scripts/allowance-claim-demo.mjs  # agent bets for user, market resolves, user claims
    node scripts/nyx-agent-loop.mjs        # fully autonomous: price -> bet within allowance -> claim

Recorded devnet markets (open in any explorer):

- claim-demo market `FAzwcBzofAQQfVFUKKF4ZG5LF2XT1g9BCiu7zYb4QSW4`
- agent-loop market `88mhZ4ajNhaLschn1EpyUeVNzkVxXNsbMRDCphNptShb`

---

## Trust-minimized settlement (TxLINE -> Solana)

TxLINE proves a feed is internally consistent — it does **not** prove an outcome is true, and gives no on-chain way to challenge a bad signer. Nyx closes that gap with **two live settlement modes**, both deployed on devnet.

**Mode 1 — proof-gated (fast path).** `nyx_verifier.settle_verified` forwards TxODDS's own `validate_stat_v2` check to the `txoracle` program via CPI and settles only if the oracle returns `verified = true` — no trusted keeper decides the outcome. The market and user positions live in the `lop` and `positions` programs.

    nyx_verifier --CPI--> txoracle.validate_stat_v2  ->  settles only if verified = true

Proof (devnet): [65r1Whd...aMXfV9v](https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet)

**Mode 2 — optimistic dispute game (fallback).** For stats the oracle cannot directly attest, three composable Anchor programs run a bonded challenge:

    propose (bond) -> dispute (matching bond) -> arbitrate -> slash wrong side
                                    |
                                    v
              nyx_oracle_bridge PDA --CPI--> nyx_settlement.resolve   (no human key)

Honest asserters reclaim their bond; wrong ones are slashed to the challenger; undisputed outcomes finalize after a liveness window.

Proofs (devnet):

- CPI resolve (dispute outcome -> settlement via PDA oracle): [q9yZGM...fwAkQ](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet)
- Dispute arbitrated, wrong side slashed: [KDsynE...dB2vPFm](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet)

---

## Pricing — recentred-LMSR pAMM

`nyx_pamm` prices live, undecided markets with a recentred-LMSR maker: LPs earn the spread, the protocol takes a cut, and **max LP loss is mathematically bounded at b·ln(n)**. See `pamm-math/`.

---

## Proof-of-Inference + on-chain anchor

`nyx-mesh/` is the on-device layer: Qwen3-4B via Tether QVAC (`@qvac/sdk`) with a deterministic fallback, a Hyperswarm P2P mesh, and a Tether WDK USD₮ wallet. Each inference emits a signed ed25519 PoI receipt binding model + prompt + output + price + payout + nonce; the digest is then **anchored on-chain** in a Solana Memo tx.

Run it (real devnet Memo tx, no mock):

    cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js

Latest anchor: [4cHmiwce...ESdMUeR](https://explorer.solana.com/tx/4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR?cluster=devnet) — digest `38d667dd86c40d94f74d0b214cd6bdaf6dc3926eed8657b91fdde54d71e8310c` verified present in the transaction logs.

---

## Distribution — Blinks + zero-CAC affiliate

- `app/api/actions/bet` — stake USD₮ on a match from any X/Discord post.
- `app/api/actions/delegate` — "Delegate to Nyx": grant the agent a capped allowance in one tap.
- `app/actions.json` — Solana Actions registry.
- Affiliate split: a referral cut is carved out of the stake at the Action layer and routed to the referrer's ATA (Jupiter-style, client-composed; on-chain protocol-fee enforcement scoped for v2). The user pays the same, the referrer earns, and the referral is written to the on-chain memo.

---

## Open-source SDKs (published)

| Package | Language | Registry | Install |
| --- | --- | --- | --- |
| `nyx-txodds-settlement` | JS/TS | npm | `npm i nyx-txodds-settlement` |
| `nyx-txodds-allowance` | JS/TS | npm | `npm i nyx-txodds-allowance` |
| `nyx-txodds-solana` | JS/TS | npm | `npm i nyx-txodds-solana` |
| `nyx-txodds-oracle` | Rust | crates.io | `cargo add nyx-txodds-oracle` |
| `nyx-txodds-verifier` | Rust | crates.io | `cargo add nyx-txodds-verifier` |

- `nyx-txodds-settlement` — instruction builders, PDA derivation, account decoders for all three settlement programs; assemble the full `assert -> dispute -> slash -> settle -> payout` loop with no IDL.
- `nyx-txodds-allowance` — instruction builders for the Subscriptions & Allowances flow (create authority, grant fixed delegation, transfer, revoke).
- `nyx-txodds-oracle` — IDL-exact borsh types + `verify_stat_cpi` helper for trustless in-program settlement.
- `nyx-txodds-solana` — high-level JS client: build and settle markets, run the agent loop, decode accounts without touching an IDL.
- `nyx-txodds-verifier` — Rust CPI verifier crate: drop `validate_stat_v2` proof-gating into any Anchor program.

---

## Revenue model

Nyx is infrastructure, not a book — it never takes the other side of a bet. Revenue:

- **Settlement fee** — basis-point fee on each USD₮ payout through `nyx_settlement`.
- **pAMM / LP spread** — recentred-LMSR maker spread; protocol takes a cut of bounded-risk LP income.
- **Blink / Action distribution** — Nyx as the default rail for third-party fan apps; volume-based fees.
- **SDK / data-verification** — the on-chain verifier SDK is a wedge into B2B trust tooling.

Cost base is near-zero: inference runs on-device (QVAC), Solana settlement is fractions of a cent.

---

## Deployments

Full ledger in `DEPLOYMENTS.md`.

| Program (Solana devnet) | ID |
| --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |
| `nyx_pamm` | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` |
| `nyx_verifier` | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` |
| `lop` (proof-gated market) | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` |
| `positions` (proof-gated positions) | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` |
| TxODDS `txoracle` (dependency) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| Subscriptions & Allowances (Solana Foundation, mainnet + devnet) | `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44` |

| Settlement proof (devnet) | Tx |
| --- | --- |
| Proof-gated CPI settle (verifier -> txoracle) | [65r1Whd...aMXfV9v](https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet) |
| First on-chain USD₮ payout | [2xXK...soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| Live auto-settlement payout | [5fxc...jsbVy](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet) |

Networks: `NYX_NETWORK=devnet` (default; test USD₮ mint you control) or `mainnet` (real Tether USD₮ `Es9vMF...`, gated behind `NYX_ALLOW_MAINNET=1`). Devnet is verified end-to-end; the mainnet path is implemented and config-ready (`nyx-mesh/.env.mainnet.example`).

Key accounts (devnet): settlement wallet `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` · test USD₮ mint `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` · agent `5Ybj5JBMzoEp7UVQV1xWQQ5V7RVgBWarBfBdNuXShKBU`.

---

## Verify it yourself (60 seconds)

    # 1) autonomous zero-custody agent (price -> bet for user -> claim)
    node scripts/nyx-agent-loop.mjs

    # 2) on-chain Proof-of-Inference anchor (real devnet Memo tx)
    cd nyx-mesh && NYX_NETWORK=devnet node src/poi-anchor-demo.js && cd ..

    # 3) live in-play pricing (Poisson + half-Kelly, refuses to settle while undecided)
    cd nyx-mesh && node src/inplay-demo.js && cd ..

Every command prints a real Solana explorer link.

---

## Repo layout

| Path | What |
| --- | --- |
| `programs/nyx-settlement` | Settlement: markets, bets, `place_bet_for`, resolve, claim |
| `programs/nyx-dispute` | Optimistic dispute game (bond / challenge / slash) |
| `programs/nyx-oracle-bridge` | PDA oracle -> settlement via CPI |
| `programs/nyx_verifier`, `programs/lop`, `programs/positions` | Proof-gated settlement stack (verifier CPI into txoracle) |
| `programs/nyx-pamm` + `pamm-math` | Recentred-LMSR pricing AMM |
| `nyx-mesh` | On-device QVAC inference, P2P mesh, WDK wallet, PoI + on-chain anchor |
| `scripts/allowance-*`, `scripts/nyx-agent-loop.mjs` | Zero-custody agent demos |
| `app/api/actions/*`, `app/actions.json` | Solana Blinks (bet, delegate) + affiliate split |
| `sdk/nyx-txodds-settlement`, `sdk/nyx-txodds-allowance` | Published JS SDKs |
| `public/nyx` | Offline-first PWA (trading calculator + track views, 5 languages) |
| `tracks/` | Per-track guides: what each hackathon track ships, where it lives, and its on-chain proofs |

---

## Deploy the web app

Push to GitHub, import on Vercel (auto-detects Next.js), deploy. `/` redirects to the offline app; `/api/*` routes add AI narrative, live TxLINE data, and Blinks — all secrets stay server-side.

---

## Live on Solana mainnet

Not devnet-only: the on-chain Proof-of-Inference anchor runs on **Solana mainnet** through the exact same code path (the settlement programs remain on devnet for the hackathon).

- Mainnet anchor tx: [2SDKgy1A...TaaH7Vn](https://explorer.solana.com/tx/2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn)
- Digest anchored on-chain: `4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8`
- Reproduce: `NYX_NETWORK=mainnet node nyx-mesh/src/poi-anchor-demo.js` (funded mainnet key required)

---

## Business model & unit economics

Nyx is infrastructure, not a book: about 99% gross margin, near-zero marginal cost, four revenue lines, zero-CAC distribution via Blinks. The affiliate revenue split is proven on-chain (a 5% cut lands in the creator wallet automatically). Full model in [BUSINESS.md](BUSINESS.md).
