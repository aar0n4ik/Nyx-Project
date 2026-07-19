"use client";

import { useEffect, useState } from "react";
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

  if (loadErr) {
    return (
      <div className="rounded-3xl border border-hairline bg-base p-6 text-sm text-muted">
        {t({ en: "Could not load the Blink.", ru: "Не удалось загрузить блинк." })}
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="animate-pulse rounded-3xl border border-hairline bg-base p-6">
        <div className="h-3 w-24 rounded bg-subtle" />
        <div className="mt-4 h-5 w-2/3 rounded bg-subtle" />
        <div className="mt-3 h-4 w-full rounded bg-subtle" />
        <div className="mt-2 h-4 w-4/5 rounded bg-subtle" />
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="h-10 rounded-xl bg-subtle" />
          <div className="h-10 rounded-xl bg-subtle" />
          <div className="h-10 rounded-xl bg-subtle" />
        </div>
      </div>
    );
  }

  const actions = meta.links?.actions ?? [];
  const quick = actions.filter((a) => !a.parameters || a.parameters.length === 0);
  const custom = actions.find((a) => a.parameters && a.parameters.length > 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-hairline bg-base p-6 shadow-2xl">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-nyx">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-solana" />
        Solana Blink · Devnet
      </div>

      <h3 className="mt-2 text-lg font-bold text-ink">{meta.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{meta.description}</p>

      {status === "done" ? (
        <div className="mt-5 rounded-xl border border-hairline bg-subtle px-4 py-3 text-sm font-semibold text-ink">
          ✓ {t({ en: "Position opened successfully", ru: "Сделка успешно открыта" })}
          {sig ? (
            <a
              href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-xs font-normal text-nyx underline"
            >
              {t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          {quick.length ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {quick.map((a) => (
                <button
                  key={a.href}
                  onClick={() => execute(a.href)}
                  disabled={busy}
                  className="rounded-xl bg-gradient-to-r from-nyx to-solana px-2 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nyx/20 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}

          {custom ? (
            <div className="mt-3 flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min={1}
                placeholder={custom.parameters?.[0]?.label || "Amount"}
                className="w-full rounded-xl border border-hairline bg-subtle px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-nyx/60 focus:ring-2 focus:ring-nyx/20"
              />
              <button
                onClick={() => { const v = Number(amount); if (!v || v <= 0) return; execute(custom.href.replace("{amount}", String(v))); }}
                disabled={busy || !amount}
                className="whitespace-nowrap rounded-xl border border-nyx bg-nyx/10 px-4 py-2.5 text-sm font-semibold text-nyx transition hover:bg-nyx/20 active:scale-95 disabled:opacity-60"
              >
                {custom.label}
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2 text-xs text-muted">
            {busy ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-nyx border-t-transparent" />
                {status === "building"
                  ? t({ en: "Building…", ru: "Собираю…" })
                  : status === "signing"
                    ? t({ en: "Sign in wallet…", ru: "Подпиши в кошельке…" })
                    : t({ en: "Confirming…", ru: "Подтверждаю…" })}
              </>
            ) : isConnected ? (
              t({ en: "Program-escrowed. No admin key can touch your stake.", ru: "Эскроу программой. Ни один админ-ключ не тронет ставку." })
            ) : (
              t({ en: "Pick an amount — you'll connect your wallet to sign.", ru: "Выбери сумму — подключишь кошелёк для подписи." })
            )}
          </div>

          {status === "error" && err ? (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{err}</div>
          ) : null}
        </>
      )}
    </div>
  );
}
