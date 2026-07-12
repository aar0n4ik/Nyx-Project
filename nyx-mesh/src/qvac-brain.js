// Nyx QVAC brain — on-device LLM + lightweight RAG.
// Tier 1: real @qvac/sdk  (loadModel -> completion tokenStream -> unloadModel/close).
// Tier 2: QVAC OpenAI-compatible local server (127.0.0.1:8787).
// Tier 3: deterministic rule engine so verdicts never stop (offline-safe).
const QVAC_SERVER = process.env.QVAC_SERVER || "http://127.0.0.1:8787/v1";
const QVAC_MODEL = process.env.QVAC_MODEL || "qwen3-4b";
let _sdk = null;
async function loadSdk() {
  if (_sdk !== null) return _sdk;
  try { _sdk = await import("@qvac/sdk"); } catch { _sdk = false; }
  return _sdk;
}
function pickModelSrc(sdk) {
  if (process.env.QVAC_MODEL_SRC) return process.env.QVAC_MODEL_SRC;
  const name = process.env.QVAC_MODEL_CONST;
  if (name && sdk[name]) return sdk[name];
  return sdk.QWEN3_4B_INST_Q4_0 || sdk.QWEN2_5_3B_INST_Q4_0 || sdk.LLAMA_3_2_3B_INST_Q4_0 || sdk.LLAMA_3_2_1B_INST_Q4_0 || null;
}
const DIM = 256;
function tokenize(t) { return String(t).toLowerCase().match(/[a-z0-9\u00c0-\u024f]+/gi) || []; }
function embed(text) {
  const v = new Float32Array(DIM);
  for (const tok of tokenize(text)) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619); }
    v[(h >>> 0) % DIM] += 1;
  }
  let n = 0; for (let i = 0; i < DIM; i++) n += v[i] * v[i]; n = Math.sqrt(n) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= n;
  return v;
}
function cosine(a, b) { let s = 0; for (let i = 0; i < DIM; i++) s += a[i] * b[i]; return s; }
export class NyxBrain {
  constructor(knowledge = []) {
    this.kb = [];
    this._modelId = null;
    for (const k of knowledge) this.addKnowledge(k);
  }
  addKnowledge(text) { if (text) this.kb.push({ text: String(text), v: embed(text) }); return this; }
  retrieve(query, k = 3) {
    if (!this.kb.length) return [];
    const q = embed(query);
    return this.kb.map((d) => ({ text: d.text, score: cosine(q, d.v) }))
      .sort((a, b) => b.score - a.score).slice(0, k).filter((d) => d.score > 0);
  }
  async _completeSdk(system, prompt) {
    const sdk = await loadSdk();
    if (!sdk || !sdk.loadModel || !sdk.completion) return null;
    try {
      if (this._modelId == null) {
        const modelSrc = pickModelSrc(sdk);
        if (!modelSrc) return null;
        this._modelId = await sdk.loadModel({ modelSrc });
      }
      const history = [{ role: "system", content: system }, { role: "user", content: prompt }];
      const res = sdk.completion({ modelId: this._modelId, history, stream: true });
      let text = "";
      if (res && res.tokenStream && typeof res.tokenStream[Symbol.asyncIterator] === "function") {
        for await (const tok of res.tokenStream) text += tok;
      } else {
        const r = await res;
        text = (r && (r.text || r.content || (r.message && r.message.content))) || (typeof r === "string" ? r : "");
      }
      text = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      return text ? { text, engine: "QVAC on-device \u00b7 " + QVAC_MODEL } : null;
    } catch { return null; }
  }
  async _completeServer(system, prompt) {
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(QVAC_SERVER + "/chat/completions", {
        method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ model: QVAC_MODEL, temperature: 0.4, max_tokens: 320,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
      });
      clearTimeout(t);
      if (!r.ok) return null;
      const j = await r.json();
      const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      return text ? { text: String(text).trim(), engine: "QVAC server \u00b7 " + QVAC_MODEL } : null;
    } catch { return null; }
  }
  async unload() {
    try { const sdk = await loadSdk(); if (sdk && this._modelId != null) { if (sdk.unloadModel) await sdk.unloadModel({ modelId: this._modelId }); if (sdk.close) await sdk.close(); } } catch {}
    this._modelId = null;
  }
  async complete(system, prompt) {
    return (await this._completeSdk(system, prompt)) || (await this._completeServer(system, prompt)) || null;
  }
  ruleVerdict(ctx) {
    if (ctx.guaranteed && ctx.fairProb >= 1) {
      const price = ctx.bookOdds > 1 ? ` Any book price above 1.00 (you have ${ctx.bookOdds}) is locked value.` : "";
      return `Nyx: "${ctx.market}" is already GUARANTEED \u2014 100% (${ctx.guaranteedReason}). Fair odds 1.00.${price}`;
    }
    if (ctx.guaranteed && ctx.fairProb <= 0) {
      return `Nyx: "${ctx.market}" is already settled AGAINST \u2014 0% (${ctx.guaranteedReason}). Do not bet.`;
    }
    const edge = Number(ctx.edge || 0);
    const stake = (Number(ctx.suggestedStakePct || 0) * 100).toFixed(1);
    if (edge <= 0) return `Nyx model: no edge on "${ctx.market}" (${(ctx.fairProb * 100).toFixed(1)}% fair). At ${ctx.bookOdds} the EV is ${(edge * 100).toFixed(1)}% \u2014 skip it.`;
    return `Nyx model: "${ctx.market}" is ${(ctx.fairProb * 100).toFixed(1)}% (fair ~${ctx.fairOdds}). Edge ${(edge * 100).toFixed(1)}%; half-Kelly suggests ${stake}% of bankroll. Value bet.`;
  }
  async analyzeMatch(ctx) {
    if (ctx.guaranteed) return { text: this.ruleVerdict(ctx), engine: "Nyx settled \u00b7 deterministic" };
    const query = `${ctx.match} ${ctx.market} minute ${ctx.minute} score ${ctx.score}`;
    const docs = this.retrieve(query, 3);
    const kb = docs.length ? "\nRelevant knowledge:\n- " + docs.map((d) => d.text).join("\n- ") : "";
    const system = "You are Nyx, an on-device football trading analyst. Be concise (max 3 sentences), quantitative, and never guarantee outcomes that are not already settled. Judge value using edge and half-Kelly staking.";
    const prompt = `Live context: ${ctx.match}, score ${ctx.score}, minute ${ctx.minute}.\nMarket: ${ctx.market}. Nyx fair prob ${(ctx.fairProb * 100).toFixed(1)}%, fair odds ${ctx.fairOdds}, book odds ${ctx.bookOdds}, edge ${(ctx.edge * 100).toFixed(1)}%.${kb}\nGive a verdict for a ${ctx.lang || "en"} speaker.`;
    const out = await this.complete(system, prompt);
    return out || { text: this.ruleVerdict(ctx), engine: "Nyx rules \u00b7 offline" };
  }
}
export default NyxBrain;
