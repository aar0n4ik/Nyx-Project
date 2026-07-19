"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Loc = Partial<Record<Lang, string>> & { en: string };
type M = { match: string; market: string; game: string; pick: Loc; odds: number; vol: string };

const cardInit = { opacity: 0, scale: 0.96 } as const;
const cardAnim = { opacity: 1, scale: 1 } as const;

const MARKETS: M[] = [
  { match: "17588389", market: "h", game: "Argentina vs Austria", pick: { en: "Argentina to win", ru: "Победа Аргентины" }, odds: 1.72, vol: "128.4K" },
  { match: "17588302", market: "a", game: "Ecuador vs Germany", pick: { en: "Germany to win", ru: "Победа Германии" }, odds: 1.45, vol: "96.1K" },
  { match: "17926647", market: "ou25", game: "France vs Iraq", pick: { en: "Over 2.5 goals", ru: "Тотал больше 2.5" }, odds: 1.90, vol: "84.9K" },
  { match: "17588232", market: "btts", game: "Spain vs Saudi Arabia", pick: { en: "Both teams to score", ru: "Обе забьют" }, odds: 2.10, vol: "41.7K" },
  { match: "17588303", market: "d", game: "Switzerland vs Canada", pick: { en: "Draw", ru: "Ничья" }, odds: 3.25, vol: "22.8K" },
  { match: "17588390", market: "h", game: "Belgium vs Iran", pick: { en: "Belgium to win", ru: "Победа Бельгии" }, odds: 1.55, vol: "37.2K" },
];

const EYEBROW: Loc = { en: "Live markets · World Cup", ru: "Живые рынки · ЧМ" };
const HEADING: Loc = { en: "Pick a match. Sign one transaction.", ru: "Выбери матч. Подпиши одну транзакцию." };
const SUB: Loc = { en: "Real fixtures, real on-chain bets on Solana devnet. Your stake is escrowed by the program — no admin key can touch it.", ru: "Реальные матчи, реальные ончейн-ставки на Solana devnet. Ставка эскроу-ится программой — ни один админ-ключ её не тронет." };
const VOL: Loc = { en: "Vol", ru: "Объём" };
const BET: Loc = { en: "Bet", ru: "Ставка" };

export default function Markets() {
  const lang = useLang();
  const [active, setActive] = useState<M | null>(null);
  return (
    <section id="markets" className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center font-mono text-xs uppercase tracking-widest text-nyx">{pick(lang, EYEBROW)}</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, HEADING)}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted">{pick(lang, SUB)}</p>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETS.map((m, i) => {
          const prob = Math.round(100 / m.odds);
          return (
            <motion.div key={i} initial={cardInit} whileInView={cardAnim} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.04 }} className="flex flex-col rounded-2xl border border-hairline bg-base p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-muted">{m.game}</span>
                <span className="font-mono text-xs text-muted">{pick(lang, VOL)} {m.vol}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{pick(lang, m.pick)}</h3>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-mono font-bold text-payout">{prob}%</span>
                <span className="font-mono text-muted">@ {m.odds.toFixed(2)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-gradient-to-r from-payout to-verify" style={{ width: prob + "%" }} />
              </div>
              <button onClick={() => setActive(m)} className="mt-5 w-full rounded-xl bg-gradient-to-r from-nyx to-solana px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110">
                {pick(lang, BET)} · {m.odds.toFixed(2)}×
              </button>
            </motion.div>
          );
        })}
      </div>
      <BetModal
        open={active !== null}
        onClose={() => setActive(null)}
        match={active?.match ?? ""}
        market={active?.market ?? ""}
        odds={active?.odds ?? 2}
        title={active ? active.game + " — " + pick(lang, active.pick) : ""}
      />
    </section>
  );
}
