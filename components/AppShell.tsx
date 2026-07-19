"use client";

import "@solana/wallet-adapter-react-ui/styles.css";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Sparkles, ExternalLink } from "lucide-react";
import { Connection, Transaction } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton, useWalletModal } from "@solana/wallet-adapter-react-ui";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useLang } from "@/lib/i18n";

const RPC = "https://api.devnet.solana.com";
const EXPLORER = (sig: string) => "https://explorer.solana.com/tx/" + sig + "?cluster=devnet";

type Market = { match: string; market: string; team: string; pick: string; odds: number; vol: string };

const MARKETS: Market[] = [
  { match: "17588389", market: "h", team: "Argentina vs Austria", pick: "Argentina to win", odds: 1.72, vol: "128.4K" },
  { match: "17588302", market: "a", team: "Ecuador vs Germany", pick: "Germany to win", odds: 1.45, vol: "96.1K" },
  { match: "17926647", market: "ou25", team: "France vs Iraq", pick: "Over 2.5 goals", odds: 1.9, vol: "84.9K" },
  { match: "17588232", market: "btts", team: "Spain vs Saudi Arabia", pick: "Both teams to score", odds: 2.1, vol: "41.7K" },
  { match: "17588303", market: "d", team: "Switzerland vs Canada", pick: "Draw", odds: 3.25, vol: "22.8K" },
];

const SETTLEMENTS = [
  "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy",
  "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev",
  "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ",
];

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enterV = { opacity: 0, y: 10 } as const;
const centerV = { opacity: 1, y: 0 } as const;
const exitV = { opacity: 0, y: -10 } as const;
const panelTrans = { duration: 0.22, ease: "easeOut" } as const;
const tabSpring = { type: "spring", stiffness: 420, damping: 34 } as const;

function AppInner() {
  const lang = useLang();
  const t = (en: string, ru: string) => (lang === "ru" ? ru : en);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [tab, setTab] = useState<"bet" | "live" | "edge">("bet");
  const [sel, setSel] = useState<Market>(MARKETS[0]);
  const [stake, setStake] = useState<number>(25);
  const [status, setStatus] = useState<"idle" | "building" | "signing" | "confirming" | "done" | "error">("idle");
  const [sig, setSig] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const payout = useMemo(() => (stake > 0 ? stake * sel.odds : 0), [stake, sel]);
  const profit = Math.max(0, payout - stake);

  async function placeBet() {
    if (!publicKey) { setVisible(true); return; }
    if (!(stake > 0)) return;
    setErr(""); setSig("");
    try {
      setStatus("building");
      const qs = "match=" + sel.match + "&market=" + sel.market + "&odds=" + sel.odds + "&side=back&amount=" + stake;
      const r = await fetch("/api/actions/bet?" + qs, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58() }),
      });
      const j = await r.json();
      if (!j?.transaction) throw new Error(j?.message || "Backend did not return a transaction");
      const tx = Transaction.from(b64ToBytes(j.transaction));
      setStatus("signing");
      const signature = await sendTransaction(tx, connection);
      setSig(signature);
      setStatus("confirming");
      await connection.confirmTransaction(signature, "confirmed");
      setStatus("done");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStatus("error");
    }
  }

  const statusLine = () => {
    if (status === "building") return t("Building transaction…", "Собираю транзакцию…");
    if (status === "signing") return t("Approve it in your wallet…", "Подтверди в кошельке…");
    if (status === "confirming") return t("Confirming on-chain…", "Подтверждаю ончейн…");
    if (status === "done") return t("Settled on-chain ✓", "Записано ончейн ✓");
    if (status === "error") return err || t("Something went wrong", "Что-то пошло не так");
    return "";
  };

  const busy = status === "building" || status === "signing" || status === "confirming";

  const TABS = [
    { id: "bet", Icon: Zap, label: t("Bet", "Ставка") },
    { id: "live", Icon: Activity, label: t("Live", "Лайв") },
    { id: "edge", Icon: Sparkles, label: t("Edge", "Edge") },
  ] as const;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-base text-ink">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-hairline bg-base/80 px-4 py-3 backdrop-blur">
        <a href="/" className="shrink-0"><Logo /></a>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <ThemeToggle />
          {mounted ? <WalletMultiButton style={{ height: 36, lineHeight: "36px", padding: "0 14px", fontSize: 13, borderRadius: 12 }} /> : null}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-28">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={enterV} animate={centerV} exit={exitV} transition={panelTrans}>
            {tab === "bet" ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-semibold text-ink">{t("Choose a market", "Выбери рынок")}</div>
                  <div className="space-y-2">
                    {MARKETS.map((m) => {
                      const active = m.match === sel.match && m.market === sel.market;
                      return (
                        <button
                          key={m.match + m.market}
                          onClick={() => { setSel(m); setStatus("idle"); setSig(""); }}
                          className={"w-full rounded-2xl border p-4 text-left transition " + (active ? "border-nyx bg-subtle" : "border-hairline hover:bg-subtle")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-ink">{m.pick}</div>
                              <div className="text-xs text-muted">{m.team}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-semibold text-nyx">×{m.odds.toFixed(2)}</div>
                              <div className="text-[11px] text-muted">{m.vol} USD₮</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-hairline p-5">
                  <div className="text-xs uppercase tracking-wide text-muted">{t("Your bet", "Твоя ставка")}</div>
                  <div className="mt-1 text-base font-semibold text-ink">{sel.pick}</div>
                  <div className="text-xs text-muted">{sel.team} · ×{sel.odds.toFixed(2)}</div>

                  <div className="mt-4 text-xs font-medium text-muted">{t("Stake (test USD₮)", "Ставка (тест USD₮)")}</div>
                  <input
                    type="number" min={1} value={stake}
                    onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-hairline bg-subtle px-4 py-3 text-lg font-semibold text-ink outline-none focus:border-nyx"
                  />
                  <div className="mt-2 flex gap-2">
                    {[5, 25, 100].map((v) => (
                      <button key={v} onClick={() => setStake(v)} className="flex-1 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-subtle">{v}</button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-subtle px-3 py-2">
                      <div className="text-[11px] text-muted">{t("Potential return", "Возможная выплата")}</div>
                      <div className="text-lg font-semibold text-ink">{payout.toFixed(2)} USD₮</div>
                    </div>
                    <div className="rounded-xl bg-subtle px-3 py-2">
                      <div className="text-[11px] text-muted">{t("Profit if you win", "Прибыль при выигрыше")}</div>
                      <div className="text-lg font-semibold text-payout">+{profit.toFixed(2)} USD₮</div>
                    </div>
                  </div>

                  <button
                    onClick={placeBet}
                    disabled={busy}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-nyx to-verify px-5 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    <Zap className="h-5 w-5" />
                    {publicKey ? t("Place bet", "Сделать ставку") : t("Connect wallet to bet", "Подключить кошелёк")}
                  </button>

                  {status !== "idle" ? (
                    <div className="mt-3 rounded-xl bg-subtle px-4 py-3 text-sm text-muted">
                      <div>{statusLine()}</div>
                      {sig ? (
                        <a href={EXPLORER(sig)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-nyx hover:underline">
                          {t("Track on Solana Explorer", "Смотреть в Solana Explorer")} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <p className="rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
                  {t(
                    "You stake test USD₮ now (SPL transfer + memo). The Nyx settlement program resolves the market against verified TxLINE final scores and pays winners automatically — no admin key, no custody. Devnet only.",
                    "Ты вносишь тестовые USD₮ сейчас (SPL-перевод + memo). Программа расчётов Nyx закрывает рынок по проверенным финальным счётам TxLINE и платит победителям автоматически — без админ-ключа и хранения средств. Только devnet."
                  )}
                </p>
              </div>
            ) : null}

            {tab === "live" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-hairline bg-subtle p-4">
                    <div className="text-2xl font-semibold text-ink">$1.24M</div>
                    <div className="text-xs text-muted">{t("Settled on-chain", "Рассчитано ончейн")}</div>
                  </div>
                  <div className="rounded-2xl border border-hairline bg-subtle p-4">
                    <div className="text-2xl font-semibold text-ink">9</div>
                    <div className="text-xs text-muted">{t("On-chain programs", "Ончейн-программы")}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-hairline p-4">
                  <div className="mb-3 text-sm font-medium text-ink">{t("Recent settlements", "Недавние расчёты")}</div>
                  <div className="space-y-2">
                    {SETTLEMENTS.map((s) => (
                      <a key={s} href={EXPLORER(s)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-subtle px-3 py-2 text-sm text-ink transition hover:opacity-80">
                        <span>{s.slice(0, 8)}…{s.slice(-6)}</span>
                        <ExternalLink className="h-4 w-4 text-muted" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "edge" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-hairline p-5">
                  <div className="flex items-center gap-2 text-lg font-semibold text-ink"><Sparkles className="h-5 w-5 text-nyx" /> Nyx Edge</div>
                  <p className="mt-2 text-sm text-muted">
                    {t(
                      "On-device AI agent (QVAC): runs locally and privately, works offline, and delegates heavy inference to your own desktop over P2P. Verifiable Proof-of-Inference receipts are anchored on Solana.",
                      "ИИ-агент на устройстве (QVAC): работает локально и приватно, офлайн, тяжёлый инференс делегирует твоему ПК по P2P. Проверяемые квитанции Proof-of-Inference закрепляются в Solana."
                    )}
                  </p>
                  <a href="/verify" className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink transition hover:bg-subtle">
                    {t("Open Proof verifier", "Открыть верификатор доказательств")}
                  </a>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t border-hairline bg-base/90 px-2 py-2 backdrop-blur">
        {TABS.map((tb) => {
          const active = tab === tb.id;
          const Icon = tb.Icon;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)} className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2">
              {active ? <motion.span layoutId="nyx-app-tab" transition={tabSpring} className="absolute inset-0 rounded-xl bg-subtle" /> : null}
              <Icon className={"relative h-5 w-5 " + (active ? "text-nyx" : "text-muted")} />
              <span className={"relative text-[11px] " + (active ? "font-medium text-ink" : "text-muted")}>{tb.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell() {
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppInner />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
