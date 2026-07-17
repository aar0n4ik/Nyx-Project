"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);

const overlayV = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
} as const;

const panelV = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } },
} as const;

export default function PlaceBet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gradient-to-r from-nyx to-solana px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:opacity-90"
      >
        Try a live bet →
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            variants={overlayV}
            initial="hidden"
            animate="show"
            exit="hidden"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              variants={panelV}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0B14] p-6 text-white shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-payout" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Devnet · test USD₮
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                Place a real bet
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                You sign from your own wallet. Nyx never takes custody — your
                stake is escrowed on-chain and settled with no admin key. This is
                live on Solana devnet with test USD₮, so nothing costs real money
                yet.
              </p>

              <ol className="mt-5 space-y-2 text-sm text-white/70">
                <li>1. Open the Blink and connect a Solana wallet (devnet).</li>
                <li>2. Choose your outcome and stake.</li>
                <li>3. Sign — your bet is escrowed on-chain.</li>
              </ol>

              <a
                href={BLINK_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-nyx to-solana px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Open the Blink & sign →
              </a>

              <a
                href="/app"
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Or explore the full app
              </a>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full text-center text-xs uppercase tracking-wide text-white/40 transition hover:text-white/70"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
