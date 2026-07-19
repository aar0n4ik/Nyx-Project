"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Loc = Partial<Record<Lang, string>> & { en: string };

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const overlayInit = { opacity: 0 } as const;
const overlayAnim = { opacity: 1 } as const;
const panelInit = { opacity: 0, scale: 0.94, y: 20 } as const;
const panelAnim = { opacity: 1, scale: 1, y: 0 } as const;
const panelTrans = { type: "spring", stiffness: 260, damping: 24 } as const;

type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";

export default function BetModal({ open, onClose, match, market, odds, title }: { open: boolean; onClose: () => void; match: string; market: string; odds: number; title: string }) {
  const lang = useLang();
  const t = (o: Loc) => pick(lang, o);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [stake, setStake] = useState(10);
  const [side, setSide] = useState<"back" | "lay">("back");
  const [status, setStatus] = useState<Status>("idle");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open) { setStatus("idle"); setSig(null); setErr(null); setSide("back"); } }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const payout = (stake * odds).toFixed(2);
  const profit = (stake * odds - stake).toFixed(2);
  const busy = status === "building" || status === "signing" || status === "confirming";

  const placeBet = async () => {
    if (!publicKey) { setVisible(true); return; }
    try {
      setErr(null);
      setStatus("building");
      const url = "/api/actions/bet?match=" + encodeURIComponent(match) + "&market=" + encodeURIComponent(market) + "&odds=" + encodeURIComponent(String(odds)) + "&side=" + side + "&amount=" + encodeURIComponent(String(stake));
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account: publicKey.toBase58() }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const tx = Transaction.from(b64ToBytes(data.transaction));
      setStatus("signing");
      const signature = await sendTransaction(tx, connection);
      setSig(signature);
      setStatus("confirming");
      await connection.confirmTransaction(signature, "confirmed");
      setStatus("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  const statusLabel: Record<Status, Loc> = {
    idle: { en: "Place bet · sign", ru: "Сделать ставку · подпись" },
    building: { en: "Building transaction…", ru: "Собираю транзакцию…" },
    signing: { en: "Sign in your wallet…", ru: "Подпиши в кошельке…" },
    confirming: { en: "Confirming on-chain…", ru: "Подтверждаю в сети…" },
    done: { en: "Bet placed on-chain ✓", ru: "Ставка размещена ончейн ✓" },
    error: { en: "Try again", ru: "Повторить" },
  };

  const cta = !publicKey ? t({ en: "Place bet", ru: "Сделать ставку" }) : t(statusLabel[status]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={overlayInit} animate={overlayAnim} exit={overlayInit}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" initial={panelInit} animate={panelAnim} exit={panelInit} transition={panelTrans} className="relative z-10 w-full max-w-md rounded-2xl border border-hairline bg-base p-6 shadow-2xl">
            <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink">×</button>
            <div className="mb-1 font-mono text-xs uppercase tracking-widest text-nyx">Devnet · USD₮</div>
            <h3 className="font-display text-xl font-bold leading-snug text-ink">{title}</h3>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["back", "lay"] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)} className={"rounded-xl border px-4 py-2.5 text-sm font-semibold transition " + (side === s ? "border-nyx bg-nyx/10 text-ink" : "border-hairline bg-subtle text-muted hover:text-ink")}>
                  {s === "back" ? t({ en: "Back (YES)", ru: "За (ДА)" }) : t({ en: "Lay (NO)", ru: "Против (НЕТ)" })}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-sm"><span className="text-muted">{t({ en: "Stake", ru: "Ставка" })}</span><span className="font-mono font-semibold text-ink">{stake} USD₮</span></div>
              <input type="range" min={1} max={200} step={1} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-2 w-full accent-nyx" />
            </div>

            <div className="mt-4 rounded-xl bg-subtle p-4">
              <div className="flex justify-between text-sm"><span className="text-muted">{t({ en: "Odds", ru: "Кэф" })}</span><span className="font-mono font-semibold text-ink">{odds.toFixed(2)}×</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-muted">{t({ en: "Potential payout", ru: "Потенц. выплата" })}</span><span className="font-mono font-bold text-payout">{payout} USD₮</span></div>
              <div className="mt-1 flex justify-between text-sm"><span className="text-muted">{t({ en: "Net profit", ru: "Чистая прибыль" })}</span><span className="font-mono font-semibold text-ink">+{profit} USD₮</span></div>
            </div>

            <button onClick={placeBet} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-nyx to-solana px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110 disabled:opacity-60">
              {cta}
            </button>

            {!publicKey ? (
              <p className="mt-3 text-center text-xs text-muted">{t({ en: "No wallet? The wallet menu opens automatically.", ru: "Нет кошелька? Меню кошелька откроется само." })}</p>
            ) : null}

            {status === "done" && sig ? (
              <a href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center rounded-xl border border-hairline bg-subtle px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-nyx/40">
                {t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}
              </a>
            ) : null}

            {status === "error" && err ? (
              <p className="mt-3 break-words text-center text-xs text-red-400">{err}</p>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
