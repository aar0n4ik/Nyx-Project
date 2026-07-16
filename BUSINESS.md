# Nyx — Business & Unit Economics

## TL;DR
Nyx is **settlement infrastructure** for prediction markets, not a book. It never takes the other side of a bet, so revenue scales with volume, not risk. Near-zero marginal cost, about 99% gross margin, four revenue lines, and zero-CAC distribution through Solana Blinks. The monetization is not slideware -- the affiliate revenue split executes on-chain (proof below).

## Market
- Global sports-betting gross gaming revenue is about $100B+/yr and growing; the football World Cup is the single largest betting event on earth.
- On-chain prediction markets are now mainstream (Polymarket cleared billions in cumulative volume). Crypto-native, trust-minimized settlement is still greenfield.
- Nyx does not compete for gamblers. It sells rails to the apps, creators, and communities that already own the audience.

## Revenue lines
1. **Settlement fee** -- basis points on settled volume (protocol take rate).
2. **pAMM / LP spread** -- market-making spread captured on pool trades.
3. **Blink distribution / affiliate** -- protocol cut on affiliate-routed volume.
4. **SDK / B2B data-verification** -- paid API for verifiable, anchored results (Proof-of-Inference).

## Unit economics (illustrative model)
Marginal cost per settled bet:
- Solana transaction fee: about 0.000005 SOL, on the order of $0.001
- Inference: on-device (QVAC) = $0 marginal
- Total marginal cost: well under $0.01 per settlement

Revenue per bet (example: 1% fee on a $20 stake): about $0.20
Implied gross margin: about 99%.

Conservative scale example (assumptions, not actuals):
- 10 creators x 5,000 active fans x 2 bets/week x $20 stake = about $8M monthly volume
- 1% settlement fee = about $80k / month
- marginal settlement cost at that volume: a few hundred dollars / month
- gross margin stays about 99% because costs are effectively fixed near zero

## Go-to-market -- zero customer-acquisition cost
- Blinks embed inside any X post, fan site, or chat -> one-tap bet, no app install, no redirect.
- The affiliate split pays creators automatically on-chain, so creators distribute Nyx for us.
- This is proven on-chain, not theoretical: on a 10 USDT stake, the affiliate wallet received its 5% cut (0.5 USDT) and the treasury received 9.5 USDT in a single transaction.

## Moat
- **Zero-custody.** Nyx never holds user funds. This is the only structure that survives real regulatory scrutiny; custodial competitors (voice-UI apps with manual deposit/claim) cannot match it without a full rebuild.
- **Trust-minimized settlement.** No admin key can force a resolution; disputes are slashed and resolved via on-chain program logic, and results are anchored with Proof-of-Inference (live on Solana mainnet).
- **Distribution wedge.** Blinks make Nyx the default betting rail embeddable in any third-party surface.

## Proof (on-chain)
- Affiliate revenue split (devnet): https://explorer.solana.com/tx/29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS?cluster=devnet
- Proof-of-Inference anchor (Solana mainnet): https://explorer.solana.com/tx/2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn
- Published SDKs: npm nyx-txodds-settlement, npm nyx-txodds-allowance, crates.io nyx-txodds-oracle
- Reproduce the split: node scripts/revenue-split-demo.mjs

## Disclaimer
Volume and revenue figures above are an illustrative model of commercial potential, not realized revenue or user traction. Unofficial community project; not affiliated with, sponsored by, or endorsed by TxODDS.
