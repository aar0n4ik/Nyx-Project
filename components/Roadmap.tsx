"use client";

import { motion } from "framer-motion";

const viewportOnce = { once: true, amount: 0.3 } as const;

const listV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const;

const itemV = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
} as const;

type Phase = {
  tag: string;
  title: string;
  points: string[];
  state: "done" | "now" | "next";
};

const PHASES: Phase[] = [
  {
    tag: "Q2 2026 · Devnet",
    title: "The trustless core, live",
    state: "done",
    points: [
      "Settlement with no admin key",
      "AI resolution + on-chain dispute & slashing",
      "Zero-custody agent betting via capped allowances",
    ],
  },
  {
    tag: "Now · World Cup Hackathon",
    title: "Flagship product & real football markets",
    state: "now",
    points: [
      "TxLINE live football feed wired in",
      "Proof-of-Inference anchored on mainnet",
      "Premium site, Blinks, verifiable feed",
    ],
  },
  {
    tag: "Next · Mainnet",
    title: "Real money, real payouts",
    state: "next",
    points: [
      "USD₮ settlement on mainnet",
      "Creator & fan Blinks with automatic splits",
      "Multi-sport, mobile PWA, global access",
    ],
  },
];

const stateStyles: Record<Phase["state"], string> = {
  done: "border-payout/40 text-payout",
  now: "border-solana/50 text-solana",
  next: "border-hairline text-muted",
};

export default function Roadmap() {
  return (
    <section id="roadmap" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Roadmap
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          From a trustless core to a global prediction layer
        </h2>

        <motion.div
          variants={listV}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {PHASES.map((phase) => (
            <motion.div
              key={phase.tag}
              variants={itemV}
              className="rounded-2xl border border-hairline bg-subtle p-6"
            >
              <span
                className={
                  "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide " +
                  stateStyles[phase.state]
                }
              >
                {phase.tag}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{phase.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {phase.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-solana" />
                    {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
