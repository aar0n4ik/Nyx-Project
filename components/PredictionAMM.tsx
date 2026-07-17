"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";

export default function PredictionAMM() {
  const [yes, setYes] = useState(0.62);
  useEffect(() => {
    const id = setInterval(() => { setYes((p) => { const next = p + (Math.random() - 0.5) * 0.04; return Math.min(0.9, Math.max(0.1, next)); }); }, 1400);
    return () => clearInterval(id);
  }, []);
  const no = 1 - yes;
  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-payout">Recentred LMSR pricing</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Odds that can&apos;t be gamed</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">nyx_pamm prices every share with a recentred LMSR curve. Max LP loss is bounded to b·ln(n) — deterministic, front-running-proof.</p>
      </Reveal>
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-hairline bg-white p-8 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold text-muted">YES</div>
            <motion.div key={Math.round(yes * 1000)} initial={ { opacity: 0.4, y: 6 } } animate={ { opacity: 1, y: 0 } } className="font-display text-5xl font-bold text-payout">{(yes * 100).toFixed(1)}%</motion.div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-muted">NO</div>
            <div className="font-display text-5xl font-bold text-ink">{(no * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-subtle">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-payout to-verify" animate={ { width: `${yes * 100}%` } } transition={ { type: "spring", stiffness: 120, damping: 20 } } />
        </div>
        <div className="mt-6 flex justify-between font-mono text-xs text-muted"><span>b = 250</span><span>max LP loss ≤ b·ln(2) ≈ 173 USD₮</span></div>
      </div>
    </section>
  );
}
