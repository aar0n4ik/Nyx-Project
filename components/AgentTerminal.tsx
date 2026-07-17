"use client";
import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";

const LINES = [
  "$ nyx agent resolve --market btc-80k",
  "-> fetching oracle state (txoracle.validate_stat_v2)",
  "-> verifying ed25519 proof ... valid",
  "-> running inference in Tether QVAC (Qwen3-4B)",
  "-> digest 38d667dd...e8310c written to Solana Memo",
  "-> settle_verified CPI ... confirmed",
  "market resolved YES - payouts streaming",
];

export default function AgentTerminal() {
  const [visible, setVisible] = useState(0);
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRun(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!run || visible >= LINES.length) return;
    const id = setTimeout(() => setVisible((v) => v + 1), 700);
    return () => clearTimeout(id);
  }, [run, visible]);
  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">Autonomous resolution</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Watch an agent settle a market</h2>
      </Reveal>
      <div ref={ref} className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-hairline bg-[#0B0B14] shadow-xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 font-mono text-xs text-white/40">nyx-agent — settlement</span>
        </div>
        <div className="space-y-1.5 p-5 font-mono text-sm">
          {LINES.slice(0, visible).map((l, i) => {
            const cls = l.startsWith("market") ? "text-payout" : l.startsWith("$") ? "text-white" : "text-white/70";
            return <div key={i} className={cls}>{l}</div>;
          })}
          {visible < LINES.length && <span className="inline-block h-4 w-2 animate-blink bg-verify align-middle" />}
        </div>
      </div>
    </section>
  );
}
