// Proves the on-chain PoI anchor end-to-end on devnet with a REAL Memo tx.
// Runs a (deterministic) completion, signs a PoI receipt, verifies it, anchors
// the digest on-chain, then re-fetches the tx and confirms the digest is really
// in the transaction logs. No mock.
import { PaidInferenceProvider, PaidInferenceConsumer } from "./paid-inference.js";
import { newIdentity } from "./poi.js";
import { PoIAnchor } from "./poi-anchor.js";

const runCompletion = async ({ modelId, prompt }) => {
  const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  return { output: "ECHO(" + modelId + "): " + p.slice(0, 80), tokenCount: 128 };
};

async function main() {
  const identity = newIdentity();
  const payoutAddress = process.env.NYX_PAYOUT || "5Ybj5JBMzoEp7UVQV1xWQQ5V7RVgBWarBfBdNuXShKBU";
  const provider = new PaidInferenceProvider({ identity, payoutAddress, pricePerKTokenUsdt: 0.02, runCompletion });

  const anchor = new PoIAnchor({ network: process.env.NYX_NETWORK || "devnet" });
  console.log("anchor ready :", anchor.ready, "| address:", anchor.address(), "| network:", anchor.network);
  if (anchor.reason) console.log("anchor reason:", anchor.reason);

  const consumer = new PaidInferenceConsumer({ anchor, wallet: null, maxPricePerKTokenUsdt: 0.05 });
  const res = await consumer.request(provider, { modelId: "qwen3-4b", prompt: { role: "user", content: "What is the capital of France?" } });

  console.log("verified :", res.verified, "| anchored:", res.anchored, "| paid:", res.paid);
  console.log("cost USDT:", res.cost, "| digest:", res.digest);
  if (res.anchorReason) console.log("anchorReason:", res.anchorReason);

  if (!res.verified) { console.log("POI-ANCHOR-FAIL: not verified"); process.exit(1); }
  if (!res.anchorHash) { console.log("POI-ANCHOR-FAIL:", res.anchorReason || "no anchor tx"); process.exit(1); }

  const cluster = anchor.network === "mainnet" ? "" : "?cluster=devnet";
  console.log("ANCHOR TX:", res.anchorHash);
  console.log("EXPLORER :", "https:" + "//explorer.solana.com/tx/" + res.anchorHash + cluster);

  const chk = await anchor.verifyAnchored(res.anchorHash, { digest: res.digest, body: { nonce: "" } });
  console.log("on-chain digest present:", chk.ok, chk.reason || "");
  if (!chk.ok) { console.log("POI-ANCHOR-FAIL: digest not found on-chain"); process.exit(1); }
  console.log("POI-ANCHOR-OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
