// Proof-of-Inference demo: honest provider gets paid in USD₮; a provider that
// swaps the model / tampers the output gets NOTHING. Uses a REAL QVAC delegated
// completion when the qvac sdk is installed, and falls back to a deterministic mock
// so it still runs offline with no GPU and no second machine. Set NYX_WALLET_SEED
// for the real USD₮ payout, and NYX_CLUSTER=mainnet-beta to switch explorer links.
import "./load-env.js";
import { newIdentity, identityFromSeed, signReceipt } from "./poi.js";
import { PaidInferenceProvider, PaidInferenceConsumer } from "./paid-inference.js";
import { NyxWallet } from "./wallet.js";
import makeQvacRunner from "./qvac-runner.js";

const CLUSTER = process.env.NYX_CLUSTER || (process.env.NYX_NETWORK === "mainnet" ? "mainnet-beta" : "devnet");
const EXP = "https:" + "//explorer.solana" + ".com/";
const txUrl = (h) => EXP + "tx/" + h + "?cluster=" + CLUSTER;

const price = Number(process.env.NYX_POI_PRICE || 0.02); // USD₮ / 1k tokens
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

// Real QVAC delegated inference when the sdk is present; deterministic mock otherwise.
const qvac = await makeQvacRunner({ modelType: "llm" });
console.log(qvac.ready
  ? "▸ QVAC runner: REAL on-device inference\n"
  : "▸ QVAC runner: mock fallback (" + qvac.reason + ")\n");
const honestRun = qvac.ready
  ? async ({ prompt, seed }) => {
      const r = await qvac.runCompletion({ prompt, seed });
      return { output: r.output, tokenCount: r.tokenCount };
    }
  : async () => ({ output: GOOD, tokenCount: 512 });

function report(tag, r) {
  console.log("\n=== " + tag + " ===");
  console.log("verified=" + r.verified + " paid=" + r.paid + " cost=" + (r.cost != null ? r.cost + " USD₮" : "-"));
  console.log(r.paid ? "tx=" + txUrl(r.hash) : "reason: " + r.reason);
}

// A) Honest provider: runs the requested model, returns exactly what it signed.
const honest = new PaidInferenceProvider({ identity: provider, payoutAddress, pricePerKTokenUsdt: price,
  runCompletion: honestRun });
report("HONEST provider", await consumer.request(honest, { modelId, prompt }));

// B) Cheating provider: signs a nice receipt but actually returns junk from a
// cheaper model. verifyDelivery recomputes the output hash -> OUTPUT MISMATCH.
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

await qvac.dispose();
console.log("\n▸ Only the honest, verifiable run is eligible for USD₮ payment.");
