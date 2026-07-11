# TxLINE — the free “match data” API (what/where/why/how)

**This is the API you saw. It is REQUIRED by the hackathon** — every submission must use
real TxLINE match data as input. The good news: the World Cup tier is **free** (no token
purchase), and a guest login is free too.

## What it is

TxLINE (by TxODDS) is a Solana-native oracle for **live football/soccer match data**:
scores, goals, cards, corners — with **cryptographic proofs** that a stat is real (Merkle
proof validated on-chain via `validateStatV2`). So your app doesn't just *show* a score, it
can *prove* the score is genuine. That proof is exactly what powers OFFSIDE's settlement.

## Why we need it

- Hackathon hard requirement: “real TxLINE input + a deployed devnet/mainnet build.”
- It's our synergy anchor: offline vote/trade → signed locally → **settled against a real
  TxLINE proof** when back online. No proof = no trust. TxLINE gives the proof.

## Where to go (step by step, free path)

1. **Docs / OpenAPI:** https://txline.txodds.com/docs — spec at `/docs/docs.yaml`.
   Machine index: https://txline-docs.txodds.com/llms.txt
2. **Community (ask for devnet access / help):** Discord https://discord.gg/txodds ·
   Telegram https://t.me/TxLINEChat
3. **Get a free guest token** — one POST, no signup:
   ```bash
   curl -X POST https://txline-dev.txodds.com/auth/guest/start
   # -> { "token": "<guest JWT>" }
   ```
4. **Free World Cup tier = service level 1** (devnet has no sampling delay). For the free
   tier you don't buy TxL; you activate an API token bound to your guest JWT. Full activate
   flow (guest → on-chain subscribe → sign → activate) is already coded in
   `packages/txline-oracle/src/client.ts`.
5. Data requests then send two headers: `Authorization: Bearer <jwt>` and
   `X-Api-Token: <apiToken>`.

## What you actually call (already implemented for you)

`packages/txline-oracle/src/client.ts` — verified against the real API:

| Need | Method | Endpoint |
| --- | --- | --- |
| Live scores stream | `streamScores()` | `GET /api/scores/stream` (SSE) |
| Score at a moment | `scoresSnapshot(fixtureId)` | `GET /api/scores/snapshot/{id}` |
| Interval updates | `scoresUpdates(day,hour,int)` | `GET /api/scores/updates/...` |
| **Proof a stat is real** | `statValidation({fixtureId,seq,statKeys})` | `GET /api/scores/stat-validation` |

The proof from `stat-validation` is fed to the on-chain `validateStatV2(payload, strategy)`
view (Merkle root PDA per `epochDay`) → returns true/false. That boolean is what settles a
market. `epochDay` MUST come from `summary.updateStats.minTimestamp`, never `Date.now()`.

Soccer stat keys: `1/2` goals, `3/4` yellows, `5/6` reds, `7/8` corners; period prefixes
`0`=full, `1000`=H1, `2000`=HT, `3000`=H2. Final whistle = `action=game_finalised`
(statusId=100). All in `packages/txline-oracle/src/config.ts`.

## What to do now (2 minutes) vs later (go-live)

**Now (free, no cost):**
1. `curl -X POST https://txline-dev.txodds.com/auth/guest/start` → copy the token.
2. Join the Discord and say you're in the World Cup Hackathon → they point you to free
   devnet access / any fixtures to test.

**Later (go-live, still free tier):** run the subscribe+activate script on devnet, then set
in `config.js`: `window.TXLINE_PROXY = "https://<your-app>/api/txline"` and
`window.TXLINE_NET = "devnet"`. The proxy just holds your JWT+apiToken server-side and
forwards to `txline-dev.txodds.com/api/*` (keys never touch the browser). Empty proxy =
fully local demo with built-in sample fixtures (nothing breaks offline).

## Bybit / exchange execution

Left intact for the future — config-gated behind an empty `CW_ORDER_PROXY`, so it never
fires in the local demo. Nothing to change, nothing broken.
