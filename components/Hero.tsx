"use client";

import { motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";
import { useTrack } from "@/components/useTrack";
import { TRACK_META } from "@/lib/tracks";
import AuroraMesh from "@/components/AuroraMesh";

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } } } as const;
const itemV = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } } as const;

export default function Hero() {
  const lang = useLang();
  const [track] = useTrack();
  const meta = TRACK_META[track ?? "settlement"];

  return (
    <section id="top" className="relative isolate overflow-hidden bg-base">
      <AuroraMesh />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-nyx/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgb(var(--hairline))_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <motion.div variants={containerV} initial="hidden" animate="show" className="relative mx-auto w-full max-w-content px-6 py-32 text-center">
        <motion.div variants={itemV} className="mx-auto flex w-fit items-center gap-2 rounded-full border border-hairline bg-subtle px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          {pick(lang, { en: "Live on Solana Devnet · PoI on Solana Devnet", ru: "Вживую на Solana Devnet · PoI заякорен на Mainnet", es: "En vivo en Solana Devnet · PoI anclado en Mainnet", pt: "Ao vivo na Solana Devnet · PoI ancorado na Mainnet", fr: "En direct sur Solana Devnet · PoI ancré sur Mainnet", de: "Live auf Solana Devnet · PoI auf Mainnet verankert", zh: "在 Solana Devnet 上实时运行 · PoI 锚定于 Mainnet" })}
        </motion.div>

        <motion.p variants={itemV} className="mx-auto mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          {pick(lang, meta.eyebrow)}
        </motion.p>

        <motion.h1 variants={itemV} style={{ fontFamily: "var(--font-display)" }} className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-tight text-ink sm:text-6xl md:text-7xl">
          {pick(lang, meta.headA)}
          <span className="bg-gradient-to-r from-nyx via-nyx to-verify bg-clip-text text-transparent">{pick(lang, meta.accent)}</span>
          {pick(lang, meta.headB)}
        </motion.h1>

        <motion.p variants={itemV} className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted">
          {pick(lang, meta.sub)}
        </motion.p>

        <motion.div variants={itemV} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={meta.ctaHref} className="group inline-flex items-center gap-2 rounded-xl bg-nyx px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110">
            {pick(lang, meta.ctaLabel)}
            <span className="transition group-hover:translate-x-0.5">→</span>
          </a>
          <a href="#verify" className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-subtle px-6 py-3 text-sm font-semibold text-ink transition hover:border-nyx/40">
            {pick(lang, { en: "Verify on-chain", ru: "Проверить в сети", es: "Verificar on-chain", pt: "Verificar on-chain", fr: "Vérifier on-chain", de: "On-Chain prüfen", zh: "链上验证" })}
          </a>
        </motion.div>

        <motion.ul variants={itemV} className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {meta.signals.map((s, i) => (
            <li key={i} className="flex items-center gap-5">
              {i > 0 ? <span className="h-1 w-1 rounded-full bg-muted/40" /> : null}
              <span>{pick(lang, s)}</span>
            </li>
          ))}
        </motion.ul>
      </motion.div>

      <div className="pb-10 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {pick(lang, { en: "Scroll to explore ↓", ru: "Листайте вниз ↓", es: "Desliza para explorar ↓", pt: "Role para explorar ↓", fr: "Faites défiler ↓", de: "Zum Erkunden scrollen ↓", zh: "向下滚动探索 ↓" })}
      </div>
    </section>
  );
}
