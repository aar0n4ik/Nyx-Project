# Nyx — Invisible Web3 for football

**One offline-first fan app on Solana + Tether QVAC + TxLINE.** The interactive app is
static (`/public/nyx`) and runs 100% offline. The `/api` routes add the online extras
(AI narrative, live TxLINE match data, Solana Actions/Blinks) — all secrets stay server-side.

## What's inside

| Path | What it is |
|---|---|
| `public/nyx/*` | The offline Nyx app (trading calculator + track views), PWA, 5 languages |
| `app/api/actions/bet` | Solana Action — stake USD₮ on a match (Blink-ready) |
| `app/actions.json` | Solana Actions registry |
| `app/api/txline/[...path]` | Proxy to the real TxLINE match-data API (injects the token) |
| `app/api/analyze-trade` | AI trade verdict (rule engine always; Groq if `GROQ_API_KEY` set) |
| `nyx-mesh/` | Desktop QVAC module: on-device LLM+RAG, Hyperswarm P2P mesh, WDK USD₮ wallet |
| `programs/nyx-settlement` | Anchor settlement program (Solana devnet, live) |
| `pamm-math` + pAMM program | Recentred-LMSR probability AMM (Solana devnet, live) |
| `sdk/` | Reusable TxODDS on-chain verification SDK (Rust crate + JS package) |

## Deploy (Vercel)

1. Push this repo to GitHub.
2. vercel.com → Add New → Project → import the repo. Framework auto-detects **Next.js**. Deploy.
3. `/` redirects to `/nyx/index.html`. The offline app is live immediately.

## Desktop module (nyx-mesh)

\`\`\`bash
cd nyx-mesh && npm install && npm run demo
\`\`\`

- **Brain** — on-device Qwen3-4B via `@qvac/sdk` (LLM+RAG), with a deterministic fallback.
- **Mesh** — Hyperswarm P2P: devices gossip TxLINE snapshots peer-to-peer, no server.
- **Wallet** — Tether WDK USD₮ wallet for on-device settlement.
- By default the oracle reads live scores through this project's `/api/txline` proxy, so the
  desktop works with zero secrets. Set `NYX_SNAPSHOT_BASE` to go direct to TxLINE.

### Live in-play agent demo (real edge, not a rigged scenario)

\`\`\`bash
cd nyx-mesh && node src/inplay-demo.js
\`\`\`

Prices a **live, undecided** market with a Poisson model + half-Kelly staking, **refuses to
settle while the outcome is uncertain**, then pays the winner in real USD₮ the instant the
market is mathematically GUARANTEED (e.g. the 3rd goal settles Over 2.5). No human in the loop.

## Settlement networks

Nyx settles in USD₮ via the Tether WDK. The network is chosen with `NYX_NETWORK`:

| Network | Default | USD₮ mint | Notes |
|---|---|---|---|
| `devnet` | ✅ default | test mint you control | free, fully verifiable — used for all demos below |
| `mainnet` | opt-in | real Tether USD₮ (`Es9vMF…`) | requires `NYX_ALLOW_MAINNET=1` safety flag to send |

Devnet is verified end-to-end (see below). The mainnet path is implemented and config-ready
(`nyx-mesh/.env.mainnet.example`); it awaits a funded wallet to run live.

## Live on Solana devnet

Real, verifiable on-chain deployment (no mocks) — full ledger in [DEPLOYMENTS.md](./DEPLOYMENTS.md).

| Item | Value |
|---|---|
| Network | Solana devnet |
| Nyx settlement wallet | `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` |
| Test USD₮ mint (6 dec) | `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` |
| `nyx_settlement` program | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_pamm` program | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` |
| First on-chain USD₮ payout | [`2xXK…soga`](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| Live auto-settlement payout | [`5fxc…jsbVy`](https://explorer.solana.com/tx/5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy?cluster=devnet) |

**Auto-settlement:** the moment a market is decided by the score, `NyxAgent.autoSettle()` sends
the winnings in real USD₮ via the Tether WDK — no human in the loop.

## Revenue model

Nyx is infrastructure, not a book — it never takes the other side of a bet. Revenue comes from
being the settlement and pricing rails:

- **Settlement fee** — a small basis-point fee on each USD₮ payout routed through `nyx_settlement`.
- **pAMM spread / LP fee** — the recentred-LMSR maker charges a spread; LPs earn it, the protocol takes a cut. Max LP loss is mathematically bounded at `b·ln(n)`.
- **Blink/Action distribution** — staking straight from X/Discord makes Nyx the default rail for third-party fan apps; volume-based fees.
- **SDK / data-verification** — the TxODDS on-chain verifier SDK is a wedge into B2B trust tooling for other builders.

Cost base is near-zero: inference runs on-device (QVAC), and Solana settlement is fractions of a cent.

## Developer SDK — TxODDS on-chain verification

Nyx ships a reusable, **unofficial** SDK for building & verifying TxODDS `txoracle`
`validate_stat_v2` instructions on Solana. It fills a gap TxODDS's own tooling leaves
open: they publish TypeScript examples + an IDL, but no Rust on-chain verifier crate.

| Package | Registry | Install |
| --- | --- | --- |
| `nyx-txodds-verifier` (Rust) | [crates.io](https://crates.io/crates/nyx-txodds-verifier) | `cargo add nyx-txodds-verifier` |
| `nyx-txodds-solana` (JS/TS) | [npm](https://www.npmjs.com/package/nyx-txodds-solana) | `npm i nyx-txodds-solana` |

- **Rust crate** — IDL-exact borsh types, instruction builders, PDA derivation, and CPI
  helpers (`verify_stat_cpi`) for trustless in-program settlement. 5/5 unit tests passing.
- **JS package** — REST→payload mapping, strategy builders, and `validateStatV2View`
  for off-chain simulation of the verification result.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS.
> "TxODDS" is a trademark of its respective owner; used only to describe compatibility.

## Trust-minimized settlement layer (TxLINE → Solana)

TxLINE proves a feed is internally consistent (a Merkle root over the data it published).
It does **not** prove an outcome is *true*, and it gives you no on-chain way to challenge a
bad signer. So every prediction market built directly on a feed inherits an admin key that
can call `resolve()` — one leaked key and the "trustless" market is drained or rigged.

Nyx closes that gap with three composable Anchor programs. An outcome only reaches
settlement after surviving an optimistic dispute game, and the market's oracle is a
**program PDA**, not a person:

```
propose (bond) -> dispute (matching bond) -> arbitrate -> slash the wrong side
                                   |
                                   v
      nyx_oracle_bridge PDA --CPI--> nyx_settlement.resolve   (no human key)
```

Honest asserters reclaim their bond; wrong ones are slashed to the challenger; undisputed
outcomes finalize after a liveness window. The bridge's `push_resolution` is permissionless
but can forward *only* the outcome the dispute layer already finalized — anything else reverts.

| Program (devnet) | ID |
| --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |

Proven end-to-end on devnet (no mocks):

- CPI resolve — dispute outcome pushed into settlement through the PDA oracle: [`q9yZGM…fWAkQ`](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet)
- Dispute arbitrated, wrong side slashed: [`KDsynE…dB2vPFm`](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet)

### Developer SDK — settlement stack

| Package | Registry | Install |
| --- | --- | --- |
| `nyx-txodds-settlement` (JS/TS) | [npm](https://www.npmjs.com/package/nyx-txodds-settlement) | `npm i nyx-txodds-settlement` |

Instruction builders, PDA derivation and account decoders for all three programs, so anyone
can assemble the full `assert -> dispute -> slash -> settle -> payout` loop without an IDL.
See [`sdk/nyx-txodds-settlement`](./sdk/nyx-txodds-settlement).
