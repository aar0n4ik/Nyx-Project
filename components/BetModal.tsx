"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Loc = Partial<Record<Lang, string>> & { en: string };
type Status = "idle" | "building" | "signing" | "confirming" | "done" | "error";

const overlayShow = { opacity: 1 };
const overlayHide = { opacity: 0 };
const panelInit = { opacity: 0, scale: 0.94, y: 20 };
const panelAnim = { opacity: 1, scale: 1, y: 0 };
const panelTrans = { type: "spring" as const, stiffness: 260, damping: 24 };
const crestShadow = { textShadow: "0 1px 2px rgba(0,0,0,.45)" };

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function Crest({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-nyx to-solana text-[10px] font-bold text-white ring-2 ring-white/10" style={crestShadow}>
      {code}
    </span>
  );
}

export default function BetModal({
  open, onClose, match, market, odds, title, home, away, homeCode, awayCode, pick: sel,
}: {
  open: boolean; onClose: () => void; match: string; market: string; odds: number; title: string;
  home?: string; away?: string; homeCode?: string; awayCode?: string; pick?: string;
}) {
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

  useEffect(() => { if (open) { setStatus("idle"); setSig(null); setErr(null); setSide("back"); setStake(10); } }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const impl = odds > 1 ? 1 / odds : 0.5;
  const layOdds = impl < 1 ? 1 / (1 - impl) : odds;
  const sideOdds = side === "back" ? odds : layOdds;
  const dispOdds = isFinite(sideOdds) && sideOdds > 1 ? sideOdds : odds;
  const payout = (stake * dispOdds).toFixed(2);
  const profit = (stake * dispOdds - stake).toFixed(2);
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
    done: { en: "Bet placed on-chain", ru: "Ставка размещена ончейн" },
    error: { en: "Try again", ru: "Повторить" },
  };
  const cta = !publicKey ? t({ en: "Place bet", ru: "Сделать ставку" }) : t(statusLabel[status]);
  const sideOddsLabel = (s: "back" | "lay") => (s === "back" ? odds : layOdds).toFixed(2);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={overlayHide} animate={overlayShow} exit={overlayHide}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true"
            initial={panelInit} animate={panelAnim} exit={panelInit} transition={panelTrans}
            className="relative z-10 w-full max-w-md rounded-2xl border border-hairline bg-base p-6 shadow-2xl"
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted transition hover:text-ink">×</button>

            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Devnet · USD₮</div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crest code={homeCode} />
                <span className="text-sm font-semibold text-ink">{home ?? title}</span>
              </div>
              {home && away ? <span className="font-mono text-xs text-muted">VS</span> : null}
              {away ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{away}</span>
                  <Crest code={awayCode} />
                </div>
              ) : null}
            </div>
            {sel ? <div className="mt-2 text-sm text-muted">{sel}</div> : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["back", "lay"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={"rounded-xl border px-4 py-2.5 text-sm font-semibold transition " + (side === s ? "border-nyx bg-nyx/10 text-ink" : "border-hairline bg-subtle text-muted hover:text-ink")}
                >
                  {s === "back" ? t({ en: "Back (YES)", ru: "За (ДА)" }) : t({ en: "Lay (NO)", ru: "Против (НЕТ)" })}
                  <span className="ml-1.5 font-mono text-xs opacity-70">{sideOddsLabel(s)}×</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{t({ en: "Stake", ru: "Ставка" })}</span>
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
              <div className="flex justify-between"><span className="text-muted">{t({ en: "Odds", ru: "Кэф" })}</span><span className="font-mono font-semibold text-ink">{dispOdds.toFixed(2)}×</span></div>
              <div className="flex justify-between"><span className="text-muted">{t({ en: "Potential payout", ru: "Потенц. выплата" })}</span><span className="font-mono text-ink">{payout} USD₮</span></div>
              <div className="flex justify-between"><span className="text-muted">{t({ en: "Net profit", ru: "Чистая прибыль" })}</span><span className="font-mono text-green-500">+{profit} USD₮</span></div>
            </div>

            <button onClick={placeBet} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-nyx to-solana px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110 disabled:opacity-60">
              {cta}
            </button>

            {!publicKey ? (
              <p className="mt-3 text-center text-xs text-muted">{t({ en: "No wallet? The wallet menu opens automatically.", ru: "Нет кошелька? Меню кошелька откроется само." })}</p>
            ) : null}

            {status === "done" && sig ? (
              <a href={"https://explorer.solana.com/tx/" + sig + "?cluster=devnet"} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-medium text-solana hover:underline">
                {t({ en: "View on Explorer →", ru: "Открыть в Explorer →" })}
              </a>
            ) : null}

            {status === "error" && err ? (
              <p className="mt-3 text-center text-xs text-red-500">{err}</p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
