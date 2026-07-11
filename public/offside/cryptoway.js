/*
 * CryptoWay engine — ported into OFFSIDE Trading track.
 * Source of truth: github.com/aar0n4ik/CryptoWay (app/api/analyze-trade/route.ts).
 * What is REAL here (runs 100% offline):
 *   - Deterministic risk rule engine (computeVerdicts) — ported 1:1 from CryptoWay.
 *   - Position sizing / liquidation / R:R math.
 *   - AI verdict narrative (offline QVAC template; online Groq/Llama when a proxy is set).
 * SYNERGY vs the original: CryptoWay logged verdicts to Mantle. Here every verdict is
 *   committed with the OFFSIDE offline wallet and SETTLED on Solana against TxLINE
 *   validateStatV2 — same "AI can't rewrite history" guarantee, now offline-first.
 * Needs your keys / a server (see docs): live TradingView feed, Groq narrative, Bybit/Binance execution.
 */
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // ---- instruments (subset of CryptoWay's 27) : default price + pip + TradingView symbol ----
  const INSTR = {
    "BTCUSDT": { px: 62000, pip: 1, tv: "BYBIT:BTCUSDT" },
    "ETHUSDT": { px: 3400, pip: 0.1, tv: "BYBIT:ETHUSDT" },
    "SOLUSDT": { px: 145, pip: 0.01, tv: "BYBIT:SOLUSDT" },
    "BNBUSDT": { px: 580, pip: 0.1, tv: "BYBIT:BNBUSDT" },
    "XRPUSDT": { px: 0.52, pip: 0.0001, tv: "BYBIT:XRPUSDT" },
    "DOGEUSDT": { px: 0.12, pip: 0.00001, tv: "BYBIT:DOGEUSDT" },
    "AVAXUSDT": { px: 28, pip: 0.01, tv: "BYBIT:AVAXUSDT" },
    "LINKUSDT": { px: 14, pip: 0.001, tv: "BYBIT:LINKUSDT" },
  };

  // ---- mini i18n (UI chrome only; AI narrative language handled by Groq when online) ----
  const T = {
    en: { title: "AI Risk Calculator", sub: "Deterministic rule engine + on-chain verdict", instrument: "Instrument", long: "Long", short: "Short", entry: "Entry", sl: "Stop loss", tp: "Take profit", lev: "Leverage", bal: "Balance", risk: "Risk %", analyze: "Analyze trade", rr: "R/R", sldist: "SL distance", liq: "Liq. price", possize: "Position size", margin: "Margin", maxloss: "Max loss", maxprofit: "Max profit", verdict_rr: "R/R quality", verdict_sl: "SL placement", verdict_lev: "Leverage", verdict_risk: "Risk allocation", overall: "Overall", ai: "AI analysis", ai_offline: "QVAC on-device (offline)", ai_online: "Groq × Llama 3.3 70B", logchain: "Log verdict on-chain", opentrade: "Open trade", chart: "Live chart", chart_off: "Chart needs network — turn on connection", logged: "Verdict committed · settles vs TxLINE", logged_off: "Verdict signed offline · relays on reconnect", need_keys: "Add exchange API keys on the server to execute (see docs)", autopilot: "Autopilot" },
    ru: { title: "AI-калькулятор риска", sub: "Детерминированный движок правил + вердикт ончейн", instrument: "Инструмент", long: "Лонг", short: "Шорт", entry: "Вход", sl: "Стоп-лосс", tp: "Тейк-профит", lev: "Плечо", bal: "Баланс", risk: "Риск %", analyze: "Анализировать", rr: "R/R", sldist: "Дист. SL", liq: "Цена ликв.", possize: "Размер позиции", margin: "Маржа", maxloss: "Макс. убыток", maxprofit: "Макс. прибыль", verdict_rr: "Качество R/R", verdict_sl: "Размещение SL", verdict_lev: "Плечо", verdict_risk: "Распред. риска", overall: "Итог", ai: "AI-анализ", ai_offline: "QVAC на устройстве (оффлайн)", ai_online: "Groq × Llama 3.3 70B", logchain: "Записать вердикт ончейн", opentrade: "Открыть сделку", chart: "Живой график", chart_off: "Графику нужна сеть — включите соединение", possize: "Размер позиции", logged: "Вердикт закоммичен · сеттл через TxLINE", logged_off: "Вердикт подписан оффлайн · уйдёт при сети", need_keys: "Добавьте API-ключи биржи на сервере (см. доки)", autopilot: "Автопилот" },
    uk: { title: "AI-калькулятор ризику", sub: "Детермінований рушій правил + вердикт ончейн", instrument: "Інструмент", long: "Лонг", short: "Шорт", entry: "Вхід", sl: "Стоп-лос", tp: "Тейк-профіт", lev: "Плече", bal: "Баланс", risk: "Ризик %", analyze: "Аналізувати", rr: "R/R", sldist: "Дист. SL", liq: "Ціна лікв.", possize: "Розмір позиції", margin: "Маржа", maxloss: "Макс. збиток", maxprofit: "Макс. прибуток", verdict_rr: "Якість R/R", verdict_sl: "Розміщення SL", verdict_lev: "Плече", verdict_risk: "Розподіл ризику", overall: "Підсумок", ai: "AI-аналіз", ai_offline: "QVAC на пристрої (офлайн)", ai_online: "Groq × Llama 3.3 70B", logchain: "Записати вердикт ончейн", opentrade: "Відкрити угоду", chart: "Живий графік", chart_off: "Графіку потрібна мережа", logged: "Вердикт закомічено · сетл через TxLINE", logged_off: "Вердикт підписано офлайн", need_keys: "Додайте API-ключі біржі на сервері", autopilot: "Автопілот" },
    de: { title: "KI-Risikorechner", sub: "Deterministische Regel-Engine + On-Chain-Urteil", instrument: "Instrument", long: "Long", short: "Short", entry: "Einstieg", sl: "Stop-Loss", tp: "Take-Profit", lev: "Hebel", bal: "Guthaben", risk: "Risiko %", analyze: "Trade analysieren", rr: "R/R", sldist: "SL-Abstand", liq: "Liq.-Preis", possize: "Positionsgröße", margin: "Margin", maxloss: "Max. Verlust", maxprofit: "Max. Gewinn", verdict_rr: "R/R-Qualität", verdict_sl: "SL-Platzierung", verdict_lev: "Hebel", verdict_risk: "Risikoverteilung", overall: "Gesamt", ai: "KI-Analyse", ai_offline: "QVAC am Gerät (offline)", ai_online: "Groq × Llama 3.3 70B", logchain: "Urteil on-chain speichern", opentrade: "Trade eröffnen", chart: "Live-Chart", chart_off: "Chart braucht Netzwerk", logged: "Urteil committed · settelt via TxLINE", logged_off: "Urteil offline signiert", need_keys: "API-Schlüssel der Börse am Server hinterlegen", autopilot: "Autopilot" },
    es: { title: "Calculadora de riesgo IA", sub: "Motor de reglas determinista + veredicto on-chain", instrument: "Instrumento", long: "Largo", short: "Corto", entry: "Entrada", sl: "Stop loss", tp: "Take profit", lev: "Apalancamiento", bal: "Saldo", risk: "Riesgo %", analyze: "Analizar operación", rr: "R/R", sldist: "Dist. SL", liq: "Precio liq.", possize: "Tamaño posición", margin: "Margen", maxloss: "Pérdida máx.", maxprofit: "Ganancia máx.", verdict_rr: "Calidad R/R", verdict_sl: "Colocación SL", verdict_lev: "Apalancamiento", verdict_risk: "Asignación riesgo", overall: "General", ai: "Análisis IA", ai_offline: "QVAC en dispositivo (offline)", ai_online: "Groq × Llama 3.3 70B", logchain: "Registrar veredicto on-chain", opentrade: "Abrir operación", chart: "Gráfico en vivo", chart_off: "El gráfico necesita red", logged: "Veredicto comprometido · liquida vía TxLINE", logged_off: "Veredicto firmado offline", need_keys: "Añade claves API del exchange en el servidor", autopilot: "Autopiloto" },
  };

  let lang = "en";
  const tr = (k) => (T[lang] && T[lang][k] != null ? T[lang][k] : T.en[k] != null ? T.en[k] : k);

  // ============ CryptoWay deterministic rule engine (ported 1:1) ============
  function computeVerdicts(p) {
    const slDistancePct = (Math.abs(p.sl - p.entry) / p.entry) * 100;
    let rr;
    if (p.rrRatio < 1.5) rr = { label: "❌ Bad", level: "bad", reason: `R/R is ${p.rrRatio.toFixed(2)}:1 — below the 1.5 minimum. The potential reward does not justify the risk. Widen the take profit or tighten the stop loss.` };
    else if (p.rrRatio <= 3) rr = { label: "⚠️ Normal", level: "acceptable", reason: `R/R is ${p.rrRatio.toFixed(2)}:1 — meets the minimum. Workable with a disciplined win rate; above 3:1 would improve long-term expectancy.` };
    else rr = { label: "✅ Excellent", level: "good", reason: `R/R is ${p.rrRatio.toFixed(2)}:1 — well above 3. Asymmetric setup where even a 25–30% win rate is positive expectancy.` };

    let sl;
    if (slDistancePct < 0.3) sl = { label: "⚠️ Too tight — slippage risk", level: "bad", reason: `SL is only ${slDistancePct.toFixed(3)}% from entry (${p.slPips.toFixed(1)} pips). On ${p.instrument}, spread + slippage alone can trigger this stop. Move SL further away.` };
    else if (slDistancePct < 1.0) sl = { label: "✅ Safe distance", level: "acceptable", reason: `SL is ${slDistancePct.toFixed(2)}% from entry (${p.slPips.toFixed(1)} pips). Outside the slippage danger zone; room to absorb normal noise.` };
    else sl = { label: "✅ Well-placed", level: "good", reason: `SL is ${slDistancePct.toFixed(2)}% from entry (${p.slPips.toFixed(1)} pips). Ample room to breathe through volatility spikes on ${p.instrument}.` };

    let leverage;
    const liqStr = p.leverage <= 1 ? "N/A" : `$${(p.liquidationPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    if (p.leverage > 10) leverage = { label: "⚠️ High risk", level: "bad", reason: `${p.leverage}× leverage means a ${(100 / p.leverage).toFixed(1)}% adverse move liquidates at ${liqStr}. Above 10× is speculative — consider scaling down.` };
    else if (p.leverage > 5) leverage = { label: "⚠️ Moderate", level: "acceptable", reason: `${p.leverage}× leverage is manageable but amplifies moves. The ${(100 / p.leverage).toFixed(1)}% liquidation buffer (${liqStr}) should handle normal volatility.` };
    else leverage = { label: "✅ Conservative", level: "good", reason: `${p.leverage}× leverage is conservative for ${p.instrument}. Liquidation is far away (${liqStr}).` };

    let risk;
    const maxLossAmt = `$${p.potentialLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p.riskPercent > 5) risk = { label: "⚠️ Dangerously high", level: "bad", reason: `${p.riskPercent}% risk per trade (${maxLossAmt}) is far above professional limits. A normal 20-trade losing streak would wipe 65%+ of the account. Max recommended is 1–2%.` };
    else if (p.riskPercent > 2) risk = { label: "⚠️ Above standard", level: "acceptable", reason: `${p.riskPercent}% risk per trade (${maxLossAmt}) exceeds the 2% guideline. Sustainable with a high win rate but pressures drawdowns.` };
    else if (p.riskPercent >= 0.5) risk = { label: "✅ Standard", level: "good", reason: `${p.riskPercent}% risk per trade (${maxLossAmt}) follows the pro 1–2% rule. Survives extended drawdowns and compounds steadily.` };
    else risk = { label: "✅ Conservative", level: "good", reason: `${p.riskPercent}% risk per trade (${maxLossAmt}) is very conservative — capital well-protected.` };

    const rrFail = rr.level === "bad", slFail = sl.level === "bad", levHigh = leverage.level === "bad", riskDanger = risk.level === "bad";
    const failCount = [rrFail, slFail, levHigh, riskDanger].filter(Boolean).length;
    let overall;
    if (failCount >= 3) overall = { label: "❌ Do not take this trade", level: "bad", reason: "Multiple critical thresholds breached. Fix R/R, SL, leverage and/or risk sizing before entry." };
    else if (rrFail && slFail) overall = { label: "❌ Do not take this trade", level: "bad", reason: "Both R/R and SL fail minimum requirements. Rework the structure before executing." };
    else if (rrFail && riskDanger) overall = { label: "❌ Do not take this trade", level: "bad", reason: "Bad R/R combined with over-sized risk is a double threat. Fix both." };
    else if (rrFail) overall = { label: "❌ Poor setup — rework TP or SL", level: "bad", reason: "R/R below 1.5:1 is the dealbreaker. Reach at least 1.5:1 before executing." };
    else if (slFail) overall = { label: "❌ Dangerous SL — do not execute", level: "bad", reason: "Stop loss too tight to survive spread + slippage. Move it further away." };
    else if (riskDanger) overall = { label: "❌ Reduce risk size first", level: "bad", reason: "Risking over 5% per trade is account-threatening regardless of setup quality. Cut size first." };
    else {
      const rrEx = rr.level === "good", levOk = !levHigh, riskOk = risk.level === "good";
      if (rrEx && levOk && riskOk) overall = { label: "✅ Strong setup — trade it", level: "good", reason: "Excellent R/R, controlled leverage, professional risk sizing. Execute with discipline." };
      else if (rrEx && levOk && !riskOk) overall = { label: "⚠️ Good setup — reduce risk %", level: "acceptable", reason: "Quality excellent but risk per trade elevated. Reduce to ≤2% before executing." };
      else if (rrEx && levHigh) overall = { label: "⚠️ Good R/R — reduce leverage", level: "acceptable", reason: "R/R excellent but leverage above 10× adds needless liquidation risk. Lower it." };
      else if (!rrEx && levOk && riskOk) overall = { label: "⚠️ Normal — trade with discipline", level: "acceptable", reason: "Meets all minimums. R/R workable but not exceptional — stick to your plan." };
      else overall = { label: "⚠️ Marginal — address weaknesses first", level: "acceptable", reason: "Passes hard minimums but has soft flags. Improve R/R and/or reduce leverage/risk sizing." };
    }
    return { rr, sl, leverage, risk, overall, slDistancePct };
  }

  // ============ position sizing math ============
  function computeTrade(inp) {
    const { instrument, direction, entry, sl, tp, leverage, balance, riskPercent } = inp;
    const pip = (INSTR[instrument] && INSTR[instrument].pip) || 0.01;
    const slDist = Math.abs(entry - sl), tpDist = Math.abs(tp - entry);
    const rrRatio = slDist > 0 ? tpDist / slDist : 0;
    const riskAmount = balance * (riskPercent / 100);
    const positionSize = slDist > 0 ? riskAmount / slDist : 0; // base units
    const notional = positionSize * entry;
    const margin = leverage > 0 ? notional / leverage : notional;
    const potentialLoss = riskAmount;
    const potentialProfit = positionSize * tpDist;
    const liquidationPrice = leverage <= 1 ? null : (direction === "long" ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage));
    return {
      instrument, direction, entry, sl, tp, leverage, balance, riskPercent,
      slPips: slDist / pip, tpPips: tpDist / pip, rrRatio, liquidationPrice,
      potentialProfit, potentialLoss, positionSize, notional, margin,
      depositCurrency: "USDT", depositSymbol: "$",
    };
  }

  // ============ AI narrative (offline template / online Groq via proxy) ============
  function offlineNarrative(v) {
    return [v.rr, v.sl, v.leverage, v.risk].map((x) => `• ${x.label} — ${x.reason}`).join("\n") + `\n\n${tr("overall")}: ${v.overall.label}`;
  }
  async function aiNarrative(p, v, online) {
    const proxy = window.CW_GROQ_PROXY; // set this to your deployed /api/analyze-trade endpoint
    if (online && proxy) {
      try {
        const r = await fetch(proxy, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, lang }) });
        if (r.ok) { const j = await r.json(); if (j.narrative) return { text: j.narrative, src: tr("ai_online") }; }
      } catch (e) { /* fall through to offline */ }
    }
    return { text: offlineNarrative(v), src: tr("ai_offline") };
  }

  // ============ TradingView embed ============
  let tvLoaded = false;
  function loadTV(symbol, online) {
    const host = $("#cwchart");
    if (!host) return;
    if (!online) { host.innerHTML = `<div class="cw-chartoff">${tr("chart_off")}</div>`; return; }
    host.innerHTML = '<div id="cwtv" style="height:100%"></div>';
    const mount = () => { try { new TradingView.widget({ container_id: "cwtv", symbol, interval: "60", theme: "dark", style: "1", locale: lang, autosize: true, hide_side_toolbar: true, allow_symbol_change: false }); } catch (e) {} };
    if (window.TradingView && window.TradingView.widget) return mount();
    if (!tvLoaded) { const s = document.createElement("script"); s.src = "https://s3.tradingview.com/tv.js"; s.onload = mount; s.onerror = () => { host.innerHTML = `<div class="cw-chartoff">${tr("chart_off")}</div>`; }; document.head.appendChild(s); tvLoaded = true; }
    else setTimeout(mount, 800);
  }

  // ============ UI ============
  const S = { opts: null, lastTrade: null, lastVerdicts: null };
  function num(id) { const el = $(id); return parseFloat(el && el.value) || 0; }
  function fmt(n, d = 2) { return n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: d }); }

  function styles() {
    if ($("#cw-style")) return;
    const css = `
    #cwcalc{display:none;flex-direction:column;gap:14px}
    #cwcalc.show{display:flex}
    .cw-head{display:flex;align-items:center;gap:11px}
    .cw-head .ci{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:17px;background:linear-gradient(140deg,rgba(153,69,255,.3),rgba(20,241,149,.2));border:1px solid var(--border2)}
    .cw-head .t{font-size:14.5px;font-weight:700}
    .cw-head .s{font-size:11px;color:var(--text3)}
    .cw-seg{display:flex;background:var(--raised);border:1px solid var(--border2);border-radius:10px;padding:3px;gap:3px}
    .cw-seg button{flex:1;border:none;background:none;color:var(--text2);font-weight:700;font-size:12.5px;padding:8px;border-radius:8px;cursor:pointer;font-family:var(--sans)}
    .cw-seg button.on.long{background:linear-gradient(140deg,#3DD68C,#14F195);color:#0b0d10}
    .cw-seg button.on.short{background:linear-gradient(140deg,#F0A28E,#E97366);color:#0b0d10}
    .cw-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .cw-f{display:flex;flex-direction:column;gap:4px}
    .cw-f label{font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.6px}
    .cw-f input,.cw-f select{background:var(--raised);border:1px solid var(--border2);border-radius:9px;color:var(--text);padding:9px 10px;font-size:13px;font-family:var(--mono);width:100%}
    .cw-f.full{grid-column:1/3}
    .cw-analyze{border:none;border-radius:11px;padding:12px;font-size:13.5px;font-weight:700;color:#0b0d10;cursor:pointer;background:linear-gradient(120deg,var(--sol1),var(--sol2))}
    .cw-metrics{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .cw-m{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px}
    .cw-m .k{font-size:9.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px}
    .cw-m .val{font-family:var(--mono);font-size:13px;font-weight:600;margin-top:3px}
    .cw-verdicts{display:flex;flex-direction:column;gap:7px}
    .cw-v{display:flex;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);border-left-width:3px}
    .cw-v.good{border-left-color:var(--green)} .cw-v.acceptable{border-left-color:var(--orange)} .cw-v.bad{border-left-color:var(--red)}
    .cw-v .vk{font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;min-width:78px;flex:none}
    .cw-v .vl{font-size:12.5px;font-weight:600}
    .cw-overall{padding:13px 15px;border-radius:12px;font-weight:700;font-size:14px;text-align:center}
    .cw-overall.good{background:rgba(61,214,140,.14);color:#7ff0c0;border:1px solid rgba(61,214,140,.3)}
    .cw-overall.acceptable{background:rgba(222,146,59,.14);color:#f0c08a;border:1px solid rgba(222,146,59,.3)}
    .cw-overall.bad{background:rgba(233,115,102,.14);color:#f2a99f;border:1px solid rgba(233,115,102,.3)}
    .cw-ai{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px 15px}
    .cw-ai .ah{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;margin-bottom:8px}
    .cw-ai .ah .src{margin-left:auto;font-size:10px;color:var(--text3);font-family:var(--mono)}
    .cw-ai .body{font-size:12.5px;color:var(--text2);white-space:pre-wrap;line-height:1.6}
    #cwchart{height:230px;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--surface)}
    .cw-chartoff{height:100%;display:grid;place-items:center;color:var(--text3);font-size:12px;text-align:center;padding:16px}
    .cw-actions{display:flex;gap:9px}
    .cw-actions button{flex:1;border-radius:11px;padding:11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--sans)}
    .cw-log{background:linear-gradient(120deg,var(--sol1),var(--sol2));color:#0b0d10;border:none}
    .cw-open{background:var(--raised);color:var(--text);border:1px solid var(--border2)}
    .cw-note{font-size:11px;color:var(--text3);text-align:center;min-height:15px}
    .cw-note.ok{color:var(--green)}
    `;
    const st = document.createElement("style"); st.id = "cw-style"; st.textContent = css; document.head.appendChild(st);
  }

  function render(container) {
    const io = Object.keys(INSTR).map((k) => `<option value="${k}">${k}</option>`).join("");
    container.innerHTML = `
      <div class="cw-head"><span class="ci">⚖️</span><span><span class="t" data-cw="title"></span><br><span class="s" data-cw="sub"></span></span></div>
      <div class="cw-seg"><button class="long on" id="cwLong" data-cw="long"></button><button class="short" id="cwShort" data-cw="short"></button></div>
      <div class="cw-grid">
        <div class="cw-f full"><label data-cw="instrument"></label><select id="cwInstr">${io}</select></div>
        <div class="cw-f"><label data-cw="entry"></label><input id="cwEntry" type="number" step="any"></div>
        <div class="cw-f"><label data-cw="lev"></label><input id="cwLev" type="number" value="5" step="1"></div>
        <div class="cw-f"><label data-cw="sl"></label><input id="cwSl" type="number" step="any"></div>
        <div class="cw-f"><label data-cw="tp"></label><input id="cwTp" type="number" step="any"></div>
        <div class="cw-f"><label data-cw="bal"></label><input id="cwBal" type="number" value="10000" step="any"></div>
        <div class="cw-f"><label data-cw="risk"></label><input id="cwRisk" type="number" value="1" step="0.1"></div>
      </div>
      <button class="cw-analyze" id="cwAnalyze" data-cw="analyze"></button>
      <div class="cw-metrics">
        <div class="cw-m"><div class="k" data-cw="rr"></div><div class="val" id="cwRR">—</div></div>
        <div class="cw-m"><div class="k" data-cw="liq"></div><div class="val" id="cwLiq">—</div></div>
        <div class="cw-m"><div class="k" data-cw="possize"></div><div class="val" id="cwPos">—</div></div>
        <div class="cw-m"><div class="k" data-cw="margin"></div><div class="val" id="cwMargin">—</div></div>
        <div class="cw-m"><div class="k" data-cw="maxloss"></div><div class="val" id="cwLoss">—</div></div>
        <div class="cw-m"><div class="k" data-cw="maxprofit"></div><div class="val" id="cwProfit">—</div></div>
      </div>
      <div class="cw-verdicts" id="cwVerdicts"></div>
      <div class="cw-overall" id="cwOverall" style="display:none"></div>
      <div class="cw-ai"><div class="ah"><span>🧠</span><span data-cw="ai"></span><span class="src" id="cwAiSrc"></span></div><div class="body" id="cwAiBody">—</div></div>
      <div id="cwchart"></div>
      <div class="cw-actions"><button class="cw-log" id="cwLog" data-cw="logchain"></button><button class="cw-open" id="cwOpen" data-cw="opentrade"></button></div>
      <div class="cw-note" id="cwNote"></div>
    `;
    applyLabels(container);
    // defaults from instrument
    const setDefaults = () => {
      const k = $("#cwInstr").value, px = INSTR[k].px, dir = $("#cwLong").classList.contains("on") ? "long" : "short";
      $("#cwEntry").value = px;
      $("#cwSl").value = +(dir === "long" ? px * 0.98 : px * 1.02).toPrecision(6);
      $("#cwTp").value = +(dir === "long" ? px * 1.05 : px * 0.95).toPrecision(6);
    };
    setDefaults();
    $("#cwInstr").onchange = () => { setDefaults(); if (S.online) loadTV(INSTR[$("#cwInstr").value].tv, true); };
    $("#cwLong").onclick = () => { $("#cwLong").classList.add("on"); $("#cwShort").classList.remove("on"); setDefaults(); };
    $("#cwShort").onclick = () => { $("#cwShort").classList.add("on"); $("#cwLong").classList.remove("on"); setDefaults(); };
    $("#cwAnalyze").onclick = analyze;
    $("#cwLog").onclick = logOnChain;
    $("#cwOpen").onclick = openTrade;
  }

  function applyLabels(root) {
    (root || document).querySelectorAll("[data-cw]").forEach((el) => { el.textContent = tr(el.dataset.cw); });
  }

  async function analyze() {
    const inp = {
      instrument: $("#cwInstr").value,
      direction: $("#cwLong").classList.contains("on") ? "long" : "short",
      entry: num("#cwEntry"), sl: num("#cwSl"), tp: num("#cwTp"),
      leverage: num("#cwLev"), balance: num("#cwBal"), riskPercent: num("#cwRisk"),
    };
    if (!inp.entry || !inp.sl || !inp.tp) { $("#cwNote").textContent = "Fill entry / SL / TP"; return; }
    const trade = computeTrade(inp);
    const v = computeVerdicts(trade);
    S.lastTrade = trade; S.lastVerdicts = v;

    $("#cwRR").textContent = trade.rrRatio.toFixed(2) + ":1";
    $("#cwLiq").textContent = trade.liquidationPrice ? "$" + fmt(trade.liquidationPrice, 6) : "N/A";
    $("#cwPos").textContent = fmt(trade.positionSize, 4);
    $("#cwMargin").textContent = "$" + fmt(trade.margin, 2);
    $("#cwLoss").textContent = "$" + fmt(trade.potentialLoss, 0);
    $("#cwProfit").textContent = "$" + fmt(trade.potentialProfit, 0);

    const vd = $("#cwVerdicts");
    const rows = [["verdict_rr", v.rr], ["verdict_sl", v.sl], ["verdict_lev", v.leverage], ["verdict_risk", v.risk]];
    vd.innerHTML = rows.map(([k, x]) => `<div class="cw-v ${x.level}"><span class="vk">${tr(k)}</span><span class="vl">${x.label}</span></div>`).join("");
    const ov = $("#cwOverall"); ov.style.display = "block"; ov.className = "cw-overall " + v.overall.level; ov.textContent = v.overall.label;

    $("#cwAiBody").textContent = "…";
    const ai = await aiNarrative(trade, v, S.online);
    $("#cwAiBody").textContent = ai.text; $("#cwAiSrc").textContent = ai.src;
    $("#cwNote").textContent = ""; $("#cwNote").className = "cw-note";
  }

  async function logOnChain() {
    if (!S.lastVerdicts) { $("#cwNote").textContent = "Analyze a trade first"; return; }
    const t = S.lastTrade, v = S.lastVerdicts;
    const note = $("#cwNote");
    try {
      const payload = { pair: t.instrument, direction: t.direction, entry: t.entry, sl: t.sl, tp: t.tp, leverage: t.leverage, rr: +t.rrRatio.toFixed(2), verdict: v.overall.label };
      if (S.sign) await S.sign({ program: "cryptoway", kind: "log_decision", ...payload });
      note.textContent = S.online ? tr("logged") : tr("logged_off");
      note.className = "cw-note ok";
    } catch (e) { note.textContent = "Sign error: " + (e && e.message); note.className = "cw-note"; }
  }

  async function openTrade() {
    const note = $("#cwNote");
    const ep = window.CW_ORDER_PROXY; // set to your deployed /api/place-order endpoint
    if (!S.lastTrade) { note.textContent = "Analyze a trade first"; return; }
    if (!ep) { note.textContent = tr("need_keys"); note.className = "cw-note"; return; }
    const t = S.lastTrade;
    try {
      note.textContent = "…";
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exchange: "bybit", demo: true, symbol: t.instrument, side: t.direction.toUpperCase(), qty: String(+t.positionSize.toFixed(4)), takeProfit: String(t.tp), stopLoss: String(t.sl), leverage: t.leverage }) });
      const j = await r.json();
      note.textContent = j.orderId ? "Order placed · " + j.orderId : (j.error || "Order failed");
      note.className = j.orderId ? "cw-note ok" : "cw-note";
    } catch (e) { note.textContent = "Order error: " + (e && e.message); note.className = "cw-note"; }
  }

  // ============ public API used by offside.js ============
  window.CW = {
    mount(container, opts) {
      opts = opts || {};
      lang = opts.lang || lang; S.sign = opts.sign; S.online = !!opts.online;
      styles(); render(container);
      if (S.online) loadTV(INSTR[$("#cwInstr").value].tv, true); else loadTV(null, false);
    },
    setLang(l) { lang = l; if ($("#cwcalc")) { applyLabels($("#cwcalc")); if (S.lastVerdicts) analyze(); } },
    setOnline(b) { S.online = !!b; if ($("#cwchart")) loadTV(INSTR[$("#cwInstr").value].tv, S.online); },
    computeVerdicts, computeTrade, // exported for tests
  };
})();
