"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import SocialButtons from "@/components/SocialButtons";
import HeroVideo from "@/components/HeroVideo";

export default function Hero() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0B0B14] text-white">
      <HeroVideo />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-content flex-col items-center justify-center px-6 py-32 text-center">
        <motion.div initial={ { opacity: 0, y: -10 } } animate={ { opacity: 1, y: 0 } } transition={ { duration: 0.5 } } className="mb-6 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-mono tracking-widest text-white/70 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-payout animate-blink" />
          LIVE ON SOLANA · DEVNET + MAINNET
        </motion.div>
        <motion.h1 initial={ { opacity: 0, y: 20 } } animate={ { opacity: 1, y: 0 } } transition={ { duration: 0.7 } } className="font-display text-4xl font-bold leading-[1.05] md:text-7xl">
          Bets you don&apos;t have to trust.
NLBR          
          <span className="bg-gradient-to-r from-nyx via-verify to-payout bg-clip-text text-transparent">Proven on-chain.</span>
        </motion.h1>
        <motion.p initial={ { opacity: 0, y: 20 } } animate={ { opacity: 1, y: 0 } } transition={ { duration: 0.7, delay: 0.1 } } className="mt-6 max-w-2xl text-lg text-white/70">
          Zero-custody stakes, keyless resolution, and verifiable AI inference. Every bet, every payout, every proof settles on Solana — no admin key, no custody, no trust required.
        </motion.p>
        <motion.div initial={ { opacity: 0, y: 20 } } animate={ { opacity: 1, y: 0 } } transition={ { duration: 0.7, delay: 0.2 } } className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <button onClick={() => setOpen(true)} className="relative overflow-hidden rounded-xl bg-gradient-to-r from-nyx to-verify px-8 py-3.5 font-semibold text-white">
            <span className="relative z-10">Try a bet →</span>
            <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]" />
          </button>
          <a href="#verify" className="rounded-xl border border-white/20 px-8 py-3.5 font-semibold text-white/90 backdrop-blur transition-colors hover:bg-white/10">Verify on-chain</a>
        </motion.div>
        <div className="mt-10"><SocialButtons dark /></div>
        <motion.a href="#why" initial={ { opacity: 0 } } animate={ { opacity: 1 } } transition={ { delay: 0.8 } } className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono tracking-widest text-white/40">SCROLL ↓</motion.a>
      </div>
      <BetModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
