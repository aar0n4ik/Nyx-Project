# Nyx — Invisible Web3 for football

**One offline-first fan app on Solana + Tether QVAC + TxLINE.** The interactive app is
static (`/public/nyx`) and runs 100% offline. The `/api` routes add the online extras
(AI narrative, live TxLINE match data, Solana Actions/Blinks) — all secrets stay server-side.

## What's inside

| Path | What it is |
|---|---|
| `public/nyx/*` | The offline Nyx app (3 tracks + trading calculator), PWA, 5 languages |
| `app/api/actions/bet` | Solana Action — stake USD₮ on a match (Blink-ready) |
| `app/actions.json` | Solana Actions registry |
| `app/api/txline/[...path]` | Proxy to the real TxLINE match-data API (injects the token) |
| `app/api/analyze-trade` | AI trade verdict (rule engine always; Groq if `GROQ_API_KEY` set) |
| `nyx-mesh/` | Desktop QVAC module: on-device LLM+RAG, Hyperswarm P2P mesh, WDK USD₮ wallet |

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
- **Wallet** — Tether WDK USD₮ wallet for on-device settlement (set `WDK_MODULE`).
- By default the oracle reads live scores through this project's `/api/txline` proxy, so the
  desktop works with zero secrets. Set `NYX_SNAPSHOT_BASE` to go direct to TxLINE.

## Live on Solana devnet

Real, verifiable on-chain deployment (no mocks) — full ledger in [DEPLOYMENTS.md](./DEPLOYMENTS.md).

| Item | Value |
|---|---|
| Network | Solana devnet |
| Nyx settlement wallet | `8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF` |
| Test USD₮ mint (6 dec) | `5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS` |
| First on-chain USD₮ payout | [`2xXK…soga`](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet) |
| `nyx_settlement` program | _pending devnet deploy_ |

**Auto-settlement:** the moment a market is decided by the score, `NyxAgent.autoSettle()` sends the winnings in real USD₮ via the Tether WDK — no human in the loop. Run: `NYX_AUTOPAY_DEMO=1 node nyx-mesh/src/index.js`.
