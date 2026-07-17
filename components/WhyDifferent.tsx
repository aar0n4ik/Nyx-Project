"use client";
import { ShieldCheck, KeyRound, Cpu, Coins } from "lucide-react";
import Reveal from "@/components/Reveal";

const CARDS = [
  {
    icon: ShieldCheck,
    title: "Zero custody",
    desc: "place_bet_for moves funds under a capped, expiring allowance. Your money never sits in our wallet.",
    tint: "text-nyx",
  },
  {
    icon: KeyRound,
    title: "No admin key",
    desc: "resolve() settles from on-chain oracle state. No human can flip an outcome after the fact.",
    tint: "text-verify",
  },
  {
    icon: Cpu,
    title: "Verifiable inference",
    desc: "Qwen3-4B runs in Tether QVAC; every prediction ships an ed25519 receipt on Solana Memo.",
    tint: "text-solana",
  },
  {
    icon: Coins,
    title: "Recentred LMSR",
    desc: "nyx_pamm bounds LP loss to b·ln(n). Deterministic pricing, no oracle front-running.",
    tint: "text-payout",
  },
];

export default function WhyDifferent() {
  return (
    <section id="why" className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">
          Why Nyx is different
        </div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">
          Four guarantees, all on-chain
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <div className="group h-full rounded-2xl border border-hairline bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-nyx/5">
              <div className="mb-4 inline-flex rounded-xl bg-subtle p-3">
                <c.icon className={`h-6 w-6 ${c.tint}`} />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
