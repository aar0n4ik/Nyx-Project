"use client";
import { useEffect, useRef, useState } from "react";

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

const STATS = [
  { value: 4.3, fmt: (v: number) => `$${v.toFixed(1)}M`, label: "Settled on-chain" },
  { value: 1284, fmt: (v: number) => Math.round(v).toLocaleString(), label: "Markets resolved" },
  { value: 0.4, fmt: (v: number) => `${v.toFixed(1)}s`, label: "Median settlement" },
  { value: 100, fmt: (v: number) => `${Math.round(v)}%`, label: "Zero-custody" },
];

function Stat({
  value, fmt, label, run,
}: {
  value: number;
  fmt: (v: number) => string;
  label: string;
  run: boolean;
}) {
  const v = useCountUp(value, run);
  return (
    <div className="py-10 text-center">
      <div className="font-display text-4xl font-bold text-ink md:text-5xl">{fmt(v)}</div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </div>
  );
}

export default function LiveStats() {
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
    <section ref={ref} className="border-y border-hairline bg-white">
      <div className="mx-auto grid max-w-content grid-cols-2 divide-x divide-hairline px-6 md:grid-cols-4">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} run={run} />
        ))}
      </div>
    </section>
  );
}
