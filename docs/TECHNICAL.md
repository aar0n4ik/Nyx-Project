# Nyx — Technical Documentation

Nyx is a trustless settlement rail for TxODDS market data on Solana: from raw oracle
stats, to on-chain verification, to a one-tap consumer bet. Everything below is live on
Solana **devnet** and reproducible.

## 1. Contribution per hackathon track

| Track | Nyx contribution |
| --- | --- |
| Prediction Markets & Settlement | On-chain program that settles a market only after cryptographically verifying the outcome against TxODDS `txoracle` via CPI. |
| Trading Tools & Agents | Odds-oracle keeper that ingests de-margined TxLINE prices (SSE/REST) and pushes them on-chain; edge detection. |
| Consumer & Fan Experiences | Solana Action / Blink to "take the other side" of a bet in one tap. |

## 2. Architecture

Raw TxODDS TxLINE data -> Nyx keeper (SSE/REST) -> on-chain market (lop)
User bet -> positions program -> settlement gated by nyx_verifier
nyx_verifier -> CPI -> txoracle.validate_stat_v2 -> bool

Key innovation: **proof-gated settlement**. `nyx_verifier.settle_verified` forwards a
`validate_stat_v2` instruction to `txoracle` via CPI and writes the settlement record
only if the oracle returns `verified = true`. No trusted keeper decides outcomes.

## 3. Deployed programs (devnet)

| Program | Address |
| --- | --- |
| nyx_verifier (proof-gated settlement) | `GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY` |
| lop (recentred-LMSR market) | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` |
| positions (user positions) | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` |
| nyx_pamm (probability AMM) | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` |
| nyx_settlement | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| TxODDS txoracle (dependency) | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

## 4. On-chain proof

Trustless CPI settlement (devnet):
`65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v`
- verified = true, outcome = false, slot = 476364561
- Explorer: https://explorer.solana.com/tx/65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v?cluster=devnet
- Live proof page: https://nyx-project-roan.vercel.app/verify

## 5. Developer SDK (published)

TxODDS ships TS examples + an IDL, but no Rust on-chain verifier crate. Nyx fills the gap
with an unofficial, published SDK:

| Package | Registry | Install |
| --- | --- | --- |
| `nyx-txodds-verifier` (Rust) | https://crates.io/crates/nyx-txodds-verifier | `cargo add nyx-txodds-verifier` |
| `nyx-txodds-solana` (JS/TS) | https://www.npmjs.com/package/nyx-txodds-solana | `npm i nyx-txodds-solana` |

## 6. TxLINE / TxODDS endpoints used

Base: `https://txline-dev.txodds.com` (auth: `Authorization: Bearer <JWT>` + `X-Api-Token`)

| Endpoint | Purpose |
| --- | --- |
| `GET /scores/stat-validation?fixtureId=&seq=&statKeys=` | Merkle payload + proofs for validate_stat_v2 |
| `GET /scores/snapshot/{fixtureId}?asOf=` | Point-in-time stat snapshot |
| `GET /scores/updates/{epochDay}/{hour}/{interval}?fixtureId=` | Batched score updates |
| `GET /scores/stream` (SSE) | Live score stream |
| `GET /api/odds/snapshot/{fixtureId}` | De-margined TXLine odds |
| `GET /api/odds/stream` (SSE) | Live odds stream |

Constants: USD-T mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`, TXLINE mint
`Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL`, 6 decimals.

## 7. How to reproduce

1. `cd sdk/txodds-verifier && cargo test` — 5/5 unit tests (IDL-exact types).
2. `node scripts/settle-verified.mjs` — runs the CPI settle; writes `public/settle-verified-trace.json`.
3. Open `/verify` to see the on-chain proof rendered from the trace.

## 8. Feedback for TxODDS

1. **No official Rust on-chain crate.** `tx-on-chain` ships TS + IDL, but Solana settlement
   programs are Rust. We hand-ported the `validate_stat_v2` types (borsh, proofs,
   strategies) to build a CPI verifier. A first-party Rust crate (like Chainlink Data
   Streams) would remove a major integration barrier — we published an unofficial one
   (`nyx-txodds-verifier`) to fill it.
2. **SSE auth ergonomics.** `/scores/stream` needs both `Authorization: Bearer <JWT>` and
   `X-Api-Token`; JWT expiry returns 401/403 mid-stream with no refresh hint. A documented
   refresh flow or a longer-lived stream token would help keepers.
3. **De-margined odds `NA`.** `/api/odds` returns `Pct: "NA"` for some selections; undocumented,
   forced defensive parsing.
4. **IDL discoverability.** The difference between `validate_stat_v2` and `validate_stat_v3`
   (v3 adds `leaves`/`multiproof_hashes`/`leaf_indices`) isn't documented; inferred from IDL.
5. **Positive.** The Merkle-proof design is clean and the devnet oracle was reliable; CPI
   `validate_stat_v2` behaved exactly as the IDL implied once types matched byte-for-byte.
