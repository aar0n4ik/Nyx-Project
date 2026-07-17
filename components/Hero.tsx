"use client";

import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import PlaceBet from "@/components/PlaceBet";
import AuroraMesh from "@/components/AuroraMesh";

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
} as const;

const itemV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export default function Hero() {
  const { t } = useT();
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#07070C] text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0B18] via-[#07070C] to-[#05050A]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-nyx/20 blur-[120px]" />
      <AuroraMesh />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-content px-6 py-28 text-center"
      >
        <motion.div
          variants={itemV}
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-payout" />
          Live on Solana · Devnet + Mainnet
        </motion.div>

        <motion.p
          variants={itemV}
          className="mx-auto mt-8 max-w-2xl text-xs font-semibold uppercase tracking-[0.24em] text-white/50"
        >
          The prediction market the world hasn't built yet
        </motion.p>

        <motion.h1
          variants={itemV}
          className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Bets you don't have to{" "}
          <span className="bg-gradient-to-r from-nyx via-solana to-verify bg-clip-text text-transparent">
            trust
          </span>
          .
        </motion.h1>

        <motion.p
          variants={itemV}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/70"
        >
          Zero custody. No admin key. AI resolution you verify block by block.
          We're not competing with bookmakers — we're replacing the reason they
          exist. This is Nyx, and we're going global.
        </motion.p>

        <motion.div
          variants={itemV}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <PlaceBet />
          <a
            href="#verify"
            className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("cta.verify")}
          </a>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.22em] text-white/40">
        Scroll ↓
      </div>
    </section>
  );
}
