"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Connection, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton, useWalletModal } from "@solana/wallet-adapter-react-ui";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { useLang } from "@/lib/i18n";

const txUrl = (sig: string, net?: string) =>
  "https://explorer.solana.com/tx/" + sig + (net === "mainnet" ? "" : "?cluster=devnet");
const addrUrl = (a: string) => "https://explorer.solana.com/address/" + a + "?cluster=devnet";

type Bi = { en: string; ru: string };

const Ext = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block align-[-1px]">
    <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MARKETS = [
  { match: "17588389", market: "h", game: "Argentina vs Austria", pick: { en: "Argentina to win", ru: "Победа Аргентины" }, odds: 1.72, vol: "128.4K" },
  { match: "17588302", market: "a", game: "Ecuador vs Germany", pick: { en: "Germany to win", ru: "Победа Германии" }, odds: 1.45, vol: "96.1K" },
  { match: "17926647", market: "ou25", game: "France vs Iraq", pick: { en: "Over 2.5 goals", ru: "Тотал больше 2.5" }, odds: 1.9, vol: "84.9K" },
  { match: "17588232", market: "btts", game: "Spain vs Saudi Arabia", pick: { en: "Both teams to score", ru: "Обе забьют" }, odds: 2.1, vol: "41.7K" },
  { match: "17588303", market: "d", game: "Switzerland vs Canada", pick: { en: "Draw", ru: "Ничья" }, odds: 3.25, vol: "22.8K" },
];

const PROGRAMS: Array<[string, string]> = [
  ["nyx_settlement", "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3"],
  ["nyx_dispute", "7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN"],
  ["nyx_oracle_bridge", "BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk"],
  ["nyx_verifier", "GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY"],
  ["lop", "6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83"],
  ["positions", "5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu"],
  ["nyx_pamm", "8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3"],
];

type Track = {
  id: string; emoji: string; ring: string; chip: string;
  name: Bi; tagline: Bi; blurb: Bi;
  features: Bi[]; tools: string[];
  proofs: Array<{ label: Bi; sig: string; net?: string }>;
};

const TRACKS: Track[] = [
  {
    id: "settlement", emoji: "🏁", ring: "hover:border-solana/60", chip: "text-solana",
    name: { en: "Prediction Markets & Settlement", ru: "Прогнозные рынки и расчёт" },
    tagline: { en: "No admin key can decide your bet.", ru: "Никакой админ-ключ не решает исход ставки." },
    blurb: { en: "Real football markets from the TxLINE live feed, settled with no privileged key — outcomes resolved by an oracle bridge, challenged via on-chain disputes, paid in USD₮.", ru: "Реальные футбольные рынки из живого фида TxLINE, расчёт без привилегированного ключа — исход определяет оракульный мост, оспаривается ончейн-спорами, выплата в USD₮." },
    features: [
      { en: "Trustless resolve via oracle bridge (CPI to txoracle)", ru: "Бездоверительный расчёт через оракульный мост (CPI в txoracle)" },
      { en: "On-chain disputes with staking & slashing", ru: "Ончейн-споры со стейкингом и слэшингом" },
      { en: "USD₮ payouts, no admin key", ru: "Выплаты в USD₮, без админ-ключа" },
      { en: "Built on the TxLINE live football feed", ru: "На базе живого футбольного фида TxLINE" },
    ],
    tools: ["nyx_settlement", "nyx_dispute", "nyx_oracle_bridge", "nyx_verifier", "/api/actions/bet"],
    proofs: [
      { label: { en: "Proof-gated CPI settle", ru: "Proof-gated расчёт (CPI)" }, sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v" },
      { label: { en: "Trustless resolve (bridge PDA)", ru: "Бездоверительный расчёт (PDA моста)" }, sig: "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev" },
      { label: { en: "Dispute-gated CPI resolve", ru: "Расчёт через спор (CPI)" }, sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ" },
      { label: { en: "Dispute slash (wrong side)", ru: "Слэш проигравшей стороны" }, sig: "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm" },
    ],
  },
  {
    id: "agents", emoji: "🤖", ring: "hover:border-nyx/60", chip: "text-nyx",
    name: { en: "Trading Tools & Agents", ru: "Торговые инструменты и агенты" },
    tagline: { en: "An agent that bets for you — and can never touch your money.", ru: "Агент, который ставит за тебя — и никогда не касается твоих денег." },
    blurb: { en: "Give an agent a capped, expiring on-chain allowance and let it trade. It bets on your behalf, but the instant it exceeds your limit the transaction reverts. Non-custodial by construction.", ru: "Дай агенту ограниченное разрешение с истечением — и пусть торгует. Он ставит от твоего имени, но при превышении лимита транзакция откатывается. Некастодиально по построению." },
    features: [
      { en: "Capped & expiring on-chain allowances", ru: "Ограниченные ончейн-разрешения с истечением" },
      { en: "Agent loop live on devnet (price → bet → claim)", ru: "Цикл агента в devnet (цена → ставка → клейм)" },
      { en: "Reverts on over-spend (AmountExceedsLimit)", ru: "Откат при перерасходе (AmountExceedsLimit)" },
      { en: "Recentred-LMSR pricing + half-Kelly sizing", ru: "Ценообразование recentred-LMSR + half-Kelly сайзинг" },
    ],
    tools: ["scripts/nyx-agent-loop.mjs", "pamm-math", "lop", "positions", "/api/place-order", "/api/analyze-trade"],
    proofs: [
      { label: { en: "Agent bets for user under allowance", ru: "Агент ставит за юзера по разрешению" }, sig: "7JFQB78pxJ1BCNFBdpP8Hou9rUjvLncXT6P3bBPJBbiDdMaXnPxcQaNGvMLuqkL7weT51DeduzrrkPxqdoFwBME" },
      { label: { en: "User claims agent-won payout", ru: "Юзер забирает выигрыш агента" }, sig: "2Xs7NdN21SHWG3Muq57y34nF8zGrKVYbJPrgRNrAPuva3XMpfHuoKqoXwxsuAgshK7k6H14BBtT3j3gszcLpXf9X" },
      { label: { en: "Live auto-settlement payout", ru: "Живая авто-выплата расчёта" }, sig: "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy" },
    ],
  },
  {
    id: "fan", emoji: "🎉", ring: "hover:border-verify/60", chip: "text-verify",
    name: { en: "Consumer & Fan Experiences", ru: "Потребительский и фан-опыт" },
    tagline: { en: "Bet from any post. Creators earn automatically.", ru: "Ставь из любого поста. Авторы зарабатывают автоматически." },
    blurb: { en: "Turn any tweet or post into a bet with Solana Blinks. Fans stake in one tap; the creators who drove them earn an automatic on-chain split — no dashboards, no manual payouts.", ru: "Преврати любой пост в ставку через Solana Blinks. Фанаты ставят в один тап, приведшие их авторы получают автоматическую ончейн-долю — без дашбордов и ручных выплат." },
    features: [
      { en: "One-tap betting via Solana Blinks", ru: "Ставки в один тап через Solana Blinks" },
      { en: "Bet or delegate straight from a post", ru: "Ставка или делегирование прямо из поста" },
      { en: "Automatic 5% creator affiliate split", ru: "Автоматическая 5% доля автору" },
      { en: "Offline-first multilingual PWA", ru: "Offline-first мультиязычный PWA" },
    ],
    tools: ["/api/actions/bet", "/api/actions/delegate", "actions.json", "Proof-of-Inference", "/verify"],
    proofs: [
      { label: { en: "Zero-CAC affiliate split (5% to creator)", ru: "Партнёрская доля 5% автору" }, sig: "29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS" },
      { label: { en: "On-chain Proof-of-Inference anchor", ru: "Ончейн-якорь Proof-of-Inference" }, sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR" },
      { label: { en: "PoI anchor on Solana MAINNET", ru: "PoI-якорь в Solana MAINNET" }, sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn", net: "mainnet" },
    ],
  },
];

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function AppShell() {
  const lang = useLang();
  const t = (b: Bi) => (lang === "ru" ? b.ru : b.en);
  const tt = (en: string, ru: string) => (lang === "ru" ? ru : en);

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [sel, setSel] = useState(MARKETS[0]);
  const [stake, setStake] = useState(25);
  const [status, setStatus] = useState<"idle" | "building" | "signing" | "confirming" | "done" | "error">("idle");
  const [sig, setSig] = useState("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  const payout = useMemo(() => (stake > 0 ? stake * sel.odds : 0), [stake, sel]);
  const profit = Math.max(0, payout - stake);
  const busy = status === "building" || status === "signing" || status === "confirming";

  function copy(v: string) {
    try { navigator.clipboard?.writeText(v); setCopied(v); setTimeout(() => setCopied(""), 1200); } catch {}
  }

  async function placeBet() {
    if (!publicKey) { setVisible(true); return; }
    if (!(stake > 0)) return;
    setErr(""); setSig(""); setStatus("building");
    try {
      const qs = `match=${sel.match}&market=${sel.market}&odds=${sel.odds}&side=back&amount=${stake}`;
      const r = await fetch(`/api/actions/bet?${qs}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58() }),
      });
      const j = await r.json();
      if (!j?.transaction) throw new Error(j?.message || "Backend returned no transaction");
      const tx = Transaction.from(b64ToBytes(j.transaction));
      setStatus("signing");
      const s = await sendTransaction(tx, connection);
      setSig(s); setStatus("confirming");
      await connection.confirmTransaction(s, "confirmed");
      setStatus("done");
    } catch (e: any) {
      setErr(e?.message ?? String(e)); setStatus("error");
    }
  }

  const statusText = () => {
    if (status === "building") return tt("Building transaction…", "Собираю транзакцию…");
    if (status === "signing") return tt("Approve it in your wallet…", "Подтверди в кошельке…");
    if (status === "confirming") return tt("Confirming on-chain…", "Подтверждаю ончейн…");
    if (status === "done") return tt("Settled on-chain ✓", "Записано ончейн ✓");
    if (status === "error") return err || tt("Something went wrong", "Что-то пошло не так");
    return "";
  };

  return (
    <div className="min-h-screen bg-base text-ink">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <a href="/" className="shrink-0"><Logo /></a>
            <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
              <a href="#bet" className="transition hover:text-ink">{tt("Bet", "Ставка")}</a>
              <a href="#tracks" className="transition hover:text-ink">{tt("Tracks", "Треки")}</a>
              <a href="#onchain" className="transition hover:text-ink">{tt("On-chain", "Ончейн")}</a>
              <a href="#tools" className="transition hover:text-ink">{tt("Tools", "Инструменты")}</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-hairline px-2.5 py-1 text-[11px] font-medium text-muted sm:inline">● Devnet</span>
            <LanguageSwitcher />
            <ThemeToggle />
            {mounted ? <WalletMultiButton style={{ height: 38, lineHeight: "38px", padding: "0 16px", fontSize: 13, borderRadius: 12, background: "linear-gradient(90deg,#6D4AFF,#0BB5D6)" }} /> : <span className="h-[38px] w-[132px] rounded-xl bg-subtle" />}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-nyx/25 blur-3xl animate-aurora" />
          <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-verify/20 blur-3xl animate-aurora" style={{ animationDelay: "3s" }} />
          <div className="absolute left-1/3 top-40 h-72 w-72 rounded-full bg-solana/20 blur-3xl animate-aurora" style={{ animationDelay: "6s" }} />
        </div>
        <div className="mx-auto max-w-content px-6 pb-10 pt-16 sm:pt-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">{tt("Live on Solana devnet", "Вживую на Solana devnet")}</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              {tt("Bet, delegate and verify —", "Ставь, делегируй и проверяй —")}{" "}
              <span className="bg-gradient-to-r from-nyx via-solana to-verify bg-clip-text text-transparent">{tt("with zero custody.", "с нулевым кастодиалом.")}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              {tt("One trustless engine across all three World Cup tracks. Your keys, your funds, verifiable on-chain settlement.", "Один бездоверительный движок на все три трека World Cup. Твои ключи, твои деньги, проверяемый ончейн-расчёт.")}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {mounted ? <WalletMultiButton style={{ height: 46, lineHeight: "46px", padding: "0 22px", fontSize: 15, borderRadius: 14, background: "linear-gradient(90deg,#6D4AFF,#0BB5D6)" }} /> : null}
              <a href="#bet" className="rounded-full border border-hairline px-6 py-3 text-sm font-medium text-ink transition hover:bg-subtle">{tt("Place a bet", "Сделать ставку")}</a>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
              {[["$1.24M", tt("Settled on-chain", "Рассчитано ончейн")], ["7", tt("Live programs", "Живых программ")], ["100%", tt("Non-custodial", "Некастодиально")]].map(([a, b]) => (
                <div key={b} className="rounded-2xl border border-hairline bg-subtle/60 p-4 backdrop-blur">
                  <div className="text-2xl font-semibold">{a}</div>
                  <div className="text-xs text-muted">{b}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* bet */}
      <section id="bet" className="mx-auto max-w-content px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-semibold sm:text-3xl">{tt("Place a bet", "Сделать ставку")}</h2>
          <p className="mt-2 max-w-2xl text-muted">{tt("Pick a market, size your stake, sign in your wallet. The Nyx settlement program pays winners automatically — no admin key, no custody.", "Выбери рынок, задай ставку, подпиши в кошельке. Программа расчётов Nyx платит победителям автоматически — без админ-ключа и хранения средств.")}</p>
        </Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <div className="space-y-3">
              {MARKETS.map((m) => {
                const on = m.match === sel.match && m.market === sel.market;
                return (
                  <button key={m.match + m.market} onClick={() => { setSel(m); setStatus("idle"); setSig(""); }}
                    className={"group flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition " + (on ? "border-nyx bg-subtle" : "border-hairline bg-subtle/50 hover:-translate-y-0.5 hover:border-nyx/50")}>
                    <div>
                      <div className="text-base font-medium">{t(m.pick)}</div>
                      <div className="text-xs text-muted">{m.game}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-nyx">×{m.odds.toFixed(2)}</div>
                      <div className="text-[11px] text-muted">{m.vol} USD₮</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="sticky top-24 rounded-3xl border border-hairline bg-subtle/70 p-6 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-muted">{tt("Your bet", "Твоя ставка")}</div>
              <div className="mt-1 text-lg font-semibold">{t(sel.pick)}</div>
              <div className="text-xs text-muted">{sel.game} · ×{sel.odds.toFixed(2)}</div>

              <div className="mt-5 text-xs font-medium text-muted">{tt("Stake (test USD₮)", "Ставка (тест USD₮)")}</div>
              <input type="number" min={1} value={stake} onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full rounded-xl border border-hairline bg-base px-4 py-3 text-xl font-semibold outline-none focus:border-nyx" />
              <div className="mt-2 flex gap-2">
                {[5, 25, 100].map((v) => (
                  <button key={v} onClick={() => setStake(v)} className="flex-1 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium transition hover:bg-base">{v}</button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-base px-3 py-2">
                  <div className="text-[11px] text-muted">{tt("Return", "Выплата")}</div>
                  <div className="text-lg font-semibold">{payout.toFixed(2)}</div>
                </div>
                <div className="rounded-xl bg-base px-3 py-2">
                  <div className="text-[11px] text-muted">{tt("Profit", "Прибыль")}</div>
                  <div className="text-lg font-semibold text-payout">+{profit.toFixed(2)}</div>
                </div>
              </div>

              <button onClick={placeBet} disabled={busy}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-nyx to-verify px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                {busy ? tt("Working…", "Обработка…") : publicKey ? tt("Place bet", "Сделать ставку") : tt("Connect wallet to bet", "Подключить кошелёк")}
              </button>

              {status !== "idle" ? (
                <div className="mt-3 rounded-xl bg-base px-4 py-3 text-sm text-muted">
                  <div>{statusText()}</div>
                  {sig ? <a href={txUrl(sig)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-nyx hover:underline">{tt("Track on Explorer", "Смотреть в Explorer")} <Ext /></a> : null}
                </div>
              ) : null}
            </div>
          </Reveal>
        </div>
      </section>

      {/* tracks */}
      <section id="tracks" className="mx-auto max-w-content px-6 py-16">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{tt("Built for the World Cup Hackathon", "Создано для World Cup Hackathon")}</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{tt("Three tracks. One trustless engine.", "Три трека. Один бездоверительный движок.")}</h2>
          <p className="mt-2 max-w-2xl text-muted">{tt("Every function and tool, per track — real and verifiable on-chain.", "Каждая функция и инструмент — по трекам, реально и с проверкой в сети.")}</p>
        </Reveal>
        <div className="mt-8 space-y-6">
          {TRACKS.map((tr, i) => (
            <Reveal key={tr.id} delay={i * 0.08}>
              <div className={"rounded-3xl border border-hairline bg-subtle/50 p-6 backdrop-blur transition sm:p-8 " + tr.ring}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl">{tr.emoji}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{t(tr.name)}</h3>
                    <p className={"text-sm font-medium " + tr.chip}>{t(tr.tagline)}</p>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-muted">{t(tr.blurb)}</p>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{tt("Features", "Функции")}</div>
                    <ul className="mt-3 space-y-2">
                      {tr.features.map((f) => (
                        <li key={f.en} className="flex gap-2 text-sm"><span className={tr.chip}>✦</span><span>{t(f)}</span></li>
                      ))}
                    </ul>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{tt("Tools", "Инструменты")}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tr.tools.map((tl) => (
                        <span key={tl} className="rounded-lg border border-hairline bg-base px-2.5 py-1 font-mono text-[11px] text-muted">{tl}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{tt("On-chain proof", "Ончейн-пруфы")}</div>
                    <div className="mt-3 space-y-2">
                      {tr.proofs.map((p) => (
                        <a key={p.sig} href={txUrl(p.sig, p.net)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-base px-3 py-2 text-sm transition hover:border-nyx/50">
                          <span>{t(p.label)}{p.net === "mainnet" ? <span className="ml-2 rounded bg-payout/15 px-1.5 py-0.5 text-[10px] font-semibold text-payout">MAINNET</span> : null}</span>
                          <span className="text-muted"><Ext /></span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* on-chain / backend */}
      <section id="onchain" className="mx-auto max-w-content px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-semibold sm:text-3xl">{tt("The backend, on-chain", "Бэкенд — в блокчейне")}</h2>
          <p className="mt-2 max-w-2xl text-muted">{tt("Seven Anchor programs live on Solana devnet. Tap any to open it in the Explorer.", "Семь Anchor-программ живут на Solana devnet. Нажми любую, чтобы открыть в Explorer.")}</p>
        </Reveal>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map(([name, id], i) => (
            <Reveal key={id} delay={(i % 3) * 0.06}>
              <div className="rounded-2xl border border-hairline bg-subtle/50 p-4 backdrop-blur">
                <div className="font-mono text-sm font-semibold">{name}</div>
                <div className="mt-1 truncate font-mono text-xs text-muted">{id}</div>
                <div className="mt-3 flex gap-2">
                  <a href={addrUrl(id)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-hairline px-2.5 py-1 text-xs transition hover:bg-base">Explorer <Ext /></a>
                  <button onClick={() => copy(id)} className="rounded-lg border border-hairline px-2.5 py-1 text-xs transition hover:bg-base">{copied === id ? tt("Copied", "Скопировано") : tt("Copy", "Копировать")}</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* tools */}
      <section id="tools" className="mx-auto max-w-content px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-semibold sm:text-3xl">{tt("Explore the tools", "Инструменты")}</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/verify", emoji: "🔐", title: tt("Proof verifier", "Верификатор доказательств"), desc: tt("Verify Proof-of-Inference receipts against on-chain anchors.", "Проверь квитанции Proof-of-Inference по ончейн-якорям.") },
            { href: "/sdk", emoji: "📦", title: tt("SDK showcase", "Витрина SDK"), desc: tt("Published npm & crates.io packages for settlement, allowance and oracle.", "Опубликованные пакеты npm и crates.io для расчёта, разрешений и оракула.") },
            { href: "/", emoji: "🏠", title: tt("Landing", "Лендинг"), desc: tt("Full story, live feed, roadmap and FAQ.", "Полная история, живой фид, роадмап и FAQ.") },
          ].map((c) => (
            <Reveal key={c.href}>
              <a href={c.href} className="block h-full rounded-2xl border border-hairline bg-subtle/50 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-nyx/50">
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-3 font-semibold">{c.title}</div>
                <div className="mt-1 text-sm text-muted">{c.desc}</div>
              </a>
            </Reveal>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted">{tt("Unofficial community project. Not affiliated with TxODDS. Devnet only — test funds.", "Неофициальный community-проект. Не связан с TxODDS. Только devnet — тестовые средства.")}</p>
      </section>
    </div>
  );
}
