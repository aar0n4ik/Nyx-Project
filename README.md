# OFFSIDE — deploy on Vercel (5 minutes, no local setup)

Offline-first fan app on **Solana + Tether QVAC + TxLINE**. The whole interactive app is
static (`/public/offside`) and runs 100% offline. The `/api` routes add the online extras
(AI narrative, live match data, optional exchange orders) — all secrets stay server-side.

## What's inside

```
app/api/analyze-trade   AI trade verdict (rule engine always; Groq if GROQ_API_KEY set)
app/api/txline/[...path] proxy to the real TxLINE match-data API (injects your token)
app/api/place-order      FUTURE Bybit order route (off until you add exchange keys)
public/offside/*         the offline OFFSIDE app (3 tracks + CryptoWay calculator)
```

## Deploy (click-by-click)

1. Put this folder in a GitHub repo (drag-and-drop upload on github.com is fine — no local git needed).
2. vercel.com → **Add New → Project** → import that repo. Framework auto-detects **Next.js**. Click **Deploy**.
3. That's it — the offline app is already live at your URL (`/` redirects to `/offside/index.html`).

The app works right now with zero env vars. Add the ones below to unlock the online parts.

## Secrets — add in Vercel → Project → Settings → Environment Variables

| Variable | What / where to get it | Needed for |
| --- | --- | --- |
| `GROQ_API_KEY` | free at console.groq.com → API Keys | AI narrative (Groq × Llama 3.3 70B) |
| `TXLINE_NET` | `devnet` (free) or `mainnet` | TxLINE |
| `TXLINE_ORIGIN` | `https://txline-dev.txodds.com` (devnet) | TxLINE |
| `TXLINE_JWT` | `curl -X POST https://txline-dev.txodds.com/auth/guest/start` → copy `token` | TxLINE |
| `TXLINE_API_TOKEN` | from the activate step (see docs/06-txline-free-api.md) | TxLINE |
| `BYBIT_API_KEY` / `BYBIT_API_SECRET` | Bybit account (FUTURE) | live orders only |

After adding vars, hit **Redeploy** once so they apply. Everything except your personal
keys is already committed — you only ever paste secrets into Vercel, never into the code.

## The free “match data” API (TxLINE) — required by the hackathon

See **docs/06-txline-free-api.md** (copied into this repo). Short version:
`curl -X POST https://txline-dev.txodds.com/auth/guest/start` gives a free guest JWT;
the World Cup tier is free. The proxy at `/api/txline/*` forwards to the real API with your
token attached server-side.

## Local (optional, if you ever want it)

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
```
