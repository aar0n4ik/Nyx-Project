# nyx-txodds-settlement

Trust-minimized settlement for TxODDS / TxLINE sports data on Solana. Client-side
instruction builders, PDA derivation and account decoders for the three on-chain
programs behind the Nyx settlement stack. No IDL, no framework — just `@solana/web3.js`.

```bash
npm i nyx-txodds-settlement @solana/web3.js
```

## Why this exists

TxLINE gives you fast, signed sports data, and it proves the data is the data it
committed to (a Merkle root). What it does **not** prove is that the outcome is *true*,
and there is no on-chain way to challenge a bad signer. So in practice every prediction
market built on a feed ends up with an admin key that can call `resolve()` — which means
the whole "decentralized" market is one leaked key away from being drained or rigged.

That is the gap this package closes. An outcome only becomes final after surviving an
optimistic dispute game, and the market's oracle is a **program PDA**, not a person:

```
propose (bond) -> dispute (matching bond) -> arbitrate -> slash the wrong side
                                     |
                                     v
        oracle-bridge PDA --CPI--> settlement.resolve   (no human key, ever)
```

- Honest asserters get their bond back. Wrong asserters get slashed to the challenger.
- Undisputed outcomes finalize automatically after a liveness window.
- The only path an outcome can reach settlement is `push_resolution`, which forwards the
  exact result the dispute layer already finalized. It reverts otherwise.

## What you get

- `settlement` — build `create_market`, `place_bet`, `claim`, `resolve`
- `dispute` — build `propose`, `dispute`, `settle_undisputed`, `arbitrate`
- `bridge` — build `create_bound_market`, `push_resolution`
- `pda` — derive every PDA (market, vault, position, assertion, dispute vault, oracle)
- `decodeMarket`, `decodeAssertion` — read on-chain account state
- `disc`, `u64le`, `i64le`, `PROGRAM_IDS`, `STATE`, `TOKEN_PROGRAM_ID`

## Programs (Solana devnet)

| Program | ID |
| --- | --- |
| `nyx_settlement` | `AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3` |
| `nyx_dispute` | `7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN` |
| `nyx_oracle_bridge` | `BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk` |

## Quick start — the full trustless loop

```js
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { settlement, dispute, bridge, pda, decodeMarket } from "nyx-txodds-settlement";

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const fixtureId = 2001, marketKey = [3, 0, 0, 0, 0, 0, 0, 0];
const send = (ix, signers) => {
  const tx = new Transaction().add(ix);
  tx.feePayer = signers[0].publicKey;
  return sendAndConfirmTransaction(conn, tx, signers);
};

// 1. Create a market whose oracle is the bridge PDA (no human can resolve it).
await send(bridge.createBoundMarket({ fixtureId, marketKey, closeTs, mint }), [payer]);

// 2. Bettors stake opposite sides.
await send(settlement.placeBet({ fixtureId, marketKey, bettor: alice.publicKey, bettorAta, sideYes: true, amount: 10_000000 }), [alice]);

// 3. The dispute layer decides the real outcome.
await send(dispute.propose({ fixtureId, marketKey, proposer: p.publicKey, proposerAta, mint, arbiter, outcomeYes: false, bond: 10_000000, liveness: 3600 }), [p]);
await send(dispute.dispute({ fixtureId, marketKey, disputer: d.publicKey, disputerAta }), [d]);
await send(dispute.arbitrate({ fixtureId, marketKey, arbiter, winnerAta, finalOutcomeYes: true }), [arbiterKp]);

// 4. Anyone can push the finalized outcome into settlement — but only that outcome.
await send(bridge.pushResolution({ fixtureId, marketKey }), [payer]);

// 5. Winner claims; loser is rejected by the program.
await send(settlement.claim({ fixtureId, marketKey, bettor: alice.publicKey, bettorAta }), [alice]);

const market = decodeMarket((await conn.getAccountInfo(pda.market(fixtureId, marketKey))).data);
console.log(market.resolved, market.outcomeYes); // true true
```

## Account layouts

Offsets are given after the 8-byte Anchor discriminator.

**Market** — `authority@8`, `oracle@40`, `vault@72`, `mint@104`, `fixture_id u64@136`,
`market_key[8]@144`, `close_ts i64@152`, `pool_yes u64@160`, `pool_no u64@168`,
`resolved@176`, `outcome_yes@177`, `bump@178`.

**Assertion** — `arbiter@8`, `mint@40`, `vault@72`, `proposer@104`, `disputer@136`,
`fixture_id u64@168`, `market_key[8]@176`, `proposed_outcome_yes@184`,
`final_outcome_yes@185`, `bond u64@186`, `challenge_end_ts i64@194`, `state@202`, `bump@203`.

## Proven on devnet

Not a mock — this is the exact stack these builders target, run end-to-end on devnet:

- CPI resolve (dispute outcome pushed into settlement, oracle = PDA):
  [`q9yZGM…fWAkQ`](https://explorer.solana.com/tx/q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ?cluster=devnet)
- Dispute arbitrated, wrong side slashed:
  [`KDsynE…dB2vPFm`](https://explorer.solana.com/tx/KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm?cluster=devnet)

## License

MIT.

> Unofficial community project. Not affiliated with, sponsored by, or endorsed by TxODDS
> or Tether. "TxODDS", "TxLINE" and "USD₮" are trademarks of their respective owners;
> used only to describe compatibility.
