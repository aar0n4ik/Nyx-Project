# Track 2 — Trading Tools & Agents

**What Nyx ships:** a **zero-custody autonomous agent** that prices in-play markets, sizes with half-Kelly, and bets *for* the user under a capped, expiring on-chain allowance — the user always owns the position and the winnings. Plus the pricing/liquidity core and trading tools around it.

## The zero-custody agent (flagship)
    user grants allowance (cap + expiry) --on-chain--> SubscriptionAuthority PDA
    agent prices market (pAMM + Poisson/Kelly) -> place_bet_for(user) -> user owns Position
    market resolves (dispute-gated) -> user claims winnings in USD₮
    agent self-stops at edge threshold; user can revoke() anytime

- Cap + expiry + revoke enforced **on-chain**; overspend reverts with `AmountExceedsLimit`.
- Losing the agent key **cannot** drain a user.

## Where it lives
| Component | Path |
| --- | --- |
| Autonomous agent loop | [../../scripts/nyx-agent-loop.mjs](../../scripts/nyx-agent-loop.mjs) |
| Allowance demos (grant / expiry / claim) | [../../scripts/allowance-demo.mjs](../../scripts) |
| Recentred-LMSR pricing core (bounded LP loss `b·ln(n)`) | [../../pamm-math](../../pamm-math) · [../../programs/nyx-pamm](../../programs/nyx-pamm) |
| Order book + positions | [../../programs/lop](../../programs/lop) · [../../programs/positions](../../programs/positions) |
| Live oracle keeper / odds feed | [../../scripts/txline-oracle-keeper.mjs](../../scripts/txline-oracle-keeper.mjs) · [../../scripts/txline-odds-oracle.mjs](../../scripts/txline-odds-oracle.mjs) · [../../scripts/lop-cycle.mjs](../../scripts/lop-cycle.mjs) |
| Trade-risk analyzer (rule engine + optional LLM) | [../../app/api/analyze-trade](../../app/api/analyze-trade) |
| Non-custodial order API (unsigned tx builder) | [../../app/api/place-order](../../app/api/place-order) |
| One-tap delegation Blink | [../../app/api/actions/delegate](../../app/api/actions/delegate) |
| SDKs | [../../sdk/nyx-txodds-allowance](../../sdk/nyx-txodds-allowance) · [../../sdk/txodds-solana-js](../../sdk/txodds-solana-js) |

## Deployed (devnet)
| Program | ID |
| --- | --- |
| nyx_pamm | `8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3` |
| lop | `6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83` |
| positions | `5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu` |
| Subscriptions & Allowances (Solana Foundation) | `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44` |

## On-chain proofs (devnet)
- Agent bets for user (allowance tick 1): [7JFQB78…doFwBME](https://explorer.solana.com/tx/7JFQB78pxJ1BCNFBdpP8Hou9rUjvLncXT6P3bBPJBbiDdMaXnPxcQaNGvMLuqkL7weT51DeduzrrkPxqdoFwBME?cluster=devnet)
- Agent-loop trustless resolve: [3DqcdD5…GMaev](https://explorer.solana.com/tx/3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev?cluster=devnet)
- User claims agent-won payout: [2Xs7NdN…Xf9X](https://explorer.solana.com/tx/2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X?cluster=devnet)

## Run it (devnet)
    node scripts/nyx-agent-loop.mjs   # price -> bet for user within allowance -> resolve -> claim
    cd nyx-mesh && node src/inplay-demo.js   # live pricing; refuses to settle while undecided

← Back to the [overview](../../README.md) · full ledger in [DEPLOYMENTS.md](../../DEPLOYMENTS.md)
