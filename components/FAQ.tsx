"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "@/components/Reveal";

const FAQS = [
  { q: "How is Nyx zero-custody?", a: "Funds move via place_bet_for under a capped, expiring allowance signed by you. Nyx never holds your balance — the contract pulls only the exact stake and reverts on AmountExceedsLimit." },
  { q: "Who resolves a market?", a: "No one with an admin key. resolve() reads on-chain oracle state; proof-gated markets settle through a verifier CPI, disputed ones run a bonded dispute game with slashing." },
  { q: "What makes the AI verifiable?", a: "Every inference runs in Tether QVAC and emits an ed25519-signed digest to a Solana Memo. Anyone can recompute the digest and match it byte-for-byte." },
  { q: "How are odds priced?", a: "A recentred LMSR curve in nyx_pamm. LP loss is bounded to b·ln(n), so pricing is deterministic and resistant to oracle front-running." },
  { q: "Can I verify past payouts?", a: "Yes — every settlement, dispute and payout links to a real Solana transaction in the Verify section above." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-subtle py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Questions, answered on-chain</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="overflow-hidden rounded-2xl border border-hairline bg-white">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                  <span className="font-display text-lg font-semibold text-ink">{f.q}</span>
                  <Plus className={ "h-5 w-5 shrink-0 text-nyx transition-transform " + (isOpen ? "rotate-45" : "") } />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={ { height: 0, opacity: 0 } } animate={ { height: "auto", opacity: 1 } } exit={ { height: 0, opacity: 0 } } transition={ { duration: 0.3 } }>
                      <p className="px-6 pb-6 leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
