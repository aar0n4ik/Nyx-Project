"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import Reveal from "@/components/Reveal";

type Market = { q: string; cat: string; prob: number; vol: string; ends: string };
const MARKETS: Market[] = [
  { q: "Will BTC close above $80k this month?", cat: "Crypto", prob: 62, vol: "$1.2M", ends: "in 12d" },
  { q: "ETH flips $5k before Q4?", cat: "Crypto", prob: 38, vol: "$740k", ends: "in 34d" },
  { q: "Will the Fed cut rates in September?", cat: "Macro", prob: 71, vol: "$980k", ends: "in 21d" },
  { q: "Solana daily TXs above 100M this week?", cat: "Crypto", prob: 55, vol: "$610k", ends: "in 5d" },
  { q: "Top lab ships a GPT-5-class model in 2026?", cat: "AI", prob: 44, vol: "$430k", ends: "in 88d" },
  { q: "Will the home team win the finals?", cat: "Sports", prob: 58, vol: "$220k", ends: "in 3d" },
];
const CATS = ["All", "Crypto", "Macro", "AI", "Sports"];

export default function Markets() {
  const [cat, setCat] = useState("All");
  const [active, setActive] = useState<Market | null>(null);
  const shown = cat === "All" ? MARKETS : MARKETS.filter((m) => m.cat === cat);
  return (
    <section id="markets" className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">Live markets</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Trade any outcome, custody nothing</h2>
      </Reveal>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={ "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " + (cat === c ? "bg-ink text-ink" : "border border-hairline bg-white text-muted hover:text-ink") }>{c}</button>
        ))}
      </div>
      <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((m) => (
            <motion.button key={m.q} layout initial={ { opacity: 0, scale: 0.96 } } animate={ { opacity: 1, scale: 1 } } exit={ { opacity: 0, scale: 0.96 } } onClick={() => setActive(m)} className="group flex flex-col rounded-2xl border border-hairline bg-white p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-nyx/5">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-muted">{m.cat}</span>
                <span className="text-xs text-muted">{m.ends}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{m.q}</h3>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-mono font-bold text-payout">YES {m.prob}%</span>
                <span className="font-mono text-muted">NO {100 - m.prob}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-gradient-to-r from-payout to-verify" style={ { width: `${m.prob}%` } } />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">Vol {m.vol}</span>
                <span className="text-sm font-semibold text-nyx group-hover:underline">Bet →</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      <BetModal open={active !== null} onClose={() => setActive(null)} question={active?.q ?? ""} startProb={active?.prob ?? 50} />
    </section>
  );
}
