import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js"

// nyx-txodds-allowance
// Hand-built instruction builders for the Solana Foundation Subscriptions &
// Allowances program (Fixed Delegation model). Zero-custody, capped,
// auto-expiring agent spending. Pinned to the canonical on-chain program.
// Program: De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44

export const PROGRAM_ID = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44")
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
export const SYSTEM_PROGRAM_ID = SystemProgram.programId

// single leading discriminator byte; C-packed little-endian payloads
export const IX = { INIT_SA: 0, CREATE_FIXED: 1, CREATE_RECURRING: 2, REVOKE: 3, TRANSFER_FIXED: 4 }

// ---- byte helpers ----
export const u8 = (n) => Buffer.from([n & 0xff])
export const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }
export const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b }
const meta = (pubkey, isSigner, isWritable) => ({ pubkey, isSigner, isWritable })
export const ro = (pk) => meta(pk, false, false)
export const rw = (pk) => meta(pk, false, true)
export const signerRo = (pk) => meta(pk, true, false)
export const signerRw = (pk) => meta(pk, true, true)

// ---- PDA derivation ----
export function subscriptionAuthorityPda(user, mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("SubscriptionAuthority"), user.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  )[0]
}
export function fixedDelegationPda(subscriptionAuthority, delegator, delegatee, nonce) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), subscriptionAuthority.toBuffer(), delegator.toBuffer(), delegatee.toBuffer(), u64le(nonce)],
    PROGRAM_ID
  )[0]
}
export function eventAuthorityPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("event_authority")], PROGRAM_ID)[0]
}
export function associatedTokenAddress(owner, mint) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

// ---- account decoders ----
// SubscriptionAuthority (106 bytes): disc(1) user(32) mint(32) payer(32) bump(1) init_id:i64(8)
export function decodeSubscriptionAuthority(data) {
  return {
    discriminator: data.readUInt8(0),
    user: new PublicKey(data.subarray(1, 33)),
    mint: new PublicKey(data.subarray(33, 65)),
    payer: new PublicKey(data.subarray(65, 97)),
    bump: data.readUInt8(97),
    initId: data.readBigInt64LE(98),
  }
}
export function readSaInitId(data) { return data.readBigInt64LE(98) }

// FixedDelegation (187 bytes): header(107) subscription_authority(32) mint(32) amount:u64(8) expiry_ts:i64(8)
// header: disc(1) version(1) bump(1) delegator(32) delegatee(32) payer(32) init_id:i64(8)
export function decodeFixedDelegation(data) {
  return {
    discriminator: data.readUInt8(0),
    version: data.readUInt8(1),
    bump: data.readUInt8(2),
    delegator: new PublicKey(data.subarray(3, 35)),
    delegatee: new PublicKey(data.subarray(35, 67)),
    payer: new PublicKey(data.subarray(67, 99)),
    initId: data.readBigInt64LE(99),
    subscriptionAuthority: new PublicKey(data.subarray(107, 139)),
    mint: new PublicKey(data.subarray(139, 171)),
    amount: data.readBigUInt64LE(171),
    expiryTs: data.readBigInt64LE(179),
  }
}

// ---- instruction builders ----

// initialize_subscription_authority (disc 0): enable SA for a (user, mint)
export function initSubscriptionAuthorityIx(args) {
  const user = args.user, mint = args.mint, userAta = args.userAta
  const sa = args.sa || subscriptionAuthorityPda(user, mint)
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [ signerRw(user), rw(sa), ro(mint), rw(userAta), ro(SYSTEM_PROGRAM_ID), ro(TOKEN_PROGRAM_ID) ],
    data: u8(IX.INIT_SA),
  })
}

// create_fixed_delegation (disc 1): grant a capped, auto-expiring allowance
export function createFixedDelegationIx(args) {
  const user = args.user, delegatee = args.delegatee, mint = args.mint
  const nonce = args.nonce, amount = args.amount, expiryTs = args.expiryTs, saInitId = args.saInitId
  const sa = args.sa || subscriptionAuthorityPda(user, mint)
  const delegation = args.delegation || fixedDelegationPda(sa, user, delegatee, nonce)
  const data = Buffer.concat([ u8(IX.CREATE_FIXED), u64le(nonce), u64le(amount), i64le(expiryTs), i64le(saInitId) ])
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [ signerRw(user), ro(sa), rw(delegation), ro(delegatee), ro(SYSTEM_PROGRAM_ID) ],
    data,
  })
}

// transfer_fixed (disc 4): the delegatee (agent) pulls against the allowance
export function transferFixedIx(args) {
  const delegatee = args.delegatee, delegator = args.delegator, mint = args.mint
  const delegationPda = args.delegationPda, delegatorAta = args.delegatorAta
  const receiverAta = args.receiverAta, amount = args.amount
  const sa = args.sa || subscriptionAuthorityPda(delegator, mint)
  const data = Buffer.concat([ u8(IX.TRANSFER_FIXED), u64le(amount), delegator.toBuffer(), mint.toBuffer() ])
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      rw(delegationPda), ro(sa), rw(delegatorAta), rw(receiverAta), ro(mint), ro(TOKEN_PROGRAM_ID),
      signerRo(delegatee), ro(eventAuthorityPda()), ro(PROGRAM_ID),
    ],
    data,
  })
}

// revoke_delegation (disc 3): delegator closes the delegation, rent back to signer.
// receiver only needed when a delegator revokes a sponsor-funded delegation.
export function revokeDelegationIx(args) {
  const authority = args.authority, delegationPda = args.delegationPda, receiver = args.receiver
  const keys = [ signerRw(authority), rw(delegationPda) ]
  if (receiver) keys.push(rw(receiver))
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data: u8(IX.REVOKE) })
}

export default {
  PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, SYSTEM_PROGRAM_ID, IX,
  u8, u64le, i64le, ro, rw, signerRo, signerRw,
  subscriptionAuthorityPda, fixedDelegationPda, eventAuthorityPda, associatedTokenAddress,
  decodeSubscriptionAuthority, readSaInitId, decodeFixedDelegation,
  initSubscriptionAuthorityIx, createFixedDelegationIx, transferFixedIx, revokeDelegationIx,
}
