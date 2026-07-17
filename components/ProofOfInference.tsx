"use client";
import Reveal from "@/components/Reveal";

const DEV = "38d667dd86c40d94f74d0b214cd6bdaf6dc3926eed8657b91fdde54d71e8310c";
const MAIN = "4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8";

const CARDS = [
  { label: "Devnet digest", value: DEV, tint: "from-nyx to-verify" },
  { label: "Mainnet digest", value: MAIN, tint: "from-verify to-payout" },
];

export default function ProofOfInference() {
  return (
    <section className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-verify">Proof of inference</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">The AI can&apos;t lie about what it computed</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted">Every model run happens inside Tether QVAC and emits an ed25519-signed digest on-chain. Recompute it yourself — it matches byte-for-byte.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {CARDS.map((c, i) => {
            const badge = `mb-4 inline-block rounded-lg bg-gradient-to-r ${c.tint} px-3 py-1 text-xs font-semibold text-white`;
            return (
              <Reveal key={c.label} delay={i * 0.08}>
                <div className="rounded-2xl border border-hairline bg-white p-6">
                  <div className={badge}>{c.label}</div>
                  <div className="break-all font-mono text-sm leading-relaxed text-ink">{c.value}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
