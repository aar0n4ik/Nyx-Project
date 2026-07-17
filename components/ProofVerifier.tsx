"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

type Cluster = "devnet" | "mainnet";

const RPC: Record<Cluster, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

type Receipt = {
  label: string;
  kind: string;
  sig: string;
  cluster: Cluster;
  digest?: string;
};

const RECEIPTS: Receipt[] = [
  {
    label: "Proof-of-Inference · devnet anchor",
    kind: "PoI",
    cluster: "devnet",
    sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR",
    digest: "38d667dd86c40d94f74d0b214cd6bdaf6dc3926eed8657b91fdde54d71e8310c",
  },
  {
    label: "Proof-of-Inference · mainnet anchor",
    kind: "PoI",
    cluster: "mainnet",
    sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn",
    digest: "4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8",
  },
  {
    label: "Trustless settlement",
    kind: "Settle",
    cluster: "devnet",
    sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v",
  },
  {
    label: "Dispute resolved on-chain",
    kind: "Dispute",
    cluster: "devnet",
    sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ",
  },
];

type VerifyResult = {
  ok: boolean;
  found: boolean;
  err?: string;
  slot?: number;
  blockTime?: number | null;
  feeSol?: number;
  computeUnits?: number | null;
  memo?: string;
  digestMatch?: boolean | null;
  ms: number;
  endpoint: string;
};

const spin = { repeat: Infinity, duration: 0.9, ease: "linear" } as const;
const spinAnim = { rotate: 360 } as const;
const reveal = { duration: 0.28, ease: "easeOut" } as const;
const hiddenV = { opacity: 0, y: 10 } as const;
const shownV = { opacity: 1, y: 0 } as const;

function shorten(s: string) {
  if (s.length <= 16) return s;
  return s.slice(0, 8) + "…" + s.slice(-8);
}

function extractMemo(tx: unknown): string | undefined {
  const t = tx as {
    transaction?: { message?: { instructions?: unknown[] } };
    meta?: { logMessages?: string[] };
  };
  const instrs = t.transaction?.message?.instructions || [];
  for (const raw of instrs) {
    const ix = raw as { program?: string; programId?: string; parsed?: unknown };
    if (ix.program === "spl-memo" && typeof ix.parsed === "string") {
      return ix.parsed;
    }
    if (
      typeof ix.parsed === "string" &&
      typeof ix.programId === "string" &&
      ix.programId.indexOf("Memo") === 0
    ) {
      return ix.parsed;
    }
  }
  return undefined;
}

async function runVerify(r: {
  sig: string;
  cluster: Cluster;
  digest?: string;
}): Promise<VerifyResult> {
  const endpoint = RPC[r.cluster];
  const t0 = performance.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [
        r.sig,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    result?: {
      slot?: number;
      blockTime?: number | null;
      meta?: {
        fee?: number;
        err?: unknown;
        computeUnitsConsumed?: number | null;
      };
    };
  };
  const ms = Math.round(performance.now() - t0);

  if (json.error) {
    return { ok: false, found: false, err: json.error.message || "RPC error", ms, endpoint };
  }
  const tx = json.result;
  if (!tx) {
    return {
      ok: false,
      found: false,
      err: "Transaction not found on " + r.cluster,
      ms,
      endpoint,
    };
  }
  const memo = extractMemo(tx);
  const feeLamports = tx.meta?.fee ?? 0;
  const digestMatch = r.digest
    ? memo
      ? memo.indexOf(r.digest) >= 0
      : false
    : null;

  return {
    ok: tx.meta?.err == null,
    found: true,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    feeSol: feeLamports / 1e9,
    computeUnits: tx.meta?.computeUnitsConsumed ?? null,
    memo,
    digestMatch,
    ms,
    endpoint,
  };
}

export default function ProofVerifier() {
  const [selected, setSelected] = useState<Receipt>(RECEIPTS[0]);
  const [custom, setCustom] = useState("");
  const [cluster, setCluster] = useState<Cluster>("devnet");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSig = custom.trim() || selected.sig;
  const activeCluster = custom.trim() ? cluster : selected.cluster;
  const activeDigest = custom.trim() ? undefined : selected.digest;

  const verify = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await runVerify({
        sig: activeSig,
        cluster: activeCluster,
        digest: activeDigest,
      });
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        found: false,
        err: (e as Error).message || "Network error",
        ms: 0,
        endpoint: RPC[activeCluster],
      });
    } finally {
      setLoading(false);
    }
  };

  const copySig = async () => {
    try {
      await navigator.clipboard.writeText(activeSig);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      // clipboard blocked — ignore
    }
  };

  return (
    <section id="proof" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-verify" />
          Verify, don&apos;t trust
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Check the chain yourself
        </h2>
        <p className="mt-3 text-muted">
          This runs entirely in your browser. It calls a public Solana RPC live,
          pulls the transaction, and cross-checks the Proof-of-Inference digest
          anchored on-chain. No backend of ours in the loop.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {RECEIPTS.map((r) => {
            const active = !custom.trim() && selected.sig === r.sig;
            return (
              <button
                key={r.sig}
                onClick={() => {
                  setSelected(r);
                  setCustom("");
                  setResult(null);
                }}
                className={
                  "rounded-full border px-3 py-1.5 text-xs transition " +
                  (active
                    ? "border-nyx bg-nyx text-white"
                    : "border-hairline text-muted hover:text-ink")
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="…or paste any Solana signature"
            className="flex-1 rounded-xl border border-hairline bg-base px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-nyx"
          />
          {custom.trim() ? (
            <select
              value={cluster}
              onChange={(e) => setCluster(e.target.value as Cluster)}
              className="rounded-xl border border-hairline bg-base px-3 py-2.5 text-sm text-ink outline-none"
            >
              <option value="devnet">devnet</option>
              <option value="mainnet">mainnet</option>
            </select>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-base px-3 py-2 font-mono text-xs text-muted">
          <span className="truncate">{shorten(activeSig)}</span>
          <button onClick={copySig} className="ml-2 shrink-0 text-muted hover:text-ink">
            {copied ? <Check className="h-4 w-4 text-payout" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <button
          onClick={verify}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-nyx px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <motion.span animate={spinAnim} transition={spin}>
              <Loader2 className="h-5 w-5" />
            </motion.span>
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
          {loading ? "Querying Solana…" : "Verify on-chain"}
        </button>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={activeSig + String(result.ms)}
              initial={hiddenV}
              animate={shownV}
              exit={hiddenV}
              transition={reveal}
              className="mt-5"
            >
              {result.found ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl bg-base px-4 py-3">
                    {result.ok ? (
                      <ShieldCheck className="h-5 w-5 text-payout" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-ink">
                      {result.ok ? "Confirmed on-chain" : "Found, but tx reverted"}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted">
                      {result.ms}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">Slot</div>
                      <div className="font-mono text-ink">{result.slot}</div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">Fee</div>
                      <div className="font-mono text-ink">{result.feeSol} SOL</div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">Compute units</div>
                      <div className="font-mono text-ink">
                        {result.computeUnits ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="text-xs text-muted">Block time</div>
                      <div className="font-mono text-ink">
                        {result.blockTime
                          ? new Date(result.blockTime * 1000)
                              .toISOString()
                              .slice(0, 19)
                              .replace("T", " ")
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {result.digestMatch != null ? (
                    <div
                      className={
                        "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium " +
                        (result.digestMatch
                          ? "bg-payout/10 text-payout"
                          : "bg-amber-500/10 text-amber-600")
                      }
                    >
                      {result.digestMatch ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {result.digestMatch
                        ? "Anchored inference digest matches the receipt"
                        : "Digest not found in this tx memo"}
                    </div>
                  ) : null}

                  {result.memo ? (
                    <div className="rounded-xl bg-base px-3 py-2">
                      <div className="mb-1 text-xs text-muted">On-chain memo</div>
                      <div className="break-all font-mono text-xs text-ink">
                        {result.memo}
                      </div>
                    </div>
                  ) : null}

                  <a
                    href={
                      "https://explorer.solana.com/tx/" +
                      activeSig +
                      (activeCluster === "devnet" ? "?cluster=devnet" : "")
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-sm text-verify hover:underline"
                  >
                    Open in Solana Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-base px-4 py-3 text-sm text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  {result.err}
                </div>
              )}

              <div className="mt-3 text-center font-mono text-[11px] text-muted">
                {result.endpoint}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
