# Nyx — Technical Documentation

Nyx is a trustless settlement rail for TxODDS market data on Solana: from raw oracle stats,
to on-chain verification, to a one-tap consumer bet. Everything below is **live on Solana
devnet** and reproducible (`solana program show <ID> --url devnet`). Full ledger in `DEPLOYMENTS.md`.

## 1. Contribution per hackathon track

| Track | Nyx contribution |
| --- | --- |
| Prediction Markets & Settlement | On-chain programs that settle a market only after the outcome is either cryptographically verified against TxODDS `txoracle` (CPI) or finalized by an optimistic dispute game — never by a trusted key. |
| Trading Tools & Agents | A zero-custody agent that prices live markets (recentred-LMSR + Poisson/half-Kelly), bets on the user's behalf under an on-chain capped allowance, and self-stops when the edge is gone. |
| Consumer & Fan Experiences | Solana Actions / Blinks to bet or delegate in one tap from any X/Discord post, with a zero-CAC affiliate split. |

## 2. Two settlement modes (both live on devnet)

Nyx settles an outcome one of two ways, depending on whether TxODDS's oracle can directly attest the stat.

**Mode 1 — Proof-gated (fast path).**

    Raw TxODDS TxLINE data -> Nyx keeper (SSE/REST) -> on-chain market (lop) + positions
    settlement gated by nyx_verifier
    nyx_verifier -> CPI -> txoracle.validate_stat_v2 -> bool

`nyx_verifier.settle_verified` forwards a `validate_stat_v2` instruction to TxODDS `txoracle`
via CPI and writes the settlement record only if the oracle returns `verified = true`.
No trusted keeper decides the outcome — TxODDS's own oracle does.

**Mode 2 — Optimistic dispute game (fallback).**

    propose (bond) -> dispute (matching bond) -> arbitrate -> slash wrong side
    nyx_oracle_bridge PDA -> CPI -> nyx_settlement.resolve (no human key)

For stats the oracle cannot directly attest, an outcome is proposed under bond, may be
disputed, is arbitrated, and the wrong side is slashed; `nyx_oracle_bridge` (a PDA) then
pushes the finalized outcome into `nyx_settlement` via CPI. Undisputed outcomes finalize
after a liveness window. No human key can call `resolve()`.

Pricing for both modes comes from `nyx_pamm` (recentred-LMSR; max LP loss bounded at b·ln(n)).

## 3. Deployed programs (devnet)

| Program | Address | Role |
| --- | --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` | Escrowed YES/NO markets, place_bet_for, resolve, claim (dispute stack) |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` | Optimistic dispute game (bond / challenge / slash) |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` | PDA oracle -> settlement via CPI |
| `nyx_verifier` | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` | Proof-gated settlement (CPI into txoracle) |
| `lop` | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` | Recentred-LMSR market (proof-gated stack) |
| `positions` | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` | User positions (proof-gated stack) |
| `nyx_pamm` | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` | Probability AMM |
| TxODDS `txoracle` (dependency) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | TxODDS's own oracle; `validate_stat_v2` is the CPI target |

## 4. On-chain proofs (devnet)

| What | Tx |
| --- | --- |
| Proof-gated CPI settle (verified=true, outcome=false, slot 476364561) | `65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v` |
| Dispute-gated CPI resolve (oracle = PDA) | `q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ` |
| Dispute arbitrated, wrong side slashed | `KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm` |

Live proof page: https://nyx-project-roan.vercel.app/verify

## 5. Developer SDKs (published)

TxODDS ships TS examples + an IDL, but no Rust on-chain verifier crate. Nyx fills the gaps with unofficial, published SDKs:

| Package | Registry | Install |
| --- | --- | --- |
| `nyx-txodds-verifier` (Rust) | crates.io | `cargo add nyx-txodds-verifier` |
| `nyx-txodds-oracle` (Rust) | crates.io | `cargo add nyx-txodds-oracle` |
| `nyx-txodds-solana` (JS/TS) | npm | `npm i nyx-txodds-solana` |
| `nyx-txodds-settlement` (JS/TS) | npm | `npm i nyx-txodds-settlement` |
| `nyx-txodds-allowance` (JS/TS) | npm | `npm i nyx-txodds-allowance` |

## 6. TxLINE / TxODDS endpoints used

Base: `https://txline-dev.txodds.com` (auth: `Authorization: Bearer <jwt>` + `X-Api-Token`)

| Endpoint | Purpose |
| --- | --- |
| `GET /scores/stat-validation?fixtureId=&seq=&statKeys=` | Merkle payload + proofs for validate_stat_v2 |
| `GET /scores/snapshot/{fixtureId}?asOf=` | Point-in-time stat snapshot |
| `GET /scores/updates/{epochDay}/{hour}/{interval}?fixtureId=` | Batched score updates |
| `GET /scores/stream` (SSE) | Live score stream |
| `GET /api/odds/snapshot/{fixtureId}` | De-margined TxLINE odds |
| `GET /api/odds/stream` (SSE) | Live odds stream |

Constants: USD₮ mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`, TxLINE mint `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL`, 6 decimals.

## 7. How to reproduce

- **Proof-gated path:** `cd sdk/txodds-verifier && cargo test` (IDL-exact types); `node scripts/settle-verified.mjs` (runs the CPI settle, writes `public/settle-verified-trace.json`); open `/verify` to see the on-chain proof rendered from the trace.
- **Dispute game + zero-custody agent:** `node scripts/nyx-agent-loop.mjs` (price -> bet for user within allowance -> resolve -> claim).

## 8. Feedback for TxODDS

1. **No official Rust on-chain crate.** `tx-on-chain` ships TS + IDL, but Solana settlement
   programs are Rust. We hand-ported the `validate_stat_v2` types (borsh, proofs, strategies)
   to build a CPI verifier. A first-party Rust crate (like Chainlink Data Streams) would remove
   a major integration barrier — we published an unofficial one (`nyx-txodds-verifier`) to fill it.
2. **SSE auth ergonomics.** `/scores/stream` needs both `Authorization: Bearer` and `X-Api-Token`;
   JWT expiry returns 401/403 mid-stream with no refresh hint. A documented refresh flow or a
   longer-lived stream token would help keepers.
3. **De-margined odds `NA`.** `/api/odds` returns `Pct: "NA"` for some selections; undocumented,
   forced defensive parsing.
4. **IDL discoverability.** The difference between `validate_stat_v2` and `validate_stat_v3`
   (v3 adds `leaves`/`multiproof_hashes`/`leaf_indices`) isn't documented; inferred from IDL.
5. **Positive.** The Merkle-proof design is clean and the devnet oracle was reliable; CPI
   `validate_stat_v2` behaved exactly as the IDL implied once types matched byte-for-byte.
