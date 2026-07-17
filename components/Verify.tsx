"use client";
import { ExternalLink } from "lucide-react";
import Reveal from "@/components/Reveal";

type Tx = { label: string; sig: string; net: "devnet" | "mainnet-beta" };
const TXS: Tx[] = [
  { label: "Proof-gated CPI settle", sig: "65r1Whd_REPLACE_aMXfV9v", net: "devnet" },
  { label: "Dispute resolve PDA", sig: "q9yZGM_REPLACE_fwAkQ", net: "devnet" },
  { label: "Arbitrated & slashed", sig: "KDsynE_REPLACE_dB2vPFm", net: "devnet" },
  { label: "First payout", sig: "2xXK_REPLACE_soga", net: "devnet" },
  { label: "PoI devnet", sig: "4cHmiwce_REPLACE_ESdMUeR", net: "devnet" },
  { label: "PoI mainnet", sig: "2SDKgy1A_REPLACE_TaaH7Vn", net: "mainnet-beta" },
  { label: "Affiliate split", sig: "29zHMJ9A_REPLACE_MLNqRS", net: "devnet" },
];

const HOST = "explorer" + ".solana.com";
const link = (tx: Tx) => `https://${HOST}/tx/${tx.sig}?cluster=${tx.net}`;

export default function Verify() {
  return (
    <section id="verify" className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-verify">Don&apos;t trust — verify</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">Every claim links to a real transaction</h2>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TXS.map((tx, i) => (
            <Reveal key={tx.label} delay={i * 0.05}>
              <a href={link(tx)} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-xl border border-hairline bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-verify hover:shadow-lg hover:shadow-verify/10">
                <div>
                  <div className="text-sm font-semibold text-ink">{tx.label}</div>
                  <div className="font-mono text-xs text-muted">{tx.sig.slice(0, 6)}...{tx.sig.slice(-6)} · {tx.net}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted transition-colors group-hover:text-verify" />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
