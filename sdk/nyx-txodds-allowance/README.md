# nyx-txodds-allowance

Zero-custody, capped, auto-expiring **agent spending** on Solana — hand-built instruction builders for the Solana Foundation **Subscriptions & Allowances** program (Fixed Delegation model), the same primitive that powers Nyx `place_bet_for`.

> A user taps once. The Nyx agent can then bet on their behalf — pulling **only up to a cap**, **only until an expiry**, and **every position it opens is owned by the user**. The agent never takes custody. Real devnet/mainnet transactions against program `De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`. No mock.

## Install

    npm i nyx-txodds-allowance @solana/web3.js

## Quickstart

    import {
      subscriptionAuthorityPda, fixedDelegationPda,
      initSubscriptionAuthorityIx, createFixedDelegationIx,
      transferFixedIx, revokeDelegationIx, readSaInitId,
    } from "nyx-txodds-allowance"

    // 1. user enables a Subscription Authority for a mint (once per mint)
    const sa = subscriptionAuthorityPda(user, mint)
    const ixInit = initSubscriptionAuthorityIx({ user, mint, userAta })

    // 2. user grants the agent a capped, auto-expiring allowance
    const nonce = BigInt(Date.now())
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400) // 7 days; 0n = no expiry
    const ixGrant = createFixedDelegationIx({
      user, delegatee: agent, mint, nonce,
      amount: 25_000_000n,                   // 25 USD-T (6 decimals)
      expiryTs: expiry,
      saInitId: readSaInitId(saAccountData), // read fresh from the SA account
    })
    const delegation = fixedDelegationPda(sa, user, agent, nonce)

    // 3. the AGENT (delegatee) pulls funds — only it can sign this
    const ixPull = transferFixedIx({
      delegatee: agent, delegator: user, mint,
      delegationPda: delegation, delegatorAta, receiverAta,
      amount: 3_000_000n,
    })

    // 4. the user can revoke any time — closes the delegation, rent back to user
    const ixRevoke = revokeDelegationIx({ authority: user, delegationPda: delegation })

## Why it matters

Traditional "let a bot trade for me" flows hand the bot your keys or your funds. This doesn't. The allowance is a **fixed delegation**: a hard cap that decrements per pull, an optional hard expiry, and a delegatee-only pull authority — all enforced on-chain. The kill-switches are structural, not promises:

- **Cap** — the agent can never pull more than the granted amount.
- **Expiry** — after expiry, every pull fails. Set it and forget it.
- **Revoke** — the user closes the delegation on demand and reclaims rent.
- **Ownership** — combined with Nyx place_bet_for, positions are owned by the *user*, not the agent.

## Architecture

    User  --initSubscriptionAuthority-->  [Subscription Authority PDA : u64::MAX SPL approval]
    User  --createFixedDelegation (cap + expiry)-->  [Fixed Delegation PDA]
    Nyx Agent  --transferFixed (only delegatee signs)-->  [Fixed Delegation PDA]
        [Fixed Delegation PDA]      --checks cap + expiry-->  [Subscription Authority PDA]
        [Subscription Authority PDA]  --SPL transfer-->       [Nyx market vault]
             place_bet_for  =>  position OWNED BY USER
    User  --revokeDelegation (any time)-->  [Fixed Delegation PDA : closed, rent back]

## Exports

| Function | Purpose |
| --- | --- |
| subscriptionAuthorityPda(user, mint) | Derive the ["SubscriptionAuthority", user, mint] PDA |
| fixedDelegationPda(sa, delegator, delegatee, nonce) | Derive the ["delegation", sa, delegator, delegatee, nonce] PDA |
| associatedTokenAddress(owner, mint) | ATA derivation |
| initSubscriptionAuthorityIx(args) | Discriminator 0 — enable SA for a mint |
| createFixedDelegationIx(args) | Discriminator 1 — grant a capped, expiring allowance |
| transferFixedIx(args) | Discriminator 4 — agent pulls against the allowance |
| revokeDelegationIx(args) | Discriminator 3 — close the delegation, reclaim rent |
| decodeSubscriptionAuthority(data) / readSaInitId(data) | Decode the SA account (incl. init_id) |
| decodeFixedDelegation(data) | Decode a fixed delegation (remaining amount, expiryTs, ...) |

## Program constants

- Program ID: De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44 (mainnet + devnet)
- Encoding: single leading discriminator byte + C-packed little-endian payload (no Borsh, no 8-byte Anchor hashes)
- SubscriptionAuthority: 106 bytes, init_id (i64) at offset 98
- FixedDelegation: 187 bytes (107-byte shared header + SA + mint + amount(u64) + expiryTs(i64))

## Notes

- saInitId is the SA's init_id at grant time; the program rejects a grant on mismatch, so read it fresh from the SA account.
- Amounts are base units. For a 6-decimal token, 1_000_000 = 1 token.
- Account layouts pinned to the canonical Solana Foundation subscriptions program.

---

Built for the Superteam x TxODDS **World Cup Hackathon** — part of **Nyx**, an on-chain prediction-market settlement + zero-custody betting stack. MIT.
