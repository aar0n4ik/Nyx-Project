// Proof-of-Inference demo: honest provider gets paid in USD₮; a provider that
// swaps the model / tampers the output gets NOTHING. Runs today with no QVAC and
// no second machine (mock runners). To go real, replace runCompletion with a QVAC
// delegated completion() call and set NYX_WALLET_SEED for the USD₮ payout.
import "./load-env.js";
import { newIdentity, identityFromSeed, signReceipt } from "./poi.js";
import { PaidInferenceProvider, PaidInferenceConsumer } from "./paid-inference.js";
import { NyxWallet } from "./wallet.js";

const price = Number(process.env.NYX_POI_PRICE || 0.02);          // USD₮ / 1k tokens
const provider = process.env.NYX_POI_PROVIDER_SEED
  ? identityFromSeed(process.env.NYX_POI_PROVIDER_SEED) : newIdentity();
console.log("▸ Provider id:", provider.publicKeyHex);

// Provider payout address = wallet account #1 (same seed, second account).
const pw = new NyxWallet({ accountIndex: 1 });
const pwState = await pw.init();
const payoutAddress = pwState.address || "Provider1PayoutAddrPlaceholder1111111111111";
await pw.dispose();

// Consumer pays from wallet account #0.
const wallet = new NyxWallet({ accountIndex: 0 });
const wState = await wallet.init();
console.log("▸ Consumer wallet:", wState.ready ? wState.address : "(not ready: " + wState.reason + ")");
console.log("▸ Payout address:", payoutAddress, "\n");

const consumer = new PaidInferenceConsumer({ wallet, maxPricePerKTokenUsdt: 0.05, expectedProviderHex: provider.publicKeyHex });
const modelId = "LLAMA_3_2_1B_INST_Q4_0";
const prompt = [{ role: "user", content: "Summarise the match in one sentence." }];
const GOOD = "Home side edged it 2-1 with a late winner.";

function report(tag, r) {
  console.log(`\n=== ${tag} ===`);
  console.log(`verified=${r.verified} paid=${r.paid} cost=${r.cost != null ? r.cost + " USD₮" : "-"}`);
  console.log(r.paid ? `tx=${r.hash}` : `reason: ${r.reason}`);
}

// A) Honest provider: runs the requested model, returns what it signed.
const honest = new PaidInferenceProvider({ identity: provider, payoutAddress, pricePerKTokenUsdt: price,
  runCompletion: async () => ({ output: GOOD, tokenCount: 512 }) });
report("HONEST provider", await consumer.request(honest, { modelId, prompt }));

// B) Cheating provider: signs a nice receipt but actually returns junk from a
//    cheaper model. verifyDelivery recomputes the output hash -> OUTPUT MISMATCH.
const cheat = {
  async handle({ modelId, prompt, seed }) {
    const receipt = signReceipt(provider, { modelId, prompt, output: GOOD, tokenCount: 512,
      pricePerKTokenUsdt: price, payoutAddress, seed });
    return { output: "idk lol", tokenCount: 512, receipt }; // delivered != signed
  },
};
report("CHEATING provider (junk output)", await consumer.request(cheat, { modelId, prompt }));

// C) Forged receipt: provider zeroes the price after signing -> digest mismatch.
const forged = {
  async handle(args) {
    const r = await honest.handle(args);
    r.receipt.body.costUsdt = 0;
    return r;
  },
};
report("FORGED receipt (tampered price)", await consumer.request(forged, { modelId, prompt }));

console.log("\n▸ Only the honest, verifiable run is eligible for USD₮ payment.");
