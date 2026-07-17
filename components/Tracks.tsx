"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";

type Track = {
  id: TrackId;
  emoji: string;
  name: string;
  tagline: string;
  blurb: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
  accent: string;
};

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);

const TRACKS: Track[] = [
  {
    id: "settlement",
    emoji: "🏁",
    name: "Prediction Markets & Settlement",
    tagline: "No admin key can decide your bet.",
    accent: "text-solana",
    blurb:
      "The core track. Nyx settles real football markets from the TxLINE live feed with no privileged key — outcomes are resolved by an oracle bridge, challenged through on-chain disputes, and paid out in USD₮.",
    points: [
      "Trustless resolve via oracle bridge",
      "On-chain disputes with staking & slashing",
      "USD₮ payouts, no admin key",
      "Built on the TxLINE live football feed",
    ],
    ctaLabel: "Watch a market settle",
    ctaHref: "#feed",
  },
  {
    id: "agents",
    emoji: "🤖",
    name: "Trading Tools & Agents",
    tagline: "An agent that bets for you — and can never touch your money.",
    accent: "text-nyx",
    blurb:
      "Give an agent a capped, expiring allowance and let it trade. It can place bets on your behalf, but the instant it tries to exceed your limit the transaction reverts. Non-custodial by construction.",
    points: [
      "Capped & expiring allowances",
      "Agent loop live on devnet",
      "Reverts on over-spend (AmountExceedsLimit)",
      "You keep your keys, always",
    ],
    ctaLabel: "See the agent on-chain",
    ctaHref: "#feed",
  },
  {
    id: "fan",
    emoji: "🎉",
    name: "Consumer & Fan Experiences",
    tagline: "Bet from any post. Creators earn automatically.",
    accent: "text-verify",
    blurb:
      "Turn any tweet or post into a bet with Solana Blinks. Fans stake in one tap, and the creators who drove them earn an automatic on-chain split — no dashboards, no manual payouts.",
    points: [
      "One-tap betting via Solana Blinks",
      "Bet straight from a post",
      "Automatic 5% creator affiliate split",
      "No custody, no middleman",
    ],
    ctaLabel: "Open a Blink",
    ctaHref: BLINK_URL,
  },
];

const fadeV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeIn" } },
} as const;

export default function Tracks() {
  const [selected, choose] = useTrack();
  const active = TRACKS.find((t) => t.id === selected) || null;

  return (
    <section id="tracks" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Built for the World Cup Hackathon
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Three tracks. One trustless engine.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Nyx enters all three tracks of the TxODDS × Solana World Cup. Pick one
          to see exactly how it fits — the core (zero custody, no admin key,
          verifiable settlement) is shared across every track. You can switch
          anytime, here or from the pill at the bottom.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => {
            const isOn = t.id === selected;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => choose(t.id)}
                className={
                  "rounded-2xl border p-5 text-left transition " +
                  (isOn
                    ? "border-solana bg-subtle"
                    : "border-hairline bg-subtle hover:border-solana/40")
                }
              >
                <div className="text-2xl">{t.emoji}</div>
                <h3 className="mt-3 text-base font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted">{t.tagline}</p>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              variants={fadeV}
              initial="hidden"
              animate="show"
              exit="exit"
              className="mt-8 rounded-3xl border border-hairline bg-subtle p-8"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{active.emoji}</span>
                <div>
                  <h3 className="text-xl font-semibold">{active.name}</h3>
                  <p className={"text-sm font-medium " + active.accent}>
                    {active.tagline}
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-base text-muted">{active.blurb}</p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {active.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-solana" />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={active.ctaHref}
                target={active.ctaHref.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-nyx to-solana px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {active.ctaLabel} →
              </a>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              variants={fadeV}
              initial="hidden"
              animate="show"
              exit="exit"
              className="mt-8 text-center text-sm text-muted"
            >
              ↑ Choose a track to see how Nyx delivers it.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
