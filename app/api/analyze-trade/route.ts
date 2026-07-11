/*
 * POST /api/analyze-trade
 * Body = the computeTrade() payload from the calculator + { lang }.
 * Returns { narrative, source }. Works WITHOUT a key (deterministic rule engine);
 * if GROQ_API_KEY is set it upgrades the narrative with Groq x Llama 3.3 70B.
 * Rule engine ported 1:1 from github.com/aar0n4ik/CryptoWay.
 */
export const runtime = "edge";

type V = { label: string; level: "good" | "acceptable" | "bad"; reason: string };

function computeVerdicts(p: any) {
  const slDistancePct = (Math.abs(p.sl - p.entry) / p.entry) * 100;
  let rr: V;
  if (p.rrRatio < 1.5) rr = { label: "Bad", level: "bad", reason: `R/R is ${(+p.rrRatio).toFixed(2)}:1 — below the 1.5 minimum. Widen the take profit or tighten the stop.` };
  else if (p.rrRatio <= 3) rr = { label: "Normal", level: "acceptable", reason: `R/R is ${(+p.rrRatio).toFixed(2)}:1 — meets the minimum; above 3:1 improves expectancy.` };
  else rr = { label: "Excellent", level: "good", reason: `R/R is ${(+p.rrRatio).toFixed(2)}:1 — asymmetric; positive expectancy even at a low win rate.` };

  let sl: V;
  if (slDistancePct < 0.3) sl = { label: "Too tight", level: "bad", reason: `SL only ${slDistancePct.toFixed(3)}% from entry (${(+p.slPips).toFixed(1)} pips) — spread + slippage can trigger it.` };
  else if (slDistancePct < 1.0) sl = { label: "Safe distance", level: "acceptable", reason: `SL is ${slDistancePct.toFixed(2)}% from entry — outside the slippage danger zone.` };
  else sl = { label: "Well-placed", level: "good", reason: `SL is ${slDistancePct.toFixed(2)}% from entry — ample room through volatility.` };

  const liqStr = p.leverage <= 1 ? "N/A" : `$${Number(p.liquidationPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
  let leverage: V;
  if (p.leverage > 10) leverage = { label: "High risk", level: "bad", reason: `${p.leverage}x — a ${(100 / p.leverage).toFixed(1)}% adverse move liquidates at ${liqStr}. Above 10x is speculative.` };
  else if (p.leverage > 5) leverage = { label: "Moderate", level: "acceptable", reason: `${p.leverage}x — manageable; ${(100 / p.leverage).toFixed(1)}% liquidation buffer (${liqStr}).` };
  else leverage = { label: "Conservative", level: "good", reason: `${p.leverage}x — conservative; liquidation far away (${liqStr}).` };

  const maxLossAmt = `$${Number(p.potentialLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  let risk: V;
  if (p.riskPercent > 5) risk = { label: "Dangerously high", level: "bad", reason: `${p.riskPercent}% per trade (${maxLossAmt}) — far above pro limits. Max recommended 1-2%.` };
  else if (p.riskPercent > 2) risk = { label: "Above standard", level: "acceptable", reason: `${p.riskPercent}% per trade (${maxLossAmt}) — exceeds the 2% guideline.` };
  else if (p.riskPercent >= 0.5) risk = { label: "Standard", level: "good", reason: `${p.riskPercent}% per trade (${maxLossAmt}) — follows the pro 1-2% rule.` };
  else risk = { label: "Conservative", level: "good", reason: `${p.riskPercent}% per trade (${maxLossAmt}) — capital well protected.` };

  const rrFail = rr.level === "bad", slFail = sl.level === "bad", levHigh = leverage.level === "bad", riskDanger = risk.level === "bad";
  const failCount = [rrFail, slFail, levHigh, riskDanger].filter(Boolean).length;
  let overall: V;
  if (failCount >= 3) overall = { label: "Do not take this trade", level: "bad", reason: "Multiple critical thresholds breached." };
  else if (rrFail && slFail) overall = { label: "Do not take this trade", level: "bad", reason: "Both R/R and SL fail minimums." };
  else if (rrFail && riskDanger) overall = { label: "Do not take this trade", level: "bad", reason: "Bad R/R plus oversized risk." };
  else if (rrFail) overall = { label: "Poor setup — rework TP or SL", level: "bad", reason: "R/R below 1.5:1 is the dealbreaker." };
  else if (slFail) overall = { label: "Dangerous SL", level: "bad", reason: "Stop too tight for spread + slippage." };
  else if (riskDanger) overall = { label: "Reduce risk size first", level: "bad", reason: "Over 5% per trade is account-threatening." };
  else {
    const rrEx = rr.level === "good", levOk = !levHigh, riskOk = risk.level === "good";
    if (rrEx && levOk && riskOk) overall = { label: "Strong setup — trade it", level: "good", reason: "Excellent R/R, controlled leverage, pro risk sizing." };
    else if (rrEx && levOk && !riskOk) overall = { label: "Good setup — reduce risk %", level: "acceptable", reason: "Quality excellent but risk elevated." };
    else if (rrEx && levHigh) overall = { label: "Good R/R — reduce leverage", level: "acceptable", reason: "R/R excellent but leverage over 10x." };
    else if (!rrEx && levOk && riskOk) overall = { label: "Normal — trade with discipline", level: "acceptable", reason: "Meets all minimums." };
    else overall = { label: "Marginal", level: "acceptable", reason: "Passes hard minimums but has soft flags." };
  }
  return { rr, sl, leverage, risk, overall, slDistancePct };
}

const LANG: Record<string, string> = { en: "English", ru: "Russian", uk: "Ukrainian", de: "German", es: "Spanish" };

export async function POST(req: Request) {
  let p: any;
  try { p = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }
  const v = computeVerdicts(p);
  const offline =
    [v.rr, v.sl, v.leverage, v.risk].map((x) => `• ${x.label} — ${x.reason}`).join("\n") +
    `\n\nOverall: ${v.overall.label} — ${v.overall.reason}`;

  const key = process.env.GROQ_API_KEY;
  if (!key) return json({ narrative: offline, source: "rule-engine (offline)", verdicts: v });

  try {
    const language = LANG[p.lang] || "English";
    const system = "You are CryptoWay, an elite crypto risk manager. Explain the trade using ONLY the pre-computed verdicts provided. Be concise, direct, no hedging, no financial-advice disclaimers. 5-8 short sentences.";
    const user =
      `Write the analysis in ${language}.\n` +
      `Instrument ${p.instrument} ${p.direction}. Entry ${p.entry}, SL ${p.sl}, TP ${p.tp}, leverage ${p.leverage}x, balance ${p.balance}, risk ${p.riskPercent}%.\n` +
      `R/R ${Number(p.rrRatio).toFixed(2)}:1. Liquidation ${p.liquidationPrice}. Max loss ${p.potentialLoss}. Max profit ${p.potentialProfit}.\n` +
      `Verdicts: R/R=${v.rr.label}; SL=${v.sl.label}; Leverage=${v.leverage.label}; Risk=${v.risk.label}; Overall=${v.overall.label}.\n` +
      `Reasons: ${v.rr.reason} ${v.sl.reason} ${v.leverage.reason} ${v.risk.reason}`;
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.15,
        max_tokens: 600,
        messages: [ { role: "system", content: system }, { role: "user", content: user } ],
      }),
    });
    if (!r.ok) return json({ narrative: offline, source: `rule-engine (groq ${r.status})`, verdicts: v });
    const jr: any = await r.json();
    const narrative = jr?.choices?.[0]?.message?.content?.trim() || offline;
    return json({ narrative, source: "groq/llama-3.3-70b-versatile", verdicts: v });
  } catch {
    return json({ narrative: offline, source: "rule-engine (offline)", verdicts: v });
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
