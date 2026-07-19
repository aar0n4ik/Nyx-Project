"use client";
import { useEffect, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection, type Provider } from "@reown/appkit-adapter-solana/react";
import { useLang, pick } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

function b64ToBytes(b64: string) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

type ActionParam = { name: string; label?: string; type?: string; required?: boolean };
type ActionItem = { type?: string; label: string; href: string; parameters?: ActionParam[] };
type ActionMeta = { icon: string; title: string; label: string; description: string; links?: { actions?: ActionItem[] } };
type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";

const cardV = { hidden: { opacity: 0, y: 24, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.07, delayChildren: 0.08 } } } as const;
const itemV = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } } as const;

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

  if (loadErr) return <div className="rounded-3xl border border-hairline bg-base p-5 text-sm text-muted">{t({ en: "Could not load the Blink.", ru: "Не удалось загрузить блинк." })}</div>;
  if (!meta) return (
    <div className="overflow-hidden rounded-3xl border border-hairline bg-base shadow-2xl">
      <div className="h-28 w-full animate-pulse bg-gradient-to-br from-nyx/40 via-solana/30 to-verify/30" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-subtle" />
        <div className="h-3 w-full animate-pulse rounded bg-subtle" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-10 animate-pulse rounded-xl bg-subtle" />
          <div className="h-10 animate-pulse rounded-xl bg-subtle" />
          <div className="h-10 animate-pulse rounded-xl bg-subtle" />
        </div>
      </div>
    </div>
  );

  const actions = meta.links?.actions ?? [];
  const quick = actions.filter((a) => !a.parameters || a.parameters.length === 0);
  const custom = actions.find((a) => a.parameters && a.parameters.length > 0);

  return (
    <motion.div variants={cardV} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="group relative overflow-hidden rounded-3xl border border-hairline bg-base shadow-2xl">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-nyx via-solana to-verify">
        <motion.div aria-hidden className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl" animate={{ x: [0, 40, 0], y: [0, 20, 0], opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="absolute -right-8 -bottom-10 h-36 w-36 rounded-full bg-nyx/50 blur-2xl" animate={{ x: [0, -30, 0], y: [0, -14, 0], opacity: [0.45, 0.8, 0.45] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 blur-md" animate={{ x: ["0%", "520%"] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }} />
        <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:16px_16px]" />
        <div className="relative flex h-full items-center gap-3 px-5">
          {meta.icon ? <motion.div variants={itemV} className="h-14 w-14 flex-none rounded-2xl bg-white/10 bg-cover bg-center shadow-lg ring-2 ring-white/40" style={{ backgroundImage: "url(" + meta.icon + ")" }} /> : null}
          <div className="min-w-0">
            <motion.div variants={itemV} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Solana Blink · Devnet
            </motion.div>
            <motion.h3 variants={itemV} className="mt-1 truncate text-base font-bold text-white drop-shadow">{meta.title}</motion.h3>
          </div>
        </div>
      </div>

      <div className="p-5">
        <motion.p variants={itemV} className="text-sm leading-relaxed text-muted">{meta.description}</motion.p>

        <AnimatePresence mode="wait">
          {status === "done" ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-3 text-sm font-semibold text-green-500">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }}>✓</motion.span>
                {t({ en: "Position opened successfully", ru: "Сделка успешно открыта" })}
              </div>
              {sig ? <a href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-medium text-solana hover:underline">{t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}</a> : null}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {quick.length ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {quick.map((a) => (
                    <motion.button key={a.href} whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => execute(a.href)} disabled={busy} className="rounded-xl bg-gradient-to-r from-nyx to-solana px-2 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nyx/20 transition hover:brightness-110 disabled:opacity-60">{a.label}</motion.button>
                  ))}
                </div>
              ) : null}

              {custom ? (
                <div className="mt-3 flex gap-2">
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={1} placeholder={custom.parameters?.[0]?.label || "Amount"} className="w-full rounded-xl border border-hairline bg-subtle px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-nyx/60 focus:ring-2 focus:ring-nyx/20" />
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => { const v = Number(amount); if (!v || v <= 0) return; execute(custom.href.replace("{amount}", String(v))); }} disabled={busy || !amount} className="whitespace-nowrap rounded-xl border border-nyx bg-nyx/10 px-4 py-2.5 text-sm font-semibold text-nyx transition hover:bg-nyx/20 disabled:opacity-60">{custom.label}</motion.button>
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-muted">
                {busy ? (
                  <>
                    <motion.span className="inline-block h-3 w-3 rounded-full border-2 border-nyx border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    {status === "building" ? t({ en: "Building…", ru: "Собираю…" }) : status === "signing" ? t({ en: "Sign in wallet…", ru: "Подпиши в кошельке…" }) : t({ en: "Confirming…", ru: "Подтверждаю…" })}
                  </>
                ) : (isConnected ? t({ en: "Program-escrowed. No admin key can touch your stake.", ru: "Эскроу программой. Ни один админ-ключ не тронет ставку." }) : t({ en: "Pick an amount — you'll connect your wallet to sign.", ru: "Выбери сумму — подключишь кошелёк для подписи." }))}
              </div>
              {status === "error" && err ? <p className="mt-1 text-center text-xs text-red-500">{err}</p> : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
