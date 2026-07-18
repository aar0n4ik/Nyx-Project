"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";

// Demo signer used when no wallet is connected (valid devnet pubkey => tx builds cleanly).
const DEMO_ACCOUNT = "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE";

const LINES = [
  "$ nyx agent resolve --market btc-80k",
  "-> fetching oracle state (txoracle.validate_stat_v2)",
  "-> verifying ed25519 proof ... valid",
  "-> running inference in Tether QVAC (Qwen3-4B)",
  "-> digest 38d667dd...e8310c written to Solana Memo",
  "-> settle_verified CPI ... confirmed",
  "market resolved YES - payouts streaming",
];

type Line = { text: string; cls: string };

function clsFor(kind: string, text: string): string {
  if (kind === "final" || text.startsWith("market") || text.startsWith("\u2714") || text.includes("APPROVE")) return "text-payout";
  if (kind === "error" || text.startsWith("\u2717") || text.includes("REJECT")) return "text-[#FF5F57]";
  if (text.startsWith("$")) return "text-white";
  if (text.startsWith("[A]")) return "text-verify";
  if (text.startsWith("[B]")) return "text-[#FEBC2E]";
  if (text.startsWith("[C]")) return "text-nyx";
  return "text-white/70";
}

function pct(n: any): string { const v = Number(n); return Number.isFinite(v) ? (v * 100).toFixed(1) + "c" : "-"; }

function renderEvent(ev: any, push: (t: string, k?: string) => void) {
  switch (ev.type) {
    case "start": break;
    case "tool_call": push("[" + ev.agent + "] \u2192 " + ev.name + "()", ev.type); break;
    case "tool_result": push("[" + ev.agent + "] \u2190 " + ev.name + (ev.result && ev.result.error ? " err" : " ok"), ev.type); break;
    case "state": {
      const s = ev.state || {};
      push("[A] fair P(yes)=" + pct(s.modelProbYes) + "  price=" + pct(s.lmsrPriceYes) + "  txlineSeq=" + (s.txlineSeq ?? "-"), "state");
      break;
    }
    case "verdict": {
      const v = ev.verdict || {};
      push("[B] " + (v.approve ? "APPROVE" : "REJECT") + "  edge=" + ((Number(v.edgeBps) || 0) / 100).toFixed(2) + "%  maxStake=" + v.maxStake + "  riskBps=" + v.riskBps, "verdict");
      (v.reasons || []).slice(0, 2).forEach((r: string) => push("    \u00b7 " + r, ""));
      break;
    }
    case "final": {
      push("[C] tx built (" + (ev.plan && ev.plan.mode) + ")  cot=" + String(ev.cotDigest || "").slice(0, 10) + "\u2026", "final");
      push("\u2714 consensus reached \u2014 awaiting user signature", "final");
      break;
    }
    case "abort": push("\u2717 risk manager vetoed \u2014 no trade  cot=" + String(ev.cotDigest || "").slice(0, 10) + "\u2026", "error"); break;
    case "error": push("error: " + ev.message, "error"); break;
    case "done": break;
    default: break;
  }
}

export default function AgentTerminal() {
  const lang = useLang();
  const [visible, setVisible] = useState(0);
  const [run, setRun] = useState(false);
  const [live, setLive] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRun(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!run || live.length || visible >= LINES.length) return;
    const id = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(id);
  }, [run, visible, live.length]);

  async function runLive() {
    if (running) return;
    setRunning(true);
    setLive([{ text: "$ nyx agent-run --fixture 17588232 --market ou25 --mode unsigned", cls: "text-white" }]);
    const push = (text: string, kind = "") => setLive((p) => [...p, { text, cls: clsFor(kind, text) }]);
    try {
      const acct = (typeof window !== "undefined" && (window as any).solana?.publicKey?.toString?.()) || DEMO_ACCOUNT;
      const res = await fetch("/api/agent-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: acct, fixtureId: "17588232", market: "ou25", desiredStake: 25, allowanceRemaining: 100, execMode: "unsigned" }),
      });
      if (!res.body) { push("stream unavailable", "error"); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const dataLine = part.split("\n").find((x) => x.startsWith("data:"));
          if (!dataLine) continue;
          let ev: any = {};
          try { ev = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
          renderEvent(ev, push);
        }
      }
    } catch (e: any) {
      push("error: " + String((e && e.message) || e), "error");
    } finally {
      setRunning(false);
    }
  }

  const body: Line[] = live.length ? live : LINES.slice(0, visible).map((l) => ({ text: l, cls: clsFor("", l) }));
  const showCursor = live.length ? running : visible < LINES.length;

  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">{pick(lang, { en: "Autonomous resolution", ru: "Автономное разрешение исходов", es: "Resolución autónoma", pt: "Resolução autônoma", fr: "Résolution autonome", de: "Autonome Auflösung", zh: "自主判定结算" })}</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, { en: "Watch the agents reach consensus", ru: "Смотри, как агенты приходят к консенсусу", es: "Mira a los agentes llegar a consenso", pt: "Veja os agentes chegarem a consenso", fr: "Regardez les agents atteindre un consensus", de: "Sieh zu, wie die Agenten Konsens erreichen", zh: "观看智能体达成共识" })}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">{pick(lang, { en: "Data Oracle → Risk Manager → Executor. Live, on real oracle data, with an on-chain reasoning digest.", ru: "Data Oracle → Risk Manager → Executor. Вживую, на реальных данных оракула, с ончейн-дайджестом рассуждений.", es: "Data Oracle → Risk Manager → Executor. En vivo, con datos reales del oráculo.", pt: "Data Oracle → Risk Manager → Executor. Ao vivo, com dados reais do oráculo.", fr: "Data Oracle → Risk Manager → Executor. En direct, sur des données d'oracle réelles.", de: "Data Oracle → Risk Manager → Executor. Live, mit echten Orakeldaten.", zh: "数据预言机 → 风险管理 → 执行器。基于真实预言机数据实时运行。" })}</p>
      </Reveal>
      <div ref={ref} className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-hairline bg-[#0B0B14] shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 font-mono text-xs text-white/40">nyx-agent · A→B→C</span>
          <button onClick={runLive} disabled={running} className="ml-auto rounded-md border border-white/15 px-2 py-1 font-mono text-[11px] text-white/70 transition hover:text-white disabled:opacity-40">
            {running ? pick(lang, { en: "running…", ru: "идёт…", es: "en curso…", pt: "rodando…", fr: "en cours…", de: "läuft…", zh: "运行中…" }) : pick(lang, { en: "▶ run live", ru: "▶ запустить", es: "▶ ejecutar", pt: "▶ executar", fr: "▶ lancer", de: "▶ starten", zh: "▶ 运行" })}
          </button>
        </div>
        <div className="max-h-80 space-y-1.5 overflow-y-auto p-5 font-mono text-sm">
          {body.map((ln, i) => (<div key={i} className={ln.cls}>{ln.text}</div>))}
          {showCursor && <span className="inline-block h-4 w-2 animate-blink bg-verify align-middle" />}
        </div>
      </div>
    </section>
  );
}
