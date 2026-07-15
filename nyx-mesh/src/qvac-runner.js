// Wires a REAL QVAC completion into PaidInferenceProvider.runCompletion.
// Supports local inference and delegated inference (offload to a peer GPU over
// Hyperswarm) via the `delegate` option. Honest degradation: if @qvac/sdk is not
// installed, returns { ready:false, reason } so the caller can fall back to a mock.
const QVAC_MODULE = process.env.QVAC_MODULE || "@qvac/sdk";

export async function makeQvacRunner({ modelSrc = null, modelType = "llm", delegate = null } = {}) {
  let sdk;
  try { sdk = await import(QVAC_MODULE); }
  catch { return { ready: false, reason: `QVAC unavailable: npm i ${QVAC_MODULE}`, runCompletion: null, dispose: async () => {} }; }

  const { completion, loadModel, unloadModel } = sdk;
  const src = modelSrc || sdk.LLAMA_3_2_1B_INST_Q4_0;

  let modelId;
  try {
    modelId = await loadModel({ modelSrc: src, modelType, ...(delegate ? { delegate } : {}) });
  } catch (e) {
    return { ready: false, reason: "loadModel failed: " + e.message, runCompletion: null, dispose: async () => {} };
  }

  async function runCompletion({ prompt, seed = null }) {
    const history = Array.isArray(prompt) ? prompt : [{ role: "user", content: String(prompt) }];
    const res = completion({ modelId, history, stream: true, ...(seed != null ? { seed } : {}) });
    let output = "", chunks = 0;
    for await (const token of res.tokenStream) { output += token; chunks++; }
    let tokenCount = chunks;
    try { const s = await res.stats; if (s) tokenCount = s.tokensGenerated ?? s.completionTokens ?? s.outputTokens ?? chunks; }
    catch {}
    // QVAC model ids are content-addressed -> use as the receipt's modelContentHash.
    return { output, tokenCount, modelContentHash: String(modelId) };
  }

  return { ready: true, reason: null, modelId, runCompletion, dispose: async () => { try { await unloadModel({ modelId }); } catch {} } };
}
export default makeQvacRunner;
