"use client";
import { useEffect, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection, type Provider } from "@reown/appkit-adapter-solana/react";
import { useLang, pick } from "@/lib/i18n";

function b64ToBytes(b64: string) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

type ActionParam = { name: string; label?: string; type?: string; required?: boolean };
type ActionItem = { type?: string; label: string; href: string; parameters?: ActionParam[] };
type ActionMeta = { icon: string; title: string; label: string; description: string; links?: { actions?: ActionItem[] } };
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
    fetch(url).then((r) => r.json()).then((j) => { if (alive) setMeta(j as ActionMeta); }).catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, [url]);

  const busy = status === "building" || status === "signing" || status === "confirming";

  async function execute(href: string) {
    if (busy) return;
    if (!isConnected || !address) { openWallet(); return; }
    if (!connection || !walletProvider) { setErr("Wallet not ready"); setStatus("error"); return; }
    try {
      setErr(null); setSig(null); setStatus("building");
      const res = await fetch(href, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: address }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j && j.message ? j.message : ("HTTP " + res.status)); }
      const d = await res.json();
      const tx = Transaction.from(b64ToBytes(d.transaction));
      setStatus("signing");
      const signature = await walletProvider.sendTransaction(tx, connection);
      setSig(signature); setStatus("confirming");
      await connection.confirmTransaction(signature, "confirmed");
      setStatus("done");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStatus("error"); }
  }

  if (loadErr) return <div className="rounded-2xl border border-hairline bg-base p-5 text-sm text-muted">{t({ en: "Could not load the Blink.", ru: "Не удалось загрузить блинк." })}</div>;
  if (!meta) return <div className="rounded-2xl border border-hairline bg-base p-8 text-center text-sm text-muted">{t({ en: "Loading Blink…", ru: "Загружаю блинк…" })}</div>;

  const actions = meta.links?.actions ?? [];
  const quick = actions.filter((a) => !a.parameters || a.parameters.length === 0);
  const custom = actions.find((a) => a.parameters && a.parameters.length > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-base shadow-2xl">
      {meta.icon ? <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: "url(" + meta.icon + ")" }} /> : null}
      <div className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nyx">Solana Blink · devnet</div>
        <h3 className="mt-2 text-lg font-bold text-ink">{meta.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{meta.description}</p>

        {status === "done" ? (
          <div>
            <p className="mt-4 w-full rounded-xl bg-green-500/10 py-3 text-center text-sm font-semibold text-green-500">{t({ en: "Position opened successfully", ru: "Сделка успешно открыта" })}</p>
            {sig ? <a href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-medium text-solana hover:underline">{t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}</a> : null}
          </div>
        ) : (
          <div>
            {quick.length ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {quick.map((a) => (
                  <button key={a.href} onClick={() => execute(a.href)} disabled={busy} className="rounded-xl bg-gradient-to-r from-nyx to-solana px-2 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">{a.label}</button>
                ))}
              </div>
            ) : null}

            {custom ? (
              <div className="mt-3 flex gap-2">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} placeholder={custom.parameters?.[0]?.label || "Amount"} className="w-full rounded-xl border border-hairline bg-subtle px-3 py-2.5 text-sm text-ink placeholder:text-muted" />
                <button onClick={() => { const v = Number(amount); if (!v || v <= 0) return; execute(custom.href.replace("{amount}", String(v))); }} disabled={busy || !amount} className="whitespace-nowrap rounded-xl border border-nyx bg-nyx/10 px-4 py-2.5 text-sm font-semibold text-nyx transition hover:bg-nyx/20 disabled:opacity-60">{custom.label}</button>
              </div>
            ) : null}

            <p className="mt-4 text-center text-[11px] text-muted">
              {busy ? (status === "building" ? t({ en: "Building…", ru: "Собираю…" }) : status === "signing" ? t({ en: "Sign in wallet…", ru: "Подпиши в кошельке…" }) : t({ en: "Confirming…", ru: "Подтверждаю…" })) : (isConnected ? t({ en: "Program-escrowed. No admin key can touch your stake.", ru: "Эскроу программой. Ни один админ-ключ не тронет ставку." }) : t({ en: "Pick an amount — you'll connect your wallet to sign.", ru: "Выбери сумму — подключишь кошелёк для подписи." }))}
            </p>
            {status === "error" && err ? <p className="mt-1 text-center text-xs text-red-500">{err}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
