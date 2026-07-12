# nyx-mesh — Nyx desktop brain (QVAC + P2P + USD₮)

The offline-first, peer-to-peer engine behind Nyx. Three real subsystems:

| Module | What it does |
|---|---|
| `src/qvac-brain.js` | On-device LLM + lightweight RAG. Tier 1 real `@qvac/sdk`, Tier 2 QVAC OpenAI-compatible server (`127.0.0.1:8787`), Tier 3 deterministic rules — verdicts never stop, even fully offline. |
| `src/mesh.js` | Hyperswarm P2P mesh. Gossips verified TxLINE snapshots device-to-device with seq de-dupe + TTL flooding, so match truth survives server/network outages. |
| `src/txline-oracle.js` | TxLINE guest-auth + live snapshot client; normalizes the feed for the brain and the mesh. |
| `src/wallet.js` | USD₮ settlement via Tether WDK (module name configurable via `WDK_MODULE`). |
| `src/agent.js` | Orchestrator: oracle → mesh → brain → optional USD₮ settlement. |

## Why it matters (the synergy)
QVAC gives Nyx a private on-device brain; Solana/TxLINE give it verifiable truth and instant settlement.
The Hyperswarm mesh means a phone with no internet still gets live match state from a nearby peer that does
— that is the "invisible Web3" layer: it just works, offline, private, and trustless.

## Run the live demo
    cp .env.example .env   # fill TXLINE_JWT / TXLINE_API_TOKEN
    npm install
    npm run demo
You'll see the mesh come up, TxLINE snapshots stream in, and an on-device verdict print after ~14s.
With no internet + a peer on the same topic, snapshots still arrive over P2P.

## Use from the Electron app
    import { createNyx } from "nyx-mesh"
    const nyx = createNyx({ fixtures: [17588232], topic: "txline-worldcup" })
    nyx.on("snapshot", ({ snapshot, source }) => renderLive(snapshot, source))
    await nyx.start()
    const r = await nyx.analyze({ fixtureId: 17588232, market: "ou25", bookOdds: 1.95, bankroll: 1000 })
    // r.verdict.engine === "QVAC on-device · qwen3-4b" when the model is loaded

## Notes
- `@qvac/sdk` is an optionalDependency — install the real Tether QVAC SDK from docs.qvac.tether.io to enable Tier 1.
- Confirm the exact WDK package name from the QVAC docs and set `WDK_MODULE`; until then the agent runs and reports settlement as unavailable rather than faking it.
