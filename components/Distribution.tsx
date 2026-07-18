"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";

const NAMES = ["7xKp…9fA", "3mNq…2vB", "Bde1…kQ4", "9zRt…7pL", "Fh2c…8wX", "2Ykd…5nM", "Qp8s…1dV"];
type Row = { id: number; who: string; amount: number };

const rowInit = { opacity: 0, y: -16, scale: 0.98 } as const;
const rowAnim = { opacity: 1, y: 0, scale: 1 } as const;
const rowExit = { opacity: 0 } as const;
const rowTrans = { type: "spring", stiffness: 300, damping: 26 } as const;

export default function Distribution() {
  const lang = useLang();
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
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-payout">{pick(lang, { en: "Live distribution", ru: "Живое распределение", es: "Distribución en vivo", pt: "Distribuição ao vivo", fr: "Distribution en direct", de: "Live-Verteilung", zh: "实时分配" })}</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, { en: "Payouts land the moment markets resolve", ru: "Выплаты приходят в момент расчёта рынков", es: "Los pagos llegan en cuanto se resuelven los mercados", pt: "Os pagamentos chegam no momento em que os mercados são resolvidos", fr: "Les paiements arrivent dès que les marchés se règlent", de: "Auszahlungen kommen an, sobald Märkte abgerechnet werden", zh: "市场一经结算，赔付即刻到账" })}</h2>
      </Reveal>
      <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-hairline bg-base p-4 shadow-sm">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div key={r.id} layout initial={rowInit} animate={rowAnim} exit={rowExit} transition={rowTrans} className="flex items-center justify-between border-b border-hairline px-3 py-3 last:border-0">
              <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-payout" /><span className="font-mono text-sm text-ink">{r.who}</span></div>
              <span className="font-mono text-sm font-semibold text-payout">+{r.amount} USD₮</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {rows.length === 0 && (<div className="px-3 py-6 text-center text-sm text-muted">{pick(lang, { en: "Waiting for the next resolution…", ru: "Ждём следующего расчёта…", es: "Esperando la próxima resolución…", pt: "Aguardando a próxima resolução…", fr: "En attente de la prochaine résolution…", de: "Warte auf die nächste Abrechnung…", zh: "等待下一次结算…" })}</div>)}
      </div>
    </section>
  );
}
