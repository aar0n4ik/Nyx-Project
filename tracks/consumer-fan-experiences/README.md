# Track 3 — Consumer & Fan Experiences

**What Nyx ships:** betting where the fans already are. Stake or delegate straight from an X/Discord post via **Solana Blinks**, a **zero-CAC affiliate** split that pays creators automatically, and an offline-first, multilingual in-play trading UI.

## Where it lives
| Component | Path |
| --- | --- |
| Bet Blink (stake USD₮ from any post) | [../../app/api/actions/bet](../../app/api/actions/bet) |
| Delegate Blink ("Delegate to Nyx" in one tap) | [../../app/api/actions/delegate](../../app/api/actions/delegate) |
| Solana Actions registry (served at `/actions.json`) | [../../public/actions.json](../../public) |
| Fan trading UI (offline-first PWA, 5 languages) | [../../public/nyx](../../public/nyx) |
| In-play widget (Poisson model, Kelly, share-as-Blink) | [../../public/nyx/nyx-trade.js](../../public/nyx/nyx-trade.js) |
| Non-custodial order API behind the widget | [../../app/api/place-order](../../app/api/place-order) |

## How the affiliate split works
A referral cut (default 5%) is **carved out of the stake** at the Action layer and routed to the referrer's token account — the user pays the same, the creator earns, and the referral is written to the on-chain memo. Zero customer-acquisition cost, composed Jupiter-style.

## On-chain proofs (devnet)
- Affiliate revenue split (5% to creator wallet): [29zHMJ9A…MLNqRS](https://explorer.solana.com/tx/29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS?cluster=devnet)
- First USD₮ payout to a fan: [2xXK…soga](https://explorer.solana.com/tx/2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA?cluster=devnet)

## Try it
- Live app: https://nyx-project-roan.vercel.app
- Blink registry: https://nyx-project-roan.vercel.app/actions.json
- Paste a bet Blink URL into [dial.to](https://dial.to) to unfurl it as an interactive card.

← Back to the [overview](../../README.md) · full ledger in [DEPLOYMENTS.md](../../DEPLOYMENTS.md)
