"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function BetModal({ open, onClose, question = "Will BTC close above $80k?", startProb = 62 }: { open: boolean; onClose: () => void; question?: string; startProb?: number }) {
  const [stake, setStake] = useState(100);
  const [prob, setProb] = useState(startProb);

  useEffect(() => { if (open) setProb(startProb); }, [open, startProb]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const payout = (stake / (prob / 100)).toFixed(2);
  const profit = (Number(payout) - stake).toFixed(2);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={ { opacity: 0 } } animate={ { opacity: 1 } } exit={ { opacity: 0 } }>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" initial={ { opacity: 0, scale: 0.94, y: 20 } } animate={ { opacity: 1, scale: 1, y: 0 } } exit={ { opacity: 0, scale: 0.94, y: 20 } } transition={ { type: "spring", stiffness: 260, damping: 24 } } className="relative z-10 w-full max-w-md rounded-2xl border border-hairline bg-white p-6 shadow-2xl">
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink">×</button>
            <div className="mb-1 text-xs font-mono uppercase tracking-widest text-nyx">Zero-custody bet</div>
            <h3 className="font-display text-xl font-bold leading-snug text-ink">{question}</h3>
            <p className="mt-1 text-sm text-muted">Funds never leave your wallet. Settlement is on-chain.</p>
            <div className="mt-5 space-y-5">
              <div>
                <div className="flex justify-between text-sm"><span className="text-muted">Stake</span><span className="font-mono font-semibold text-ink">{stake} USD₮</span></div>
                <input type="range" min={10} max={1000} step={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-2 w-full accent-nyx" />
              </div>
              <div>
                <div className="flex justify-between text-sm"><span className="text-muted">Implied probability</span><span className="font-mono font-semibold text-ink">{prob}%</span></div>
                <input type="range" min={5} max={95} step={1} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="mt-2 w-full accent-verify" />
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <div className="flex justify-between text-sm"><span className="text-muted">Potential payout</span><span className="font-mono font-bold text-payout">{payout} USD₮</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted">Net profit</span><span className="font-mono font-semibold text-ink">+{profit} USD₮</span></div>
              </div>
              <button className="w-full rounded-xl bg-ink py-3 font-semibold text-white transition-transform hover:-translate-y-0.5">Sign allowance → place bet</button>
              <p className="text-center text-xs text-muted">Capped, expiring allowance. Revert on AmountExceedsLimit.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
