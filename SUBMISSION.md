<# Nyx — trust-minimized settlement layer for TxLINE sports data

## The gap
TxLINE/TxODDS delivers signed, Merkle-committed sports data. But a signature only
proves *who* published a number — not that the number is *true*, and there is no
on-chain way to challenge a bad or malicious signer. Every downstream prediction
market therefore inherits a single trusted oracle. That is the #1 blocker to
permissionless markets on this data.

## What Nyx adds
An optimistic dispute + slashing layer that turns a trusted feed into a
trust-minimized one, and wires it directly into parimutuel settlement — end to end,
with no human key in the money path.

1. **nyx_dispute** — an outcome is PROPOSED with a bond. Anyone can DISPUTE with a
   matching bond during a liveness window. Undisputed outcomes finalize
   automatically; disputed ones are arbitrated and the wrong party's bond is
   slashed to the winner.
2. **nyx_oracle_bridge** — a market is created with its oracle set to a *program
   PDA*, so no human can resolve it. A permissionless `push_resolution` reads the
   finalized dispute assertion and CPIs into settlement with the exact outcome the
   dispute layer produced.
3. **nyx_settlement** — real-escrow parimutuel markets; winners claim their share
   of the losing pool.

Plus an off-chain mesh (QVAC delegated inference + Proof-of-Inference receipts,
paid per token in USD₮ via WDK, with a provider registry + reputation) that turns
model providers into paid, verifiable, discoverable participants.

## Live on Solana devnet (verifiable)
- nyx_dispute        7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN
- nyx_oracle_bridge  BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk
- nyx_settlement     AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3
- nyx_verifier       GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY

End-to-end trustless resolution tx (dispute → CPI → settlement):
  q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ
Dispute arbitration + slash tx:
  KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm
Proof-of-Inference paid inference tx:
  23kX4qxtf2SNByRLizzRRGkthgSqiUi91akZ9RSqnJBpaGytMhiaJen3J2yNiYmeeQJzZNVKPPrnyGzPjjbxJ8Ar

## Stack
Rust/Anchor 0.30.1, Solana, SPL USD₮, Tether WDK (@tetherto/wdk-wallet-solana),
Tether QVAC delegated inference, TxLINE data feed, Next.js frontend.

## Links
- Live: https://nyx-project-roan.vercel.app
- Code: https://github.com/aar0n4ik/Nyx-Project
- Reproduce: `node scripts/settlement-cpi-demo.mjs` (full loop on devnet)

## Why it wins commercially
It makes TxLINE data usable by *permissionless* markets without trusting the feed:
disputes are economically secured, settlement is driven by a program PDA, and the
whole path is reproducible on-chain today.>
