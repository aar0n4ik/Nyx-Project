"use client";
import { useEffect, useRef, useState } from "react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const RPC = "https://api.devnet.solana.com";
const SETTLEMENT = "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3";

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

type Live = { settlements: number };

function Stat({ value, fmt, label, run }: { value: number; fmt: (v: number) => string; label: string; run: boolean }) {
  const v = useCountUp(value, run);
  return (
    <div className="min-w-0 text-center">
      <div className="truncate font-mono text-4xl font-semibold tabular-nums md:text-5xl">{fmt(v)}</div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </div>
  );
}

export default function LiveStats() {
  const lang = useLang();
  const [run, setRun] = useState(false);
  const [live, setLive] = useState<Live>({ settlements: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setRun(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [SETTLEMENT, { limit: 1000 }] }),
        });
        const j = await res.json();
        const sigs = Array.isArray(j?.result) ? j.result.length : 0;
        if (!cancelled) setLive({ settlements: sigs });
      } catch { /* honest fallback: zeros */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const STATS: { value: number; fmt: (v: number) => string; label: Record<Lang, string> }[] = [
    { value: live.settlements, fmt: (v) => Math.round(v).toLocaleString(), label: { en: "On-chain settlement txs", ru: "Ончейн-транзакций расчёта", es: "Txs de liquidación on-chain", pt: "Txs de liquidação on-chain", fr: "Txs de règlement on-chain", de: "On-Chain-Abrechnungs-Txs", zh: "链上结算交易数" } },
    { value: 0, fmt: () => "0", label: { en: "Admin keys that can resolve", ru: "Админ-ключей для расчёта", es: "Claves admin que resuelven", pt: "Chaves admin que resolvem", fr: "Clés admin de résolution", de: "Admin-Keys zur Auflösung", zh: "可结算的管理员密钥" } },
    { value: 100, fmt: (v) => Math.round(v) + "%", label: { en: "Zero-custody by design", ru: "Zero-custody по дизайну", es: "Sin custodia por diseño", pt: "Sem custódia por design", fr: "Sans garde par conception", de: "Zero-Custody per Design", zh: "设计上零托管" } },
    { value: 100, fmt: (v) => Math.round(v) + "%", label: { en: "Outcomes with on-chain proof", ru: "Исходов с ончейн-пруфом", es: "Resultados con prueba on-chain", pt: "Resultados com prova on-chain", fr: "Résultats avec preuve on-chain", de: "Ergebnisse mit On-Chain-Beweis", zh: "带链上证明的结算" } },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {STATS.map((s, i) => (
        <Stat key={i} value={s.value} fmt={s.fmt} label={pick(lang, s.label)} run={run} />
      ))}
    </div>
  );
}
