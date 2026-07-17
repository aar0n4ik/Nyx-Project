"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/Reveal";

const NAMES = ["7xKp…9fA", "3mNq…2vB", "Bde1…kQ4", "9zRt…7pL", "Fh2c…8wX", "2Ykd…5nM", "Qp8s…1dV"];
type Row = { id: number; who: string; amount: number };

export default function Distribution() {
  const [rows, setRows] = useState<Row[]>([]);
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRun(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      idRef.current += 1;
      const row: Row = { id: idRef.current, who: NAMES[Math.floor(Math.random() * NAMES.length)], amount: Math.floor(20 + Math.random() * 480) };
      setRows((prev) => [row, ...prev].slice(0, 6));
    }, 1200);
    return () => clearInterval(id);
  }, [run]);
  return (
    <section ref={ref} className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-payout">Live distribution</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Payouts land the moment markets resolve</h2>
      </Reveal>
      <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-hairline bg-white p-4 shadow-sm">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div key={r.id} layout initial={ { opacity: 0, y: -16, scale: 0.98 } } animate={ { opacity: 1, y: 0, scale: 1 } } exit={ { opacity: 0 } } transition={ { type: "spring", stiffness: 300, damping: 26 } } className="flex items-center justify-between border-b border-hairline px-3 py-3 last:border-0">
              <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-payout" /><span className="font-mono text-sm text-ink">{r.who}</span></div>
              <span className="font-mono text-sm font-semibold text-payout">+{r.amount} USD₮</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {rows.length === 0 && (<div className="px-3 py-6 text-center text-sm text-muted">Waiting for the next resolution…</div>)}
      </div>
    </section>
  );
}
