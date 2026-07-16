// Discovery + reputation demo. A cheat lists the cheapest price, wins round 1,
// fails proof-of-inference, its rating collapses, and it is filtered out — honest
// providers take over. Real USD₮ payout on verified rounds (if wallet seed set).
// Set NYX_CLUSTER=mainnet-beta to switch explorer links off devnet.
import "./load-env.js";
import { rmSync } from "node:fs";
import { newIdentity, signReceipt } from "./poi.js";
import { PaidInferenceProvider, PaidInferenceConsumer } from "./paid-inference.js";
import { ProviderRegistry } from "./provider-registry.js";
import { NyxWallet } from "./wallet.js";

const CLUSTER = process.env.NYX_CLUSTER || (process.env.NYX_NETWORK === "mainnet" ? "mainnet-beta" : "devnet");
const EXP = "https:" + "//explorer.solana" + ".com/";
const txUrl = (h) => EXP + "tx/" + h + "?cluster=" + CLUSTER;

const modelId = "LLAMA_3_2_1B_INST_Q4_0";
const prompt = [{ role: "user", content: "Summarise the match in one sentence." }];
const GOOD = "Home side edged it 2-1 with a late winner.";

const pw = new NyxWallet({ accountIndex: 1 }); const pws = await pw.init();
const payoutAddress = pws.address || "Provider1Payout11111111111111111111111111111";
await pw.dispose();
const wallet = new NyxWallet({ accountIndex: 0 }); const ws = await wallet.init();
console.log("Consumer wallet:", ws.ready ? ws.address : "(not ready: " + ws.reason + ")");

const idCheap = newIdentity(), idFast = newIdentity(), idCheat = newIdentity();

const regPath = process.env.NYX_REGISTRY_PATH || "nyx-registry.demo.json";
try { rmSync(regPath, { force: true }); } catch {}
const registry = new ProviderRegistry({ path: regPath });
registry.register({ publicKeyHex: idCheap.publicKeyHex, payoutAddress, modelId, pricePerKTokenUsdt: 0.015, stakeUsdt: 50 });
registry.register({ publicKeyHex: idFast.publicKeyHex, payoutAddress, modelId, pricePerKTokenUsdt: 0.030, stakeUsdt: 120 });
registry.register({ publicKeyHex: idCheat.publicKeyHex, payoutAddress, modelId, pricePerKTokenUsdt: 0.008, stakeUsdt: 0 });

const honest = (id, price) => new PaidInferenceProvider({ identity: id, payoutAddress, pricePerKTokenUsdt: price,
  runCompletion: async () => ({ output: GOOD, tokenCount: 512 }) });
const cheat = (id, price) => ({ async handle({ modelId, prompt, seed }) {
  const receipt = signReceipt(id, { modelId, prompt, output: GOOD, tokenCount: 512, pricePerKTokenUsdt: price, payoutAddress, seed });
  return { output: "spam", tokenCount: 512, receipt }; // delivered != signed
} });
const handlers = {
  [idCheap.publicKeyHex]: honest(idCheap, 0.015),
  [idFast.publicKeyHex]: honest(idFast, 0.030),
  [idCheat.publicKeyHex]: cheat(idCheat, 0.008),
};

const sid = (h) => h.slice(0, 10) + "…";
function board(tag) {
  console.log("\n--- registry (" + tag + ") ---");
  for (const p of registry.list({ modelId }))
    console.log(sid(p.publicKeyHex) + " price=" + p.pricePerKTokenUsdt + "/1k stake=" + p.stakeUsdt + " served=" + p.served + " failed=" + p.failed + " rating=" + p.rating);
}

board("initial — cheat is cheapest, no track record yet");
for (let round = 1; round <= 3; round++) {
  const pick = registry.select({ modelId, maxPricePerKTokenUsdt: 0.05, minRating: 0.5 });
  console.log("\n=== round " + round + ": selected " + sid(pick.publicKeyHex) + " (price=" + pick.pricePerKTokenUsdt + ", rating=" + pick.rating + ") ===");
  const consumer = new PaidInferenceConsumer({ wallet, maxPricePerKTokenUsdt: 0.05, expectedProviderHex: pick.publicKeyHex });
  const r = await consumer.request(handlers[pick.publicKeyHex], { modelId, prompt });
  console.log("verified=" + r.verified + " paid=" + r.paid + " " + (r.paid ? "tx=" + txUrl(r.hash) : "reason=" + r.reason));
  registry.recordResult(pick.publicKeyHex, { verified: r.verified, paidUsdt: r.paid ? r.cost : 0 });
  board("after round " + round);
}
console.log("\n▸ Price-first but reputation-gated: the cheat wins once on price, fails proof, drops below the rating bar, and is excluded. Honest providers earn the flow.");
