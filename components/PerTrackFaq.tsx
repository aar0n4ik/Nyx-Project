"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTrack, type TrackId } from "@/components/useTrack";

type QA = { q: string; a: string };

const TITLES: Record<TrackId, string> = {
  settlement: "Settlement — trust nothing, verify everything",
  agents: "Agents — they bet, they never hold",
  fan: "Fan — bet from any post",
};

const FAQS: Record<TrackId, QA[]> = {
  settlement: [
    { q: "How do I know a bet can't be rigged?", a: "resolve() has no admin key. The outcome is pulled from an on-chain oracle stat via CPI and validated on-chain. Anyone can re-check the settlement transaction in an explorer." },
    { q: "What if the data feed is wrong?", a: "There is a full dispute path: propose, dispute, arbitrate, slash. A malicious reporter loses their stake, and the oracle bridge PDA finalizes the corrected result back into settlement." },
    { q: "Where is my money held?", a: "Nowhere custodial. Bets use a capped, expiring allowance — funds never sit with an admin or a company wallet." },
    { q: "Is this live or a mockup?", a: "Live on Solana devnet. Every settlement, dispute and payout is a real transaction you can open in Solana Explorer." },
  ],
  agents: [
    { q: "Can an agent drain my funds?", a: "No. It runs on a capped, expiring allowance and reverts with AmountExceedsLimit past the cap. An agent can place bets, but it can never withdraw or move your balance." },
    { q: "How does the agent decide?", a: "It runs model inference, and every decision is anchored as a Proof-of-Inference receipt — an ed25519 signature written into a Solana Memo." },
    { q: "Can I stop it whenever I want?", a: "Yes. The allowance expires on its own, and you can revoke it on-chain at any moment." },
    { q: "Do I have to trust the model blindly?", a: "No — you can verify the inference digest on-chain yourself in the Verify section above." },
  ],
  fan: [
    { q: "How do I bet from a post?", a: "Through a Solana Blink. You sign the transaction straight from the post surface — no app install, no redirect maze." },
    { q: "How do creators earn?", a: "An affiliate split rides on the bet via a ref tag, capped at 5%. Payouts settle automatically on-chain — no invoicing, no manual payouts." },
    { q: "Do fans need a special app?", a: "Any Solana wallet works. The Blink builds and hands over the transaction for you to sign." },
    { q: "Is the payout automatic?", a: "Yes. When a market settles, the payout transaction fires on-chain — no claim button required." },
  ],
};

const collapsed = { height: 0, opacity: 0 } as const;
const expanded = { height: "auto", opacity: 1 } as const;
const answerTrans = { duration: 0.25, ease: "easeOut" } as const;

export default function PerTrackFaq() {
  const [trackId] = useTrack();
  const track: TrackId = trackId ?? "settlement";
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    setOpen(0);
  }, [track]);

  const items = FAQS[track];

  return (
    <section id="track-faq" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-nyx">FAQ</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {TITLES[track]}
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={track + String(i)}
                className="rounded-3xl border border-hairline bg-subtle"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-ink sm:text-base">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={
                      "h-4 w-4 shrink-0 text-muted transition-transform " +
                      (isOpen ? "rotate-180" : "")
                    }
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={collapsed}
                      animate={expanded}
                      exit={collapsed}
                      transition={answerTrans}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                        {f.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
