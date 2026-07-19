"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Transaction } from "@solana/web3.js";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection, type Provider } from "@reown/appkit-adapter-solana/react";
import { useLang, pick } from "@/lib/i18n";
import { Flag, Ball, TEAMS } from "@/components/Football";
import type { Market, Pick } from "@/components/useMarkets";

type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";
type Data = { m: Market; pick: Pick } | null;

const overlayHide = { opacity: 0 };
const overlayShow = { opacity: 1 };
const panelInit = { opacity: 0, scale: 0.94, y: 24 };
const panelShow = { opacity: 1, scale: 1, y: 0 };
const panelTrans = { type: "spring" as const, stiffness: 260, damping: 24 };

function b64ToBytes(b64: string) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

const L = {
  home: { en: "Home", ru: "П1" }, draw: { en: "Draw", ru: "Ничья" }, away: { en: "Away", ru: "П2" },
  stake: { en: "Stake", ru: "Ставка" }, odds: { en: "Odds", ru: "Кэф" },
  payout: { en: "Potential payout", ru: "Потенц. выплата" }, profit: { en: "Net profit", ru: "Чистая прибыль" },
  place: { en: "Place bet · sign", ru: "Сделать ставку · подпись" },
  connect: { en: "Connect wallet", ru: "Подключить кошелёк" },
  building: { en: "Building…", ru: "Собираю…" }, signing: { en: "Sign in wallet…", ru: "Подпиши в кошельке…" },
  confirming: { en: "Confirming…", ru: "Подтверждаю…" }, done: { en: "Bet placed on-chain", ru: "Ставка размещена ончейн" },
  retry: { en: "Try again", ru: "Повторить" }, explorer: { en: "View on Explorer →", ru: "Открыть в Explorer →" },
  hint: { en: "Program-escrowed. No admin key can touch your stake.", ru: "Эскроу программой. Ни один админ-ключ не тронет ставку." },
};

export default function BetModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: Data }) {
  const lang = useLang();
  const t = (o: { en: string }) => pick(lang, o);
  const { open: openWallet } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const [stake, setStake] = useState(10);
  const [sel, setSel] = useState<Pick | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open && data) { setSel(data.pick); setStatus("idle"); setSig(null); setErr(null); setStake(10); } }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const m = data?.m;
  const active = sel ?? data?.pick ?? null;
  const odds = active?.odds ?? 2;
  const payout = (stake * odds).toFixed(2);
  const profit = (stake * odds - stake).toFixed(2);
  const busy = status === "building" || status === "signing" || status === "confirming";

  const options: Pick[] = m ? [
    { market: "h", odds: m.odds.h, label: t(L.home) },
    { market: "d", odds: m.odds.d, label: t(L.draw) },
    { market: "a", odds: m.odds.a, label: t(L.away) },
  ] : [];

  const placeBet = async () => {
    if (!m || !active) return;
    if (!isConnected || !address) { openWallet(); return; }
    if (!connection || !walletProvider) { setErr("Wallet not ready"); setStatus("error"); return; }
    try {
      setErr(null); setStatus("building");
      const url = "/api/actions/bet?match=" + encodeURIComponent(m.match) + "&market=" + active.market + "&odds=" + encodeURIComponent(String(active.odds)) + "&side=back&amount=" + encodeURIComponent(String(stake));
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: address }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d = await res.json();
      const tx = Transaction.from(b64ToBytes(d.transaction));
      setStatus("signing");
      const signature = await walletProvider.sendTransaction(tx, connection);
      setSig(signature); setStatus("confirming");
      await connection.confirmTransaction(signature, "confirmed");
      setStatus("done");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStatus("error"); }
  };

  const cta = !isConnected ? t(L.connect)
    : status === "idle" ? t(L.place)
    : status === "building" ? t(L.building)
    : status === "signing" ? t(L.signing)
    : status === "confirming" ? t(L.confirming)
    : status === "done" ? t(L.done)
    : t(L.retry);

  const hc = m ? (TEAMS[m.home]?.colors ?? ["#6d4aff", "#0bb5d6"]) : ["#6d4aff", "#0bb5d6"];
  const ac = m ? (TEAMS[m.away]?.colors ?? ["#0bb5d6", "#6d4aff"]) : ["#0bb5d6", "#6d4aff"];
  const kit = (a: string, b: string) => ({ background: "linear-gradient(90deg, " + a + " 50%, " + b + " 50%)" });

  return (
    <AnimatePresence>
      {open && m ? (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" initial={overlayHide} animate={overlayShow} exit={overlayHide}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" initial={panelInit} animate={panelShow} exit={panelInit} transition={panelTrans} className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-base shadow-2xl">
            <div className="nyx-pitch relative px-6 pb-5 pt-6">
              <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 text-muted transition hover:text-ink">×</button>
              <div className="relative z-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted"><Ball size={14} />{m.competition}</div>
              <div className="relative z-10 mt-4 flex items-center justify-between gap-3">
                <div className="flex flex-1 flex-col items-center gap-2 text-center">
                  <Flag name={m.home} className="!h-8 !w-11" />
                  <span className="text-sm font-semibold text-ink">{m.home}</span>
                  <span className="nyx-kit w-10" style={kit(hc[0], hc[1])} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-2xl font-bold text-ink">{m.score ?? "vs"}</span>
                  {m.live ? <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500"><span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />LIVE{m.minute != null ? " " + m.minute + "'" : ""}</span> : null}
                </div>
                <div className="flex flex-1 flex-col items-center gap-2 text-center">
                  <Flag name={m.away} className="!h-8 !w-11" />
                  <span className="text-sm font-semibold text-ink">{m.away}</span>
                  <span className="nyx-kit w-10" style={kit(ac[0], ac[1])} />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-2">
                {options.map((o) => {
                  const on = active?.market === o.market;
                  return (
                    <button key={o.market} onClick={() => setSel(o)} className={"nyx-odd rounded-xl border px-2 py-2.5 text-center " + (on ? "border-nyx bg-nyx/10" : "border-hairline bg-subtle hover:border-nyx")}>
                      <div className="text-[10px] uppercase tracking-wide text-muted">{o.label}</div>
                      <div className="font-mono text-sm font-bold text-ink">{o.odds.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t(L.stake)}</span>
                  <span className="font-mono font-semibold text-ink">{stake} USD₮</span>
                </div>
                <input type="range" min={1} max={500} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-2 w-full accent-nyx" />
                <div className="mt-2 flex gap-2">
                  {[5, 25, 100].map((v) => (
                    <button key={v} onClick={() => setStake(v)} className="flex-1 rounded-lg border border-hairline bg-subtle py-1.5 text-xs font-medium text-muted transition hover:text-ink">{v}</button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-2 rounded-xl border border-hairline bg-subtle p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted">{t(L.odds)}</span><span className="font-mono font-semibold text-ink">{odds.toFixed(2)}×</span></div>
                <div className="flex justify-between"><span className="text-muted">{t(L.payout)}</span><span className="font-mono text-ink">{payout} USD₮</span></div>
                <div className="flex justify-between"><span className="text-muted">{t(L.profit)}</span><span className="font-mono text-green-500">+{profit} USD₮</span></div>
              </div>

              <button onClick={placeBet} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-nyx to-solana px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110 disabled:opacity-60">{cta}</button>

              {status === "done" && sig ? (
                <a href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-medium text-solana hover:underline">{t(L.explorer)}</a>
              ) : (
                <p className="mt-3 text-center text-[11px] text-muted">{t(L.hint)}</p>
              )}
              {status === "error" && err ? <p className="mt-2 text-center text-xs text-red-500">{err}</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
