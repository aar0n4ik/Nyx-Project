"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";

const yesInit = { opacity: 0.4, y: 6 } as const;
const yesAnim = { opacity: 1, y: 0 } as const;
const barTrans = { type: "spring", stiffness: 120, damping: 20 } as const;
const barAnim = (v: number) => ({ width: v * 100 + "%" });

export default function PredictionAMM() {
  const lang = useLang();
  const [yes, setYes] = useState(0.62);
  useEffect(() => {
    const id = setInterval(() => { setYes((p) => { const next = p + (Math.random() - 0.5) * 0.04; return Math.min(0.9, Math.max(0.1, next)); }); }, 1400);
    return () => clearInterval(id);
  }, []);
  const no = 1 - yes;
  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-payout">{pick(lang, { en: "Recentred LMSR pricing", ru: "Ценообразование на рецентрированном LMSR", es: "Precios con LMSR recentrado", pt: "Precificação com LMSR recentrado", fr: "Tarification LMSR recentrée", de: "Preisbildung mit rezentriertem LMSR", zh: "重心校正的 LMSR 定价" })}</div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, { en: "Odds that can't be gamed", ru: "Коэффициенты, которые нельзя накрутить", es: "Cuotas que no se pueden manipular", pt: "Odds que não podem ser manipuladas", fr: "Des cotes qu'on ne peut pas truquer", de: "Quoten, die sich nicht manipulieren lassen", zh: "无法被操纵的赔率" })}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">{pick(lang, { en: "nyx_pamm prices every share with a recentred LMSR curve. Max LP loss is bounded to b·ln(n) — deterministic, front-running-proof.", ru: "nyx_pamm оценивает каждую долю по рецентрированной кривой LMSR. Максимальный убыток LP ограничен b·ln(n) — детерминированно и защищено от фронтраннинга.", es: "nyx_pamm cotiza cada participación con una curva LMSR recentrada. La pérdida máxima del LP está acotada a b·ln(n): determinista y a prueba de front-running.", pt: "nyx_pamm precifica cada cota com uma curva LMSR recentrada. A perda máxima do LP é limitada a b·ln(n) — determinística e à prova de front-running.", fr: "nyx_pamm tarifie chaque part avec une courbe LMSR recentrée. La perte maximale du LP est bornée à b·ln(n) — déterministe et à l'épreuve du front-running.", de: "nyx_pamm bepreist jeden Anteil mit einer rezentrierten LMSR-Kurve. Der maximale LP-Verlust ist auf b·ln(n) begrenzt — deterministisch und front-running-sicher.", zh: "nyx_pamm 用重心校正的 LMSR 曲线为每一份份额定价。做市商最大亏损被限定在 b·ln(n)——确定性、且抗抢跑。" })}</p>
      </Reveal>
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-hairline bg-base p-8 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm font-semibold text-muted">{pick(lang, { en: "YES", ru: "ДА", es: "SÍ", pt: "SIM", fr: "OUI", de: "JA", zh: "是" })}</div>
            <motion.div key={Math.round(yes * 1000)} initial={yesInit} animate={yesAnim} className="font-display text-5xl font-bold text-payout">{(yes * 100).toFixed(1)}%</motion.div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-muted">{pick(lang, { en: "NO", ru: "НЕТ", es: "NO", pt: "NÃO", fr: "NON", de: "NEIN", zh: "否" })}</div>
            <div className="font-display text-5xl font-bold text-ink">{(no * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-subtle">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-payout to-verify" animate={barAnim(yes)} transition={barTrans} />
        </div>
        <div className="mt-6 flex justify-between font-mono text-xs text-muted"><span>b = 250</span><span>max LP loss ≤ b·ln(2) ≈ 173 USD₮</span></div>
      </div>
    </section>
  );
}
