"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Connection, Transaction } from "@solana/web3.js";

const DEMO_ACCOUNT = "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE";
const DEVNET_RPC = "https://api.devnet.solana.com";
const MARKET_LABELS: Record<string, string> = { ou25: "Over 2.5 goals", ou15: "Over 1.5 goals", btts: "Both teams score", h: "Home win", d: "Draw", a: "Away win" };
const MARKETS = ["ou25", "ou15", "btts", "h", "d", "a"];

type Preset = { id: string; name: string; blurb: string; riskAppetite: number; oracleTrust: number; stake: number; execMode: "unsigned" | "delegated" };
const PRESETS: Preset[] = [
  { id: "degen", name: "Aggressive Degen", blurb: "Thin edge, big size, auto-fires within allowance", riskAppetite: 0.92, oracleTrust: 0.25, stake: 80, execMode: "delegated" },
  { id: "quant", name: "Conservative Risk Manager", blurb: "Needs a fat edge, small size, human signs", riskAppetite: 0.15, oracleTrust: 0.85, stake: 10, execMode: "unsigned" },
  { id: "analyst", name: "Insider Analyst", blurb: "Balanced; leans on its own model read", riskAppetite: 0.6, oracleTrust: 0.4, stake: 30, execMode: "unsigned" },
];

type Line = { text: string; cls: string };
type Plan = { unsignedTxBase64: string; mode: string } | null;

function pct(n: any): string { const v = Number(n); return Number.isFinite(v) ? (v * 100).toFixed(1) + "c" : "-"; }
function clsFor(kind: string, text: string): string {
  if (kind === "final" || text.startsWith("\u2714") || text.startsWith("\u26d3")) return "text-emerald-400";
  if (kind === "error" || text.startsWith("\u2717")) return "text-rose-400";
  if (text.startsWith("$")) return "text-white";
  if (text.startsWith("[A]")) return "text-sky-400";
  if (text.startsWith("[B]")) return "text-amber-400";
  if (text.startsWith("[C]")) return "text-violet-400";
  if (text.startsWith("[policy]")) return "text-fuchsia-400";
  return "text-white/60";
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default function AgentSandbox() {
  const [presetId, setPresetId] = useState("analyst");
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const [riskAppetite, setRiskAppetite] = useState(preset.riskAppetite);
  const [oracleTrust, setOracleTrust] = useState(preset.oracleTrust);
  const [stake, setStake] = useState(preset.stake);
  const [execMode, setExecMode] = useState<"unsigned" | "delegated">(preset.execMode);
  const [fixtureId, setFixtureId] = useState("17588232");
  const [market, setMarket] = useState("ou25");

  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0); // 0 idle,1 A,2 B,3 C
  const [plan, setPlan] = useState<Plan>(null);
  const [proof, setProof] = useState<{ digest: string; url?: string } | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState("");

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id); setRiskAppetite(p.riskAppetite); setOracleTrust(p.oracleTrust); setStake(p.stake); setExecMode(p.execMode);
  }
  async function connectWallet() {
    const p = (window as any).solana;
    if (!p) { setTxStatus("no wallet (install Phantom/Backpack)"); return; }
    try { const res = await p.connect(); setWallet(res.publicKey.toString()); } catch { setTxStatus("connect rejected"); }
  }

  function render(ev: any, push: (t: string, k?: string) => void) {
    switch (ev.type) {
      case "tool_call": setStage(ev.agent === "A" ? 1 : ev.agent === "B" ? 2 : 3); push("[" + ev.agent + "] \u2192 " + ev.name + "()", ev.type); break;
      case "tool_result": push("[" + ev.agent + "] \u2190 " + ev.name + (ev.result && ev.result.error ? " err" : " ok"), ev.type); break;
      case "state": { setStage(1); const s = ev.state || {}; push("[A] fair P(yes)=" + pct(s.modelProbYes) + " price=" + pct(s.lmsrPriceYes) + " txlineSeq=" + (s.txlineSeq ?? "-"), "state"); break; }
      case "persona": push("[policy] " + ev.persona + " \u00b7 edge=" + (ev.edgeBps / 100).toFixed(2) + "% floor=" + (ev.requiredEdgeBps / 100).toFixed(2) + "% \u2192 " + (ev.approve ? "APPROVE" : "REJECT"), "policy"); break;
      case "verdict": { setStage(2); const v = ev.verdict || {}; push("[B] " + (v.approve ? "APPROVE" : "REJECT") + " edge=" + ((Number(v.edgeBps) || 0) / 100).toFixed(2) + "% maxStake=" + v.maxStake + " kelly=" + v.kellyFraction, "verdict"); (v.reasons || []).slice(-2).forEach((r: string) => push("   \u00b7 " + r, "")); break; }
      case "proof": setProof({ digest: ev.digest, url: ev.url }); push("\u26d3 Proof-of-Reasoning anchored: " + String(ev.digest || "").slice(0, 12) + "\u2026" + (ev.url ? "" : " (local: " + (ev.error || "no agent key") + ")"), "final"); break;
      case "final": { setStage(3); push("[C] tx built (" + (ev.plan && ev.plan.mode) + ") side=" + (ev.plan && ev.plan.sideYes ? "YES" : "NO") + " amount=" + (ev.plan && ev.plan.amount), "final"); push("\u2714 consensus \u2014 ready to sign", "final"); break; }
      case "abort": push("\u2717 risk manager vetoed \u2014 no trade", "error"); break;
      case "error": push("error: " + ev.message, "error"); break;
      default: break;
    }
  }

  async function runLive() {
    if (running) return;
    setRunning(true); setPlan(null); setProof(null); setTxSig(null); setTxStatus(""); setStage(0);
    const first: Line = { text: "$ nyx sandbox --persona " + preset.name + " --risk " + riskAppetite.toFixed(2) + " --oracleTrust " + oracleTrust.toFixed(2) + " --stake " + stake, cls: "text-white" };
    setLines([first]);
    const push = (text: string, kind = "") => setLines((prev) => [...prev, { text, cls: clsFor(kind, text) }]);
    try {
      const acct = wallet || DEMO_ACCOUNT;
      const res = await fetch("/api/agent-run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: acct, fixtureId, market, desiredStake: Number(stake) || 1, allowanceRemaining: Math.max(100, (Number(stake) || 1) * 4), execMode, persona: preset.name, riskAppetite, oracleTrust }),
      });
      if (!res.body) { push("stream unavailable", "error"); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() || "";
        for (const part of parts) {
          const dataLine = part.split("\n").find((x) => x.startsWith("data:"));
          if (!dataLine) continue;
          let ev: any = {}; try { ev = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
          render(ev, push);
          if (ev.type === "final" && ev.plan) setPlan({ unsignedTxBase64: ev.plan.unsignedTxBase64, mode: ev.plan.mode });
        }
      }
    } catch (e: any) { push("error: " + String((e && e.message) || e), "error"); }
    finally { setRunning(false); }
  }

  async function signSend() {
    const p = (window as any).solana;
    if (!p || !wallet) { await connectWallet(); return; }
    if (!plan || !plan.unsignedTxBase64) return;
    try {
      setTxStatus("signing\u2026");
      const tx = Transaction.from(b64ToBytes(plan.unsignedTxBase64));
      const signed = await p.signTransaction(tx);
      const conn = new Connection(DEVNET_RPC, "confirmed");
      setTxStatus("sending\u2026");
      const sig = await conn.sendRawTransaction(signed.serialize());
      setTxSig(sig); setTxStatus("confirming\u2026");
      await conn.confirmTransaction(sig, "confirmed"); setTxStatus("confirmed");
    } catch (e: any) { setTxStatus("error: " + String((e && e.message) || e)); }
  }

  const input = "rounded-md border border-white/10 bg-[#0B0B14] px-2 py-1 font-mono text-xs text-white outline-none focus:border-violet-500";
  const node = (n: number, label: string, color: string) => (
    <div className={"flex-1 rounded-md border px-3 py-2 text-center text-xs font-mono transition " + (stage >= n ? color + " border-transparent text-white" : "border-white/10 text-white/40")}>{label}</div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* Left: builder */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-[#0B0B14] p-4">
        <div className="text-xs uppercase tracking-wide text-white/40">Agent persona</div>
        <div className="grid gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.id)} className={"rounded-lg border px-3 py-2 text-left transition " + (presetId === p.id ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/25")}>
              <div className="text-sm font-medium text-white">{p.name}</div>
              <div className="text-[11px] text-white/50">{p.blurb}</div>
            </button>
          ))}
        </div>
        <label className="block text-xs text-white/60">Risk appetite <span className="text-white/40">({riskAppetite.toFixed(2)})</span>
          <input type="range" min={0} max={1} step={0.01} value={riskAppetite} onChange={(e) => setRiskAppetite(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
        </label>
        <label className="block text-xs text-white/60">Oracle trust <span className="text-white/40">({oracleTrust.toFixed(2)})</span>
          <input type="range" min={0} max={1} step={0.01} value={oracleTrust} onChange={(e) => setOracleTrust(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
        </label>
        <div className="flex gap-2">
          <input value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className={input + " w-full"} placeholder="Match ID" />
          <select value={market} onChange={(e) => setMarket(e.target.value)} className={input}>{MARKETS.map((m) => <option key={m} value={m}>{MARKET_LABELS[m] || m}</option>)}</select>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value))} className={input + " w-24"} placeholder="Stake" />
          <select value={execMode} onChange={(e) => setExecMode(e.target.value as any)} className={input}><option value="unsigned">unsigned</option><option value="delegated">delegated</option></select>
          <button onClick={connectWallet} className={input + " ml-auto"}>{wallet ? wallet.slice(0, 4) + "\u2026" + wallet.slice(-4) : "connect"}</button>
        </div>
        <button onClick={runLive} disabled={running} className="w-full rounded-md bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">{running ? "running\u2026" : "\u25b6 Launch agent"}</button>
      </div>

      {/* Right: arena */}
      <div className="space-y-3">
        <div className="flex gap-2">{node(1, "Data Oracle (A)", "bg-sky-600")}{node(2, "Risk Manager (B)", "bg-amber-600")}{node(3, "Executor (C)", "bg-violet-600")}</div>
        <div className="h-[360px] overflow-auto rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs leading-relaxed">
          {lines.length === 0 ? <div className="text-white/30">Pick a persona, move the sliders, and launch. Watch the approve boundary, stake and side change live.</div> : lines.map((ln, i) => <div key={i} className={ln.cls}>{ln.text}</div>)}
          {running && <span className="animate-pulse text-white/40">\u2588</span>}
        </div>
        {proof && (
          <div className="rounded-lg border border-white/10 bg-[#0B0B14] p-3 text-xs">
            <span className="text-white/60">Chain-of-Thought digest: </span><span className="font-mono text-emerald-400">{proof.digest.slice(0, 24)}\u2026</span>
            {proof.url && <a href={proof.url} target="_blank" rel="noreferrer" className="ml-2 text-violet-400 underline">verify on-chain \u2197</a>}
          </div>
        )}
        {plan && plan.mode === "unsigned" && (
          <div className="flex items-center gap-3">
            <button onClick={signSend} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Sign & send bet</button>
            {txStatus && <span className="text-xs text-white/60">{txStatus}</span>}
            {txSig && <a href={"https://explorer.solana.com/tx/" + txSig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="text-xs text-violet-400 underline">explorer \u2197</a>}
          </div>
        )}
      </div>
    </div>
  );
}
