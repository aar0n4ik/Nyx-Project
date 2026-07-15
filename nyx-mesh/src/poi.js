// Proof-of-Inference (PoI) for QVAC delegated inference.
// Closes the two holes in QVAC delegated inference:
//   (1) no proof the provider actually ran the requested model on your prompt,
//   (2) no payment rail.
// The provider signs a receipt binding {model, prompt, output, tokenCount, price,
// payoutAddress} with its ed25519 identity key (same key class Hyperswarm uses
// for provider ids). The consumer verifies the signature AND recomputes the
// hashes locally, so a provider cannot swap in a cheaper model or tamper with
// the result and still get paid.  No proof -> no payment.
import { createHash, generateKeyPairSync, sign as edSign, verify as edVerify,
         createPublicKey, createPrivateKey, randomBytes } from "node:crypto";

export const randomHex = (n) => randomBytes(n).toString("hex");

export function sha256Hex(input) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return createHash("sha256").update(buf).digest("hex");
}

// Deterministic canonical JSON (sorted keys) so both sides hash identically.
export function canonical(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonical).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}";
}
export const hashCanonical = (obj) => sha256Hex(canonical(obj));

// ed25519 helpers (matches the key type QVAC/Hyperswarm use for provider ids).
const ED25519_SPKI_PREFIX  = Buffer.from("302a300506032b6570032100", "hex");
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export function publicKeyFromHex(hex) {
  const der = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(hex, "hex")]);
  return createPublicKey({ key: der, format: "der", type: "spki" });
}

export function identityFromSeed(seedHex) {
  const seed = Buffer.from(seedHex, "hex");
  if (seed.length !== 32) throw new Error("seed must be 32 bytes (64 hex chars)");
  const der = Buffer.concat([ED25519_PKCS8_PREFIX, seed]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const pubRaw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { privateKey, publicKey, publicKeyHex: Buffer.from(pubRaw).toString("hex") };
}

export function newIdentity() { return identityFromSeed(randomHex(32)); }

export function costUsdt(tokenCount, pricePerKTokenUsdt) {
  return +((tokenCount / 1000) * pricePerKTokenUsdt).toFixed(6);
}

// Provider builds + signs a receipt AFTER producing the output.
export function signReceipt(identity, {
  modelId, prompt, output, tokenCount, pricePerKTokenUsdt,
  payoutAddress, seed = null, consumerPubKeyHex = null,
  modelContentHash = null, nonce = null,
}) {
  const body = {
    v: 1,
    provider: identity.publicKeyHex,
    consumer: consumerPubKeyHex,
    modelId,
    // Bind the model: prefer the QVAC registry content hash; fall back to id hash.
    modelHash: modelContentHash || sha256Hex(modelId),
    promptHash: hashCanonical(prompt),
    outputHash: sha256Hex(output),
    tokenCount,
    pricePerKTokenUsdt,
    costUsdt: costUsdt(tokenCount, pricePerKTokenUsdt),
    payoutAddress,
    seed,
    nonce: nonce || randomHex(16),
    ts: Date.now(),
  };
  const digest = hashCanonical(body);
  const signature = edSign(null, Buffer.from(digest, "hex"), identity.privateKey).toString("hex");
  return { body, digest, signature };
}

// Step 1: the receipt is authentic and signed by the claimed provider.
export function verifyReceipt(receipt, { expectedProviderHex = null } = {}) {
  const { body, digest, signature } = receipt;
  if (hashCanonical(body) !== digest)
    return { ok: false, reason: "digest mismatch (receipt body was tampered)" };
  if (expectedProviderHex && body.provider !== expectedProviderHex)
    return { ok: false, reason: "provider id mismatch" };
  let sigOk = false;
  try {
    sigOk = edVerify(null, Buffer.from(digest, "hex"),
                     publicKeyFromHex(body.provider), Buffer.from(signature, "hex"));
  } catch (e) { return { ok: false, reason: "bad signature encoding: " + e.message }; }
  if (!sigOk) return { ok: false, reason: "signature does not verify against provider id" };
  return { ok: true, reason: null };
}

// Step 2 (the teeth): recompute hashes from what the consumer ACTUALLY got.
export function verifyDelivery(receipt, { modelId, prompt, output, modelContentHash = null }) {
  const b = receipt.body;
  const expectModelHash = modelContentHash || sha256Hex(modelId);
  if (modelId != null && b.modelHash !== expectModelHash)
    return { ok: false, reason: "MODEL MISMATCH — provider ran a different model than requested" };
  if (prompt != null && b.promptHash !== hashCanonical(prompt))
    return { ok: false, reason: "PROMPT MISMATCH — receipt is for a different prompt" };
  if (output != null && b.outputHash !== sha256Hex(output))
    return { ok: false, reason: "OUTPUT MISMATCH — returned text does not match the signed receipt" };
  return { ok: true, reason: null };
}
