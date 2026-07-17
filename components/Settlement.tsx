"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import Reveal from "@/components/Reveal";

const MODES = {
  proof: { label: "Proof-gated", tint: "text-nyx", steps: ["Oracle emits txoracle.validate_stat_v2", "nyx_verifier checks the signed proof", "settle_verified CPI fires automatically", "Payout streamed — no human ever touches it"] },
  dispute: { label: "Dispute game", tint: "text-verify", steps: ["Proposer posts outcome + bond", "Challenger disputes inside the window", "Arbiter rules, loser bond is slashed", "oracle_bridge PDA → nyx_settlement.resolve"] },
} as const;

type Key = keyof typeof MODES;

export default function Settlement() {
  const [mode, setMode] = useState<Key>("proof");
  const active = MODES[mode];
  return (
    <section className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">Two paths, one guarantee</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Settlement without a referee</h2>
        </Reveal>
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-xl border border-hairline bg-white p-1">
            {(Object.keys(MODES) as Key[]).map((k) => (
              <button key={k} onClick={() => setMode(k)} className={ "rounded-lg px-5 py-2 text-sm font-semibold transition-colors " + (mode === k ? "bg-ink text-ink" : "text-muted hover:text-ink") }>{MODES[k].label}</button>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.ol key={mode} initial={ { opacity: 0, y: 12 } } animate={ { opacity: 1, y: 0 } } exit={ { opacity: 0, y: -12 } } transition={ { duration: 0.3 } } className="space-y-3">
              {active.steps.map((s, i) => (
                <motion.li key={s} initial={ { opacity: 0, x: -12 } } animate={ { opacity: 1, x: 0 } } transition={ { delay: i * 0.1 } } className="flex items-center gap-4 rounded-xl border border-hairline bg-white p-4">
                  <span className={ `flex h-8 w-8 items-center justify-center rounded-full bg-subtle font-mono text-sm font-bold ${active.tint}` }>{i + 1}</span>
                  <span className="text-sm text-ink">{s}</span>
                  <Check className={ `ml-auto h-4 w-4 ${active.tint}` } />
                </motion.li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
