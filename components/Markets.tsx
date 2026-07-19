"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import { useLang, pick } from "@/lib/i18n";
import { useMarkets, type Market, type Pick } from "@/components/useMarkets";
import { Flag, Ball, TEAMS } from "@/components/Football";

const cardInit = { opacity: 0, y: 18 };
const cardShow = { opacity: 1, y: 0 };
const once = { once: true };
const trans = (i: number) => ({ duration: 0.45, delay: i * 0.05 });
const kit = (a: string, b: string) => ({ background: "linear-gradient(90deg, " + a + " 50%, " + b + " 50%)" });

const EYEBROW = { en: "Live markets", ru: "Живые рынки" };
const HEADING = { en: "Pick a side. Sign one transaction.", ru: "Выбери исход. Подпиши одну транзакцию." };
const SUB = { en: "Real World Cup fixtures with full 1X2 odds. Every stake is escrowed by the program on Solana devnet — no admin key can touch it.", ru: "Реальные матчи ЧМ с полными кэфами 1X2. Каждая ставка эскроу-ится программой на Solana devnet — ни один админ-ключ её не тронет." };
const VOL = { en: "Vol", ru: "Объём" };
const HOME = { en: "1", ru: "П1" };
const DRAW = { en: "X", ru: "X" };
const AWAY = { en: "2", ru: "П2" };

export default function Markets() {
  const lang = useLang();
  const { markets } = useMarkets();
  const [active, setActive] = useState<{ m: Market; pick: Pick } | null>(null);
  const openBet = (m: Market, market: "h" | "d" | "a", odds: number, label: string) => setActive({ m, pick: { market, odds, label } });

  return (
    <section id="markets" className="relative mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          <span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
          {pick(lang, EYEBROW)}
        </span>
        <h2 className="nyx-gradient-text mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{pick(lang, HEADING)}</h2>
        <p className="mt-4 text-base leading-relaxed text-muted">{pick(lang, SUB)}</p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m, i) => {
          const hc = TEAMS[m.home]?.colors ?? ["#6d4aff", "#0bb5d6"];
          const ac = TEAMS[m.away]?.colors ?? ["#0bb5d6", "#6d4aff"];
          return (
            <motion.article key={m.match} initial={cardInit} whileInView={cardShow} viewport={once} transition={trans(i)} className="nyx-pitch group relative overflow-hidden rounded-2xl border border-hairline bg-base p-4">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted"><Ball size={14} />{m.competition}</span>
                  {m.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500"><span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />LIVE{m.minute != null ? " " + m.minute + "'" : ""}</span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase text-muted">{pick(lang, VOL)} {m.vol}</span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag name={m.home} />
                    <span className="text-xs font-semibold text-ink">{m.home}</span>
                    <span className="nyx-kit w-8" style={kit(hc[0], hc[1])} />
                  </div>
                  <div className="flex flex-col items-center px-1">
                    <span className="font-mono text-lg font-bold text-ink">{m.score ?? "vs"}</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag name={m.away} />
                    <span className="text-xs font-semibold text-ink">{m.away}</span>
                    <span className="nyx-kit w-8" style={kit(ac[0], ac[1])} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button onClick={() => openBet(m, "h", m.odds.h, pick(lang, HOME))} className="nyx-odd rounded-xl border border-hairline bg-subtle px-2 py-2 text-center hover:border-nyx">
                    <div className="text-[10px] uppercase tracking-wide text-muted">{pick(lang, HOME)}</div>
                    <div className="font-mono text-sm font-bold text-ink">{m.odds.h.toFixed(2)}</div>
                  </button>
                  <button onClick={() => openBet(m, "d", m.odds.d, pick(lang, DRAW))} className="nyx-odd rounded-xl border border-hairline bg-subtle px-2 py-2 text-center hover:border-nyx">
                    <div className="text-[10px] uppercase tracking-wide text-muted">{pick(lang, DRAW)}</div>
                    <div className="font-mono text-sm font-bold text-ink">{m.odds.d.toFixed(2)}</div>
                  </button>
                  <button onClick={() => openBet(m, "a", m.odds.a, pick(lang, AWAY))} className="nyx-odd rounded-xl border border-hairline bg-subtle px-2 py-2 text-center hover:border-nyx">
                    <div className="text-[10px] uppercase tracking-wide text-muted">{pick(lang, AWAY)}</div>
                    <div className="font-mono text-sm font-bold text-ink">{m.odds.a.toFixed(2)}</div>
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <BetModal open={!!active} onClose={() => setActive(null)} data={active} />
    </section>
  );
}
