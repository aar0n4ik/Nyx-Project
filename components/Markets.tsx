"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";
import { Flag, Ball, TEAMS } from "@/components/Football";
import { useMarkets, type Market, type Pick } from "@/components/useMarkets";
import BetModal from "@/components/BetModal";

const L = {
  title: { en: "Live markets", ru: "Живые маркеты" },
  sub: { en: "2026 World Cup · on-chain, program-escrowed", ru: "ЧМ-2026 · ончейн, эскроу программой" },
  vol: { en: "Vol", ru: "Объём" },
  ft: { en: "Full time", ru: "Матч окончен" },
  open: { en: "Open", ru: "Открыт" },
  home: { en: "1", ru: "П1" }, draw: { en: "X", ru: "X" }, away: { en: "2", ru: "П2" },
};

const money = (n: number) => (n >= 1000000 ? (n / 1000000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(0) + "K" : String(n));

const gridInit = { opacity: 0, y: 16 };
const gridShow = { opacity: 1, y: 0 };
const once = { once: true, margin: "-80px" };
const cardTrans = (i: number) => ({ duration: 0.4, delay: i * 0.05 });

export default function Markets() {
  const lang = useLang();
  const t = (o: { en: string }) => pick(lang, o);
  const markets = useMarkets();
  const [active, setActive] = useState<{ m: Market; pick: Pick } | null>(null);

  const kit = (a: string, b: string) => ({ background: "linear-gradient(90deg, " + a + " 50%, " + b + " 50%)" });

  const openBet = (m: Market, market: "h" | "d" | "a", odds: number, label: string) => {
    if (m.status === "finished") return;
    setActive({ m, pick: { market, odds, label } });
  };

  return (
    <section id="markets" className="relative overflow-hidden py-20">
      <div className="nyx-stadium" aria-hidden />
      <div className="relative z-10 mx-auto max-w-content px-6">
        <div className="mb-10 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Ball size={24} />
            <h2 className="text-3xl font-bold text-ink">{t(L.title)}</h2>
          </div>
          <p className="text-muted">{t(L.sub)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m, i) => {
            const hcInfo = TEAMS[m.home];
            const acInfo = TEAMS[m.away];
            const hc = hcInfo ? hcInfo.colors : ["#6d4aff", "#0bb5d6"];
            const ac = acInfo ? acInfo.colors : ["#0bb5d6", "#6d4aff"];
            const fin = m.status === "finished";
            const opts: Array<{ k: "h" | "d" | "a"; label: string; odds: number }> = [
              { k: "h", label: t(L.home), odds: m.odds.h },
              { k: "d", label: t(L.draw), odds: m.odds.d },
              { k: "a", label: t(L.away), odds: m.odds.a },
            ];
            return (
              <motion.div key={m.match} initial={gridInit} whileInView={gridShow} viewport={once} transition={cardTrans(i)} className="nyx-card-glass rounded-2xl border border-hairline p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{m.competition}</span>
                  {fin ? (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-muted">{t(L.ft)}</span>
                  ) : m.live ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500"><span className="nyx-live-dot h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>
                  ) : (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-500">{t(L.open)}</span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag name={m.home} className="!h-7 !w-10" />
                    <span className="text-sm font-semibold text-ink">{m.home}</span>
                    <span className="nyx-kit w-9" style={kit(hc[0], hc[1])} />
                  </div>
                  <div className="flex flex-col items-center px-1">
                    <span className="font-mono text-lg font-bold text-ink">{m.score || "vs"}</span>
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <Flag name={m.away} className="!h-7 !w-10" />
                    <span className="text-sm font-semibold text-ink">{m.away}</span>
                    <span className="nyx-kit w-9" style={kit(ac[0], ac[1])} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {opts.map((o) => {
                    const win = fin && m.result === o.k;
                    return (
                      <button key={o.k} onClick={() => openBet(m, o.k, o.odds, o.label)} disabled={fin} className={"nyx-odd rounded-xl border px-2 py-2 text-center " + (win ? "border-green-500 bg-green-500/10" : fin ? "border-hairline bg-subtle opacity-60" : "border-hairline bg-subtle hover:border-nyx")}>
                        <div className="text-[10px] uppercase tracking-wide text-muted">{o.label}</div>
                        <div className="font-mono text-sm font-bold text-ink">{o.odds.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 text-center text-[11px] text-muted">{t(L.vol)} {money(m.vol)} USD₮</div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <BetModal open={active !== null} onClose={() => setActive(null)} data={active} />
    </section>
  );
}
