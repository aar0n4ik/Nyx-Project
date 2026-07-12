/* Nyx AI connector — 3-tier brain: QVAC on-device → Groq → offline rules */
window.NYX_AI = (function () {
  const LOCAL = window.QVAC_LOCAL_URL || "http://127.0.0.1:8787/v1";
  const GROQ = window.CW_GROQ_PROXY || "/api/analyze-trade";
  function messages(ctx) {
    return [
      { role: "system", content: "You are Nyx, an on-device sports-betting risk analyst powered by Tether QVAC. Answer in 3-4 concise sentences, honest about risk, no hype. State clearly whether the bet has positive expected value, and a sensible stake." },
      { role: "user", content: JSON.stringify(ctx) },
    ];
  }
  async function local(ctx) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3500);
    try {
      const r = await fetch(LOCAL + "/chat/completions", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: window.QVAC_MODEL || "qwen3-4b", messages: messages(ctx), stream: false }),
        signal: c.signal,
      });
      clearTimeout(t);
      if (!r.ok) throw 0;
      const j = await r.json();
      const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (txt) return { text: String(txt).trim(), engine: "QVAC · on-device" };
    } catch (e) { clearTimeout(t); }
    return null;
  }
  async function groq(ctx) {
    try {
      const r = await fetch(GROQ, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.assign({}, ctx, { messages: messages(ctx), lang: window.NYX_LANG || "en" })),
      });
      if (!r.ok) throw 0;
      const j = await r.json();
      const txt = j.narrative || j.text || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
      if (txt) return { text: String(txt).trim(), engine: "Groq × Llama 3.3 (online)" };
    } catch (e) {}
    return null;
  }
  return {
    async analyze(ctx) {
      const online = navigator.onLine !== false;
      const l = await local(ctx);
      if (l) return l;
      if (online) { const g = await groq(ctx); if (g) return g; }
      return { text: ctx.offlineText || "Offline verdict computed from Nyx rules.", engine: "Nyx rules · offline" };
    },
  };
})();
