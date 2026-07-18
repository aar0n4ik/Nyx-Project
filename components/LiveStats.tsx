"use client";
import { useEffect, useRef, useState } from "react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

function useCountUp(target: number, run: boolean, dur = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, dur]);
  return v;
}

const STATS: { value: number; fmt: (v: number) => string; label: Record<Lang, string> }[] = [
  { value: 4.3, fmt: (v) => "$" + v.toFixed(1) + "M", label: { en: "Settled on-chain", ru: "Рассчитано ончейн", es: "Liquidado on-chain", pt: "Liquidado on-chain", fr: "Réglé on-chain", de: "On-Chain abgerechnet", zh: "链上结算" } },
  { value: 1284, fmt: (v) => Math.round(v).toLocaleString(), label: { en: "Markets resolved", ru: "Рынков закрыто", es: "Mercados resueltos", pt: "Mercados resolvidos", fr: "Marchés résolus", de: "Märkte aufgelöst", zh: "已结算市场" } },
  { value: 0.4, fmt: (v) => v.toFixed(1) + "s", label: { en: "Median settlement", ru: "Медианный расчёт", es: "Liquidación media", pt: "Liquidação mediana", fr: "Règlement médian", de: "Median-Abwicklung", zh: "中位结算时间" } },
  { value: 100, fmt: (v) => Math.round(v) + "%", label: { en: "Zero-custody", ru: "Без кастодиала", es: "Sin custodia", pt: "Sem custódia", fr: "Sans garde", de: "Ohne Verwahrung", zh: "零托管" } },
];

function Stat({ value, fmt, label, run }: { value: number; fmt: (v: number) => string; label: string; run: boolean }) {
  const v = useCountUp(value, run);
  return (
    <div className="py-10 text-center">
      <div className="font-display text-4xl font-bold text-ink md:text-5xl">{fmt(v)}</div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </div>
  );
}

export default function LiveStats() {
  const lang = useLang();
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRun(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section ref={ref} className="border-y border-hairline bg-subtle">
      <div className="mx-auto grid max-w-content grid-cols-2 divide-x divide-hairline px-6 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Stat key={i} value={s.value} fmt={s.fmt} label={pick(lang, s.label)} run={run} />
        ))}
      </div>
    </section>
  );
}
