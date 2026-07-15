# nyx-txodds-solana

Unofficial community SDK for building and verifying TxODDS **txoracle**
`validate_stat_v2` instructions on Solana. **Not affiliated with, or endorsed
by, TxODDS.** TxODDS ships TypeScript examples and an IDL; this package packages
the payload/strategy/CPI plumbing into a reusable, typed helper.

## Install

    npm install nyx-txodds-solana @coral-xyz/anchor @solana/web3.js bn.js

## What it does

- Maps a raw `/scores/stat-validation` REST response into the on-chain
  `StatValidationInput` payload (byte-accurate to the official example).
- Builds `NDimensionalStrategy` (discrete / binary / geometric) with tiny helpers.
- Derives the `daily_scores_roots` PDA (`[seed, u16_le(epochDay)]`).
- Returns raw `validate_stat_v2` instruction bytes for CPI forwarding, or
  simulates the boolean result off-chain via `.view()`.

## Usage

    import { Program, AnchorProvider } from "@coral-xyz/anchor"
    import {
      TXORACLE_DEVNET, fetchTxoracleIdl, buildStatValidationPayload,
      epochDayFromMillis, deriveDailyScoresRootsPda,
      defaultDiscreteStrategy, validateStatV2View,
    } from "nyx-txodds-solana"

    const idl = await fetchTxoracleIdl()
    const program = new Program(idl, provider) // provider = AnchorProvider

    const val = await (await fetch(REST_URL)).json()
    const payload = buildStatValidationPayload(val)
    const epochDay = epochDayFromMillis(val.summary.updateStats.minTimestamp)
    const [pda] = deriveDailyScoresRootsPda(TXORACLE_DEVNET, epochDay)
    const strategy = defaultDiscreteStrategy(val.statsToProve.length)

    const verified = await validateStatV2View(program, payload, strategy, pda)
    console.log("verified:", verified)

For trustless CPI settlement, use `buildValidateStatV2IxData(...)` to get the
raw bytes and forward them from your own program.

## License

MIT


## Trademark

"TxODDS" is a trademark of its respective owner. This package is an independent, unofficial community project, not affiliated with, sponsored by, or endorsed by TxODDS. The name is used only to describe compatibility.
