"use client";

import { motion } from "framer-motion";

const viewportOnce = { once: true, amount: 0.3 } as const;

const fadeV = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export default function Founder() {
  return (
    <section id="founder" className="bg-subtle py-24 text-ink">
      <motion.div
        variants={fadeV}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto max-w-3xl px-6 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          The person behind Nyx
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Built solo by a 17-year-old who refused the standard path
        </h2>

        <div className="mt-6 space-y-4 text-left text-base leading-relaxed text-muted">
          <p>
            I'm 17. I'm in the U.S. And I built Nyx alone — the on-chain
            settlement, the AI resolution, the dispute engine, and the site
            you're reading right now.
          </p>
          <p>
            I'm not doing this the way you're supposed to. No team handed to me,
            no path laid out, no permission asked. I'd rather build something the
            world hasn't seen than follow a track someone else drew.
          </p>
          <p>
            This isn't a hackathon weekend for me — it's the long run. Nyx is the
            start of a prediction layer anyone on Earth can trust without
            trusting anyone.
          </p>
        </div>

        <blockquote className="mt-10 border-l-2 border-solana pl-5 text-left text-xl font-medium text-ink">
          "Give me opportunities, and I'll show you the stars."
        </blockquote>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          — Aaron, founder of Nyx
        </p>
      </motion.div>
    </section>
  );
}
