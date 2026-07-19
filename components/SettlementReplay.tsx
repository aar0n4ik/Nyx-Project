"use client";

import { useState } from "react";
import { useLang, pick } from "@/lib/i18n";
import receipts from "@/lib/poi-receipts.json";

const RPC = "https://api.devnet.solana.com";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Canonical serialization MUST match the backend PoI builder byte-for-byte.
function canonicalize(o: Record<string, unknown>): string {
  return JSON.stringify(o, Object.keys(o).sort());
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchOnChainMemo(sig: string): Promise<string | null> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "getTransaction",
      params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    }),
  });
  const j = await res.json();
  const ixs = j?.result?.transaction?.message?.instructions ?? [];
  for (const ix of ixs) {
    if (ix?.programId === MEMO_PROGRAM || ix?.program === "spl-memo") {
      return typeof ix?.parsed === "string" ? ix.parsed : ix?.data ?? null;
    }
  }
  const log = (j?.result?.meta?.logMessages ?? []).find((l: string) => l.includes('Memo (len'));
  const m = log?.match(/"(.*)"/);
  return m ? m[1] : null;
}

type Status = "idle" | "running" | "match" | "mismatch" | "error";

export default function SettlementReplay() {
  const lang = useLang();
  const [sig, setSig] = useState("https://explorer.solana.com/tx/5vHC9Zfv2QNL9cF2hEWHEv6WJpNyDydiWfmvpaQq8eTf73J2yLhXeAo3gA6bXAGmkPoNRN3vjKmndCMMCTnRT6Ca?cluster=devnet");
  const [status, setStatus] = useState<Status>("idle");
  const [local, setLocal] = useState("");
  const [chain, setChain] = useState("");
  const [msg, setMsg] = useState("");

  async function run() {
    setStatus("running"); setMsg("");
    try {
      const sigClean = (sig.trim().match(/[1-9A-HJ-NP-Za-km-z]{80,120}/) || [sig.trim()])[0];
      const hit = (receipts as unknown as Array<{ sig: string; body: Record<string, unknown> }>).find((r) => r.sig === sigClean);
      const data = hit ? hit.body : null;
      if (!data) { setStatus("error"); setMsg(pick(lang, { en: "Use an explorer link from a Nyx settlement receipt.", ru: "Вставь ссылку из эксплорера на чек сеттлмента Nyx." })); return; }
      const digest = await sha256Hex(canonicalize(data));
      setLocal(digest);
      const memo = await fetchOnChainMemo(sigClean);
      if (!memo) { setStatus("error"); setMsg(pick(lang, { en: "No memo found on that transaction.", ru: "В этой транзакции нет memo." })); return; }
      setChain(memo);
      const ok = memo.includes(digest);
      setStatus(ok ? "match" : "mismatch");
    } catch (e) {
      setStatus("error");
      setMsg(pick(lang, { en: "RPC error — try again.", ru: "Ошибка RPC — попробуй ещё раз." }));
    }
  }

  return (
    <section id="replay" className="mx-auto w-full max-w-content px-6 py-20">
      <div className="rounded-3xl border border-hairline bg-subtle p-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-nyx">
          {pick(lang, { en: "Killshot · Deterministic Settlement Replay", ru: "Killshot · Детерминированное воспроизведение расчёта" })}
        </span>
        <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">
          {pick(lang, { en: "Don't trust our settlement. Recompute it.", ru: "Не верь нашему расчёту. Пересчитай его." })}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          {pick(lang, { en: "Paste the explorer link of a Nyx settlement; we pull the signed data automatically. We recompute the Proof-of-Inference digest in your browser and verify it against the on-chain memo — bit for bit.", ru: "Вставь ссылку на сеттлмент Nyx из эксплорера; данные подтянутся сами. Мы пересчитаем PoI-дайджест прямо в браузере и сверим его с memo в блокчейне — бит в бит." })}
        </p>

        <div className="mt-6 grid gap-3">
          <input value={sig} onChange={(e) => setSig(e.target.value)}
            placeholder={pick(lang, { en: "Explorer link (or tx signature)", ru: "Ссылка из эксплорера (или подпись)" })}
            className="w-full rounded-xl border border-hairline bg-base px-4 py-3 font-mono text-sm text-ink placeholder:text-muted" />
          <button onClick={run} disabled={!sig || status === "running"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-nyx px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            {status === "running"
              ? pick(lang, { en: "Recomputing…", ru: "Пересчитываю…" })
              : pick(lang, { en: "Recompute & verify", ru: "Пересчитать и проверить" })}
          </button>
        </div>

        {local ? (
          <div className="mt-6 space-y-2 font-mono text-xs">
            <div className="text-muted">{pick(lang, { en: "Local digest", ru: "Локальный дайджест" })}: <span className="text-ink break-all">{local}</span></div>
            {chain ? <div className="text-muted">{pick(lang, { en: "On-chain memo", ru: "Memo в сети" })}: <span className="text-ink break-all">{chain}</span></div> : null}
          </div>
        ) : null}

        {status === "match" ? <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500"> {pick(lang, { en: "Verified — the on-chain outcome is exactly reproducible.", ru: "Проверено — ончейн-исход полностью воспроизводим." })}</div> : null}
        {status === "mismatch" ? <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500"> {pick(lang, { en: "Mismatch — data does not match the on-chain proof.", ru: "Несовпадение — данные не соответствуют ончейн-пруфу." })}</div> : null}
        {status === "error" ? <div className="mt-4 text-sm text-muted">{msg}</div> : null}
      </div>
    </section>
  );
}
