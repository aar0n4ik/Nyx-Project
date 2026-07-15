// Ties PoI receipts to real USD₮ payment via NyxWallet. This is the layer QVAC
// delegated inference is missing today (no billing, no proof-of-execution).
// Flow:
//   1. consumer asks a provider to run a completion (real QVAC or injected runner)
//   2. provider returns { output, tokenCount, receipt } (receipt = signed PoI)
//   3. consumer verifies signature + delivery (model / prompt / output)
//   4. ONLY if valid, consumer pays receipt.costUsdt to receipt.payoutAddress
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
  constructor({ wallet = null, maxPricePerKTokenUsdt = 0.05, expectedProviderHex = null } = {}) {
    Object.assign(this, { wallet, maxPricePerKTokenUsdt, expectedProviderHex });
  }
  async request(provider, { modelId, prompt, seed = null, modelContentHash = null }) {
    const { output, tokenCount, receipt } = await provider.handle({ modelId, prompt, seed });

    const sig = verifyReceipt(receipt, { expectedProviderHex: this.expectedProviderHex });
    if (!sig.ok) return { verified: false, paid: false, reason: sig.reason, output };

    const del = verifyDelivery(receipt, { modelId, prompt, output, modelContentHash });
    if (!del.ok) return { verified: false, paid: false, reason: del.reason, output };

    if (receipt.body.pricePerKTokenUsdt > this.maxPricePerKTokenUsdt)
      return { verified: true, paid: false, reason: `price ${receipt.body.pricePerKTokenUsdt}/1k above cap ${this.maxPricePerKTokenUsdt}`, cost: receipt.body.costUsdt, output };

    const cost = receipt.body.costUsdt;
    if (!this.wallet || !this.wallet.ready)
      return { verified: true, paid: false, reason: "verified OK but wallet not ready (" + ((this.wallet && this.wallet.reason) || "no wallet") + ")", cost, output };

    // Unique + audit-linkable memo per settle. Ed25519 receipts are deterministic,
    // so byte-identical settles would dedup into a single Solana tx; the time suffix
    // forces a distinct signature (and a distinct explorer entry) for every payment,
    // while the nonce keeps each memo tied back to its PoI receipt.
    const memo = `poi:${receipt.body.nonce}:${Date.now().toString(36)}`;
    const pay = await this.wallet.settle({ to: receipt.body.payoutAddress, amount: cost, memo });
    return { verified: true, paid: !!pay.settled, reason: pay.reason || null, hash: pay.hash || null, cost, output, memo };
  }
}

export { costUsdt };
