// Ties PoI receipts to real USD-T payment via NyxWallet AND to an on-chain PoI
// anchor. This is the layer QVAC delegated inference is missing today (no billing,
// no proof-of-execution, no public anchor).
// Flow:
//   1. consumer asks a provider to run a completion (real QVAC or injected runner)
//   2. provider returns { output, tokenCount, receipt } (receipt = signed PoI)
//   3. consumer verifies signature + delivery (model / prompt / output)
//   4. consumer anchors the receipt digest on-chain (Solana Memo) - proof, not payment
//   5. ONLY if valid, consumer pays receipt.costUsdt to receipt.payoutAddress
//   No proof -> no payment.
import { signReceipt, verifyReceipt, verifyDelivery, costUsdt } from "./poi.js";

export class PaidInferenceProvider {
  // runCompletion: async ({ modelId, prompt, seed }) => { output, tokenCount }
  constructor({ identity, payoutAddress, pricePerKTokenUsdt = 0.02, modelContentHash = null, runCompletion }) {
    if (!identity) throw new Error("provider needs an ed25519 identity");
    if (!payoutAddress) throw new Error("provider needs a payoutAddress");
    if (typeof runCompletion !== "function") throw new Error("provider needs a runCompletion()");
    Object.assign(this, { identity, payoutAddress, pricePerKTokenUsdt, modelContentHash, runCompletion });
  }
  async handle({ modelId, prompt, seed = null }) {
    const { output, tokenCount } = await this.runCompletion({ modelId, prompt, seed });
    const receipt = signReceipt(this.identity, {
      modelId, prompt, output, tokenCount,
      pricePerKTokenUsdt: this.pricePerKTokenUsdt,
      payoutAddress: this.payoutAddress,
      modelContentHash: this.modelContentHash, seed,
    });
    return { output, tokenCount, receipt };
  }
}

export class PaidInferenceConsumer {
  // anchor: optional object exposing async anchor(receipt) => { anchored, signature, reason }
  constructor({ wallet = null, maxPricePerKTokenUsdt = 0.05, expectedProviderHex = null, anchor = null } = {}) {
    Object.assign(this, { wallet, maxPricePerKTokenUsdt, expectedProviderHex, anchor });
  }
  async request(provider, { modelId, prompt, seed = null, modelContentHash = null }) {
    const { output, tokenCount, receipt } = await provider.handle({ modelId, prompt, seed });
    const digest = receipt.digest;

    const sig = verifyReceipt(receipt, { expectedProviderHex: this.expectedProviderHex });
    if (!sig.ok) return { verified: false, paid: false, anchored: false, digest, reason: sig.reason, output };

    const del = verifyDelivery(receipt, { modelId, prompt, output, modelContentHash });
    if (!del.ok) return { verified: false, paid: false, anchored: false, digest, reason: del.reason, output };

    if (receipt.body.pricePerKTokenUsdt > this.maxPricePerKTokenUsdt)
      return { verified: true, paid: false, anchored: false, digest, reason: "price " + receipt.body.pricePerKTokenUsdt + "/1k above cap " + this.maxPricePerKTokenUsdt, cost: receipt.body.costUsdt, output };

    // On-chain PoI anchor: publicly timestamp the receipt digest. Independent of
    // payment; honest degradation if no anchor keypair is configured.
    let anchored = false, anchorHash = null, anchorReason = null;
    if (this.anchor && typeof this.anchor.anchor === "function") {
      const a = await this.anchor.anchor(receipt);
      anchored = !!a.anchored; anchorHash = a.signature || null; anchorReason = a.reason || null;
    }

    const cost = receipt.body.costUsdt;
    if (!this.wallet || !this.wallet.ready)
      return { verified: true, paid: false, anchored, anchorHash, anchorReason, digest, reason: "verified OK but wallet not ready (" + ((this.wallet && this.wallet.reason) || "no wallet") + ")", cost, output };

    // Payment memo embeds the PoI digest so the payment tx is audit-linkable back
    // to the exact receipt; the nonce keeps each memo tied to its PoI session.
    const memo = "nyx-poi:v1:" + digest + ":" + receipt.body.nonce;
    const pay = await this.wallet.settle({ to: receipt.body.payoutAddress, amount: cost, memo });
    return { verified: true, paid: !!pay.settled, anchored, anchorHash, anchorReason, digest, reason: pay.reason || null, hash: pay.hash || null, cost, output, memo };
  }
}

export { costUsdt };
