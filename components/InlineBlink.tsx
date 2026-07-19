"use client";

import { useEffect, useMemo, useState } from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection, type Provider } from "@reown/appkit-adapter-solana/react";
import { useLang, pick } from "@/lib/i18n";

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function deserializeTx(b64: string): Transaction | VersionedTransaction {
  const bytes = b64ToBytes(b64);
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

type ActionParam = { name: string; label?: string; type?: string; required?: boolean };
type ActionItem = { type?: string; label: string; href: string; parameters?: ActionParam[] };
type ActionMeta = { icon?: string; title: string; label: string; description: string; links?: { actions?: ActionItem[] } };
type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";

export default function InlineBlink({ url }: { url: string }) {
  const lang = useLang();
  const t = (o: { en: string; ru: string }) => pick(lang, o);
  const { open: openWallet } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  const [meta, setMeta] = useState<ActionMeta | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const host = useMemo(() => {
    try {
      return new URL(url, typeof window !== "undefined" ? window.location.origin : "https://x").hostname;
    } catch {
      return "";
    }
  }, [url]);

  useEffect(() => {
    let alive = true;
    setMeta(null); setLoadErr(false); setStatus("idle"); setSig(null); setErr(null);
    const abs = typeof window !== "undefined" ? new URL(url, window.location.origin).href : url;
    fetch(abs)
      .then((r) => r.json())
      .then((j) => { if (alive) setMeta(j as ActionMeta); })
      .catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, [url]);

  const busy = status === "building" || status === "signing" || status === "confirming";

  async function execute(href: string) {
    if (busy) return;
    if (!isConnected || !address) { openWallet(); return; }
    if (!connection || !walletProvider) { setErr("Wallet not ready"); setStatus("error"); return; }
    try {
      setErr(null); setSig(null); setStatus("building");
      const abs = new URL(href, window.location.origin).href;
      const res = await fetch(abs, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: address }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j && j.message ? j.message : "HTTP " + res.status);
      }
      const d = await res.json();
      const tx = deserializeTx(d.transaction);
      setStatus("signing");
      const signature = await walletProvider.sendTransaction(tx as any, connection);
      setSig(signature);
      setStatus("confirming");
      await connection.confirmTransaction(signature, "confirmed");
      setStatus("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  // ---- states ----
  if (loadErr) {
    return (
      <div className="mx-auto max-w-[420px] rounded-2xl border border-white/10 bg-[#16171b] p-6 text-sm text-zinc-400">
        {t({ en: "Could not load the Blink.", ru: "Не удалось загрузить блинк." })}
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="mx-auto max-w-[420px] animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[#16171b]">
        <div className="h-40 bg-white/5" />
        <div className="space-y-3 p-4">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-5 w-2/3 rounded bg-white/10" />
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="h-9 rounded-lg bg-white/10" />
            <div className="h-9 rounded-lg bg-white/10" />
            <div className="h-9 rounded-lg bg-white/10" />
          </div>
          <div className="h-11 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  const actions = meta.links?.actions ?? [];
  const quick = actions.filter((a) => !a.parameters || a.parameters.length === 0);
  const custom = actions.find((a) => a.parameters && a.parameters.length > 0);
  const matchName = meta.title.replace(/^.*·\s*/, "").trim() || meta.title;

  return (
    <div className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#16171b] font-sans text-white shadow-2xl">
      {/* Banner (no moon) */}
      <div className="relative flex h-40 flex-col justify-end bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 p-4">
        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-zinc-200 ring-1 ring-white/10">
          ◎ Solana · Devnet
        </span>
        <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">Match</div>
        <div className="text-xl font-extrabold leading-tight text-white">{matchName}</div>
      </div>

      <div className="p-4">
        {/* Domain line (Blink signature) */}
        <div className="flex items-center gap-1 text-[12px] text-zinc-500">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-70">
            <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {host}
        </div>

        <h3 className="mt-1 text-[15px] font-bold text-white">{meta.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{meta.description}</p>

        {status === "done" ? (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
            ✓ {t({ en: "Position opened successfully", ru: "Сделка успешно открыта" })}
            {sig ? (
              <a
                href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-xs font-normal text-emerald-200 underline"
              >
                {t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}
              </a>
            ) : null}
          </div>
        ) : (
          <>
            {quick.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {quick.map((a) => (
                  <button
                    key={a.href}
                    onClick={() => execute(a.href)}
                    disabled={busy}
                    className="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10 active:scale-95 disabled:opacity-50"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}

            {custom ? (
              <div className="mt-3 flex overflow-hidden rounded-full border border-white/15 bg-white/5 focus-within:border-white/30">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min={1}
                  placeholder={custom.parameters?.[0]?.label || "Amount"}
                  className="w-full bg-transparent px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-zinc-500"
                />
                <button
                  onClick={() => { const v = Number(amount); if (!v || v <= 0) return; execute(custom.href.replace("{amount}", String(v))); }}
                  disabled={busy || !amount}
                  className="m-1 whitespace-nowrap rounded-full bg-white px-5 text-[13px] font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                >
                  {isConnected ? custom.label : t({ en: "Connect", ru: "Подключить" })}
                </button>
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
              {busy ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {status === "building"
                    ? t({ en: "Building transaction…", ru: "Собираю транзакцию…" })
                    : status === "signing"
                      ? t({ en: "Sign in your wallet…", ru: "Подпиши в кошельке…" })
                      : t({ en: "Confirming on-chain…", ru: "Подтверждаю ончейн…" })}
                </>
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t({ en: "Program-escrowed · no admin key can touch your stake", ru: "Эскроу программой · ни один админ-ключ не тронет ставку" })}
                </>
              )}
            </div>

            {status === "error" && err ? (
              <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
