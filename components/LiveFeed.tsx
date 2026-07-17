"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Kind =
  | "settle"
  | "payout"
  | "dispute"
  | "slash"
  | "agent"
  | "poi"
  | "affiliate"
  | "live";
type Net = "devnet" | "mainnet";

type Tx = {
  sig: string;
  label: string;
  kind: Kind;
  net: Net;
  asset?: string;
};

const SETTLEMENT_PROGRAM = "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3";
const DEVNET_RPC = "https://api.devnet.solana.com";

const kindDot: Record<Kind, string> = {
  settle: "bg-solana",
  payout: "bg-payout",
  dispute: "bg-verify",
  slash: "bg-red-500",
  agent: "bg-nyx",
  poi: "bg-verify",
  affiliate: "bg-payout",
  live: "bg-solana",
};

const SEED: Tx[] = [
  { kind: "settle", net: "devnet", asset: "USD₮", label: "Market settled — no admin key", sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v" },
  { kind: "settle", net: "devnet", label: "Trustless resolve via oracle", sig: "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev" },
  { kind: "dispute", net: "devnet", label: "Dispute resolved on-chain", sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ" },
  { kind: "slash", net: "devnet", label: "Malicious reporter slashed", sig: "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm" },
  { kind: "payout", net: "devnet", asset: "USD₮", label: "First payout to winner", sig: "2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA" },
  { kind: "payout", net: "devnet", asset: "USD₮", label: "Auto-settle payout", sig: "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy" },
  { kind: "agent", net: "devnet", label: "Agent placed a bet (capped allowance)", sig: "7JFQB78pxJ1BCNFBdpP8Hou9rUjvLncXT6P3bBPJBbiDdMaXnPxcQaNGvMLuqkL7weT51DeduzrrkPxqdoFwBME" },
  { kind: "agent", net: "devnet", label: "Agent claimed winnings", sig: "2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X" },
  { kind: "poi", net: "devnet", label: "Proof-of-Inference anchored", sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR" },
  { kind: "poi", net: "mainnet", label: "Proof-of-Inference anchored (mainnet)", sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn" },
  { kind: "affiliate", net: "devnet", asset: "USD₮", label: "Affiliate 5% split paid", sig: "29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS" },
];

const marqueeAnim = { y: ["0%", "-50%"] };
const marqueeTrans = { duration: 45, ease: "linear", repeat: Infinity } as const;

const shortSig = (s: string) => s.slice(0, 4) + "…" + s.slice(-4);
const explorerUrl = (t: Tx) =>
  "https://explorer.solana.com/tx/" +
  t.sig +
  (t.net === "devnet" ? "?cluster=devnet" : "");

export default function LiveFeed() {
  const [rows, setRows] = useState<Tx[]>(SEED);

  useEffect(() => {
    let cancelled = false;
    const fetchLive = async () => {
      try {
        const res = await fetch(DEVNET_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getSignaturesForAddress",
            params: [SETTLEMENT_PROGRAM, { limit: 8 }],
          }),
        });
        const json = await res.json();
        const sigs = json && json.result ? json.result : [];
        if (cancelled || !Array.isArray(sigs)) return;
        const live: Tx[] = sigs.map((s: any) => ({
          kind: "live",
          net: "devnet",
          asset: "USD₮",
          label: "On-chain settlement activity",
          sig: String(s.signature),
        }));
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.sig));
          const fresh = live.filter((l) => !seen.has(l.sig));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      } catch (e) {
        // RPC hiccup — keep the recorded feed
      }
    };
    fetchLive();
    const id = setInterval(fetchLive, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section id="feed" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Live transactions
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Every settlement, on the record
        </h2>
        <p className="mt-4 max-w-xl text-base text-muted">
          Real transactions from Nyx programs on Solana — recorded on-chain and
          streamed live from devnet. Click any row to verify it on the explorer.
        </p>

        <div className="relative mt-10 h-[360px] overflow-hidden rounded-2xl border border-hairline bg-subtle">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-subtle to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-subtle to-transparent" />
          <motion.div
            animate={marqueeAnim}
            transition={marqueeTrans}
            className="flex flex-col gap-2 p-4"
          >
            {[...rows, ...rows].map((t, i) => (
              <a
                key={t.sig + i}
                href={explorerUrl(t)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between gap-4 rounded-xl border border-hairline bg-base px-4 py-3 transition hover:border-solana/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={"h-2 w-2 shrink-0 rounded-full " + kindDot[t.kind]} />
                  <span className="truncate text-sm font-medium">{t.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {t.asset ? <span>{t.asset}</span> : null}
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 uppercase tracking-wide " +
                      (t.net === "mainnet"
                        ? "border-payout/40 text-payout"
                        : "border-hairline")
                    }
                  >
                    {t.net}
                  </span>
                  <span className="font-mono">{shortSig(t.sig)}</span>
                </div>
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
