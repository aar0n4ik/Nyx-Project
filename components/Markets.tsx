"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BetModal from "@/components/BetModal";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type Market = { q: Record<Lang, string>; cat: string; prob: number; vol: string; days: number };

const cardInit = { opacity: 0, scale: 0.96 } as const;
const cardAnim = { opacity: 1, scale: 1 } as const;
const cardExit = { opacity: 0, scale: 0.96 } as const;
const widthStyle = (p: number) => ({ width: p + "%" });

const MARKETS: Market[] = [
  { cat: "Crypto", prob: 62, vol: "$1.2M", days: 12, q: { en: "Will BTC close above $80k this month?", ru: "BTC закроется выше $80k в этом месяце?", es: "¿BTC cerrará por encima de $80k este mes?", pt: "O BTC fechará acima de $80k neste mês?", fr: "Le BTC clôturera-t-il au-dessus de 80k$ ce mois-ci ?", de: "Schließt BTC diesen Monat über 80k$?", zh: "本月 BTC 会收于 $80k 以上吗？" } },
  { cat: "Crypto", prob: 38, vol: "$740k", days: 34, q: { en: "ETH flips $5k before Q4?", ru: "ETH превысит $5k до Q4?", es: "¿ETH supera $5k antes del Q4?", pt: "O ETH passa de $5k antes do Q4?", fr: "L'ETH dépasse-t-il 5k$ avant le Q4 ?", de: "Knackt ETH vor Q4 die 5k$?", zh: "ETH 会在 Q4 前突破 $5k 吗？" } },
  { cat: "Macro", prob: 71, vol: "$980k", days: 21, q: { en: "Will the Fed cut rates in September?", ru: "ФРС снизит ставку в сентябре?", es: "¿La Fed bajará tipos en septiembre?", pt: "O Fed cortará juros em setembro?", fr: "La Fed baissera-t-elle ses taux en septembre ?", de: "Senkt die Fed im September die Zinsen?", zh: "美联储会在九月降息吗？" } },
  { cat: "Crypto", prob: 55, vol: "$610k", days: 5, q: { en: "Solana daily TXs above 100M this week?", ru: "Дневные транзакции Solana выше 100M на этой неделе?", es: "¿Las TX diarias de Solana superan 100M esta semana?", pt: "As TXs diárias da Solana passam de 100M esta semana?", fr: "Les TX quotidiennes de Solana dépassent-elles 100M cette semaine ?", de: "Solana-Tages-TX über 100M diese Woche?", zh: "本周 Solana 日交易量会超过 1 亿吗？" } },
  { cat: "AI", prob: 44, vol: "$430k", days: 88, q: { en: "Top lab ships a GPT-5-class model in 2026?", ru: "Топ-лаборатория выпустит модель класса GPT-5 в 2026?", es: "¿Un laboratorio top lanzará un modelo tipo GPT-5 en 2026?", pt: "Um laboratório top lançará um modelo classe GPT-5 em 2026?", fr: "Un labo de pointe sortira-t-il un modèle de classe GPT-5 en 2026 ?", de: "Bringt ein Top-Labor 2026 ein Modell der GPT-5-Klasse?", zh: "顶级实验室会在 2026 年发布 GPT-5 级模型吗？" } },
  { cat: "Sports", prob: 58, vol: "$220k", days: 3, q: { en: "Will the home team win the finals?", ru: "Хозяева выиграют финал?", es: "¿El equipo local ganará la final?", pt: "O time da casa vencerá a final?", fr: "L'équipe à domicile gagnera-t-elle la finale ?", de: "Gewinnt die Heimmannschaft das Finale?", zh: "主队会赢得决赛吗？" } },
];

const CATS = ["All", "Crypto", "Macro", "AI", "Sports"];
const CAT_LABELS: Record<string, Record<Lang, string>> = {
  All: { en: "All", ru: "Все", es: "Todos", pt: "Todos", fr: "Tous", de: "Alle", zh: "全部" },
  Crypto: { en: "Crypto", ru: "Крипто", es: "Cripto", pt: "Cripto", fr: "Crypto", de: "Krypto", zh: "加密" },
  Macro: { en: "Macro", ru: "Макро", es: "Macro", pt: "Macro", fr: "Macro", de: "Makro", zh: "宏观" },
  AI: { en: "AI", ru: "ИИ", es: "IA", pt: "IA", fr: "IA", de: "KI", zh: "AI" },
  Sports: { en: "Sports", ru: "Спорт", es: "Deportes", pt: "Esportes", fr: "Sport", de: "Sport", zh: "体育" },
};

const EYEBROW = { en: "Live markets", ru: "Живые рынки", es: "Mercados en vivo", pt: "Mercados ao vivo", fr: "Marchés en direct", de: "Live-Märkte", zh: "实时市场" };
const HEADING = { en: "Trade any outcome, custody nothing", ru: "Торгуй любой исход — без кастодиала", es: "Opera cualquier resultado, sin custodia", pt: "Negocie qualquer resultado, sem custódia", fr: "Tradez n'importe quel résultat, sans dépôt", de: "Handle jeden Ausgang, ohne Verwahrung", zh: "交易任意结果，零托管" };
const VOL = { en: "Vol", ru: "Объём", es: "Vol.", pt: "Vol.", fr: "Vol.", de: "Vol.", zh: "成交额" };
const BET = { en: "Bet →", ru: "Ставка →", es: "Apostar →", pt: "Apostar →", fr: "Parier →", de: "Wetten →", zh: "下注 →" };
const YES = { en: "YES", ru: "ДА", es: "SÍ", pt: "SIM", fr: "OUI", de: "JA", zh: "是" };
const NO = { en: "NO", ru: "НЕТ", es: "NO", pt: "NÃO", fr: "NON", de: "NEIN", zh: "否" };

const ENDS: Record<Lang, (d: number) => string> = {
  en: (d) => "in " + d + "d",
  ru: (d) => "через " + d + "д",
  es: (d) => "en " + d + "d",
  pt: (d) => "em " + d + "d",
  fr: (d) => "dans " + d + "j",
  de: (d) => "in " + d + "T",
  zh: (d) => d + "天后",
};

export default function Markets() {
  const lang = useLang();
  const [cat, setCat] = useState("All");
  const [active, setActive] = useState<Market | null>(null);
  const shown = cat === "All" ? MARKETS : MARKETS.filter((m) => m.cat === cat);
  return (
    <section id="markets" className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">{pick(lang, EYEBROW)}</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, HEADING)}</h2>
      </Reveal>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={"rounded-full px-4 py-1.5 text-sm font-medium transition-colors " + (cat === c ? "bg-ink text-[rgb(var(--base))]" : "border border-hairline bg-base text-muted hover:text-ink")}>{pick(lang, CAT_LABELS[c])}</button>
        ))}
      </div>
      <motion.div layout className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((m, i) => (
            <motion.button key={i} layout initial={cardInit} animate={cardAnim} exit={cardExit} onClick={() => setActive(m)} className="group flex flex-col rounded-2xl border border-hairline bg-base p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-nyx/5">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-muted">{pick(lang, CAT_LABELS[m.cat])}</span>
                <span className="text-xs text-muted">{ENDS[lang](m.days)}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{pick(lang, m.q)}</h3>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-mono font-bold text-payout">{pick(lang, YES)} {m.prob}%</span>
                <span className="font-mono text-muted">{pick(lang, NO)} {100 - m.prob}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-gradient-to-r from-payout to-verify" style={widthStyle(m.prob)} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">{pick(lang, VOL)} {m.vol}</span>
                <span className="text-sm font-semibold text-nyx group-hover:underline">{pick(lang, BET)}</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      <BetModal open={active !== null} onClose={() => setActive(null)} question={active ? pick(lang, active.q) : ""} startProb={active?.prob ?? 50} />
    </section>
  );
}
