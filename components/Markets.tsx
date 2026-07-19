"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import { useLang, pick } from "@/lib/i18n";
import { useMarkets, type Market } from "@/components/useMarkets";

const EYEBROW = { en: "Live markets · World Cup", ru: "Живые рынки · ЧМ" };
const HEADING = { en: "Pick a match. Sign one transaction.", ru: "Выбери матч. Подпиши одну транзакцию." };
const SUB = { en: "Real fixtures, real on-chain bets on Solana devnet. Your stake is escrowed by the program — no admin key can touch it. Choose YES or NO inside the ticket.", ru: "Реальные матчи, реальные ончейн-ставки на Solana devnet. Ставка эскроу-ится программой — ни один админ-ключ её не тронет. ДА или НЕТ выбираешь внутри тикета." };
const VOL = { en: "Vol", ru: "Объём" };
const BET = { en: "Bet", ru: "Ставка" };
const MARKET_L = { en: "Market", ru: "Рынок" };
const ODDS_L = { en: "Odds", ru: "Кэф" };
const IMPLIED = { en: "Implied", ru: "Вероятность" };

const TEAM: Record<string, [string, string]> = {
  Argentina: ["#75aadb", "#4f8fd0"], Austria: ["#ef3340", "#c81e2a"],
  Ecuador: ["#ffd100", "#0072ce"], Germany: ["#dd0000", "#1a1a1a"],
  France: ["#0055a4", "#ef4135"], Iraq: ["#007a3d", "#ce1126"],
  Spain: ["#aa151b", "#f1bf00"], "Saudi Arabia": ["#006c35", "#00a86b"],
  Switzerland: ["#d52b1e", "#8f1a12"], Canada: ["#ff2b2b", "#c8102e"],
  Belgium: ["#f0c419", "#ef3340"], Iran: ["#239f40", "#da0000"],
};

function Crest({ name, code }: { name: string; code: string }) {
  const [a, b] = TEAM[name] ?? ["#6d4aff", "#0bb5d6"];
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wide text-white ring-2 ring-white/10"
      style= background: "linear-gradient(135deg, " + a + ", " + b + ")", textShadow: "0 1px 2px rgba(0,0,0,.45)"NOTION_TWS[ ]NOTION_TWS
    >
      {code}
    </span>
  );
}

const cardInit = { opacity: 0, y: 16 } as const;
const cardAnim = { opacity: 1, y: 0 } as const;

export default function Markets() {
  const lang = useLang();
  const { markets } = useMarkets();
  const [active, setActive] = useState<Market | null>(null);

  return (
    <section id="markets" className="relative mx-auto max-w-content px-6 py-24 nyx-pitch">
      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            {pick(lang, EYEBROW)}
          </span>
          <h2 style= fontFamily: "var(--font-display)"  className="nyx-gradient-text mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {pick(lang, HEADING)}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{pick(lang, SUB)}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m, i) => {
            const prob = Math.min(99, Math.max(1, Math.round(100 / m.odds)));
            return (
              <motion.article
                key={m.match + m.market}
                initial={cardInit}
                whileInView={cardAnim}
                viewport= once: trueNOTION_TWS[ ]NOTION_TWS
                transition= duration: 0.4, delay: i * 0.05NOTION_TWS[ ]NOTION_TWS
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-base p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{m.competition}</span>
                  {m.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
                      <span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
                      LIVE{m.minute != null ? " " + m.minute + "'" : ""}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{pick(lang, VOL)} {m.vol}</span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-1 items-center gap-2.5">
                    <Crest name={m.home} code={m.homeCode} />
                    <span className="text-sm font-medium text-ink">{m.home}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-muted">{m.score ?? "VS"}</span>
                  <div className="flex flex-1 items-center justify-end gap-2.5 text-right">
                    <span className="text-sm font-medium text-ink">{m.away}</span>
                    <Crest name={m.away} code={m.awayCode} />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-hairline bg-subtle px-3.5 py-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{pick(lang, MARKET_L)}</div>
                    <div className="text-sm font-medium text-ink">{pick(lang, m.pick)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted">{pick(lang, ODDS_L)}</div>
                    <div className="font-mono text-lg font-bold text-ink">{m.odds.toFixed(2)}×</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>{pick(lang, IMPLIED)}</span>
                    <span className="font-mono">{prob}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                    <motion.div
                      initial= width: 0NOTION_TWS[ ]NOTION_TWS
                      whileInView= width: prob + "%"NOTION_TWS[ ]NOTION_TWS
                      viewport= once: trueNOTION_TWS[ ]NOTION_TWS
                      transition= duration: 0.8, delay: 0.15 + i * 0.05NOTION_TWS[ ]NOTION_TWS
                      className="h-full rounded-full bg-gradient-to-r from-nyx to-solana"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setActive(m)}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-nyx to-solana px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110"
                >
                  {pick(lang, BET)} · {m.odds.toFixed(2)}×
                </button>
              </motion.article>
            );
          })}
        </div>
      </div>

      <BetModal
        open={!!active}
        onClose={() => setActive(null)}
        match={active?.match ?? ""}
        market={active?.market ?? ""}
        odds={active?.odds ?? 2}
        title={active ? active.home + " vs " + active.away : ""}
        home={active?.home}
        away={active?.away}
        homeCode={active?.homeCode}
        awayCode={active?.awayCode}
        pick={active ? pick(lang, active.pick) : ""}
      />
    </section>
  );
}
