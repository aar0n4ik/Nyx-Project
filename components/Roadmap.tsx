"use client";

import { motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const viewportOnce = { once: true, amount: 0.3 } as const;

const listV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const;

const itemV = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
} as const;

type Phase = {
  tag: L;
  title: L;
  points: L[];
  state: "done" | "now" | "next";
};

const PHASES: Phase[] = [
  {
    tag: { en: "Now · World Cup Hackathon", ru: "Сейчас · World Cup Hackathon", es: "Ahora · World Cup Hackathon", pt: "Agora · World Cup Hackathon", fr: "Maintenant · World Cup Hackathon", de: "Jetzt · World Cup Hackathon", zh: "进行中 · World Cup Hackathon" },
    title: { en: "Flagship product & real football markets", ru: "Флагманский продукт и реальные футбольные рынки", es: "Producto insignia y mercados de fútbol reales", pt: "Produto principal e mercados reais de futebol", fr: "Produit phare et vrais marchés de football", de: "Flaggschiff-Produkt & echte Fußballmärkte", zh: "旗舰产品与真实足球市场" },
    state: "now",
    points: [
      { en: "TxLINE live football feed wired in", ru: "Подключён живой футбольный фид TxLINE", es: "Feed de fútbol en vivo de TxLINE integrado", pt: "Feed de futebol ao vivo do TxLINE integrado", fr: "Flux de football en direct TxLINE intégré", de: "TxLINE-Live-Fußballfeed integriert", zh: "接入 TxLINE 实时足球数据流" },
      { en: "Proof-of-Inference anchored on mainnet", ru: "Proof-of-Inference закреплён в mainnet", es: "Proof-of-Inference anclado en mainnet", pt: "Proof-of-Inference ancorado na mainnet", fr: "Proof-of-Inference ancré sur le mainnet", de: "Proof-of-Inference auf dem Mainnet verankert", zh: "Proof-of-Inference 锚定在主网" },
      { en: "Trustless settlement live across all three tracks", ru: "Бездоверительный расчёт вживую по всем трём трекам", es: "Liquidación sin confianza en los tres tracks", pt: "Liquidação sem confiança nos três tracks", fr: "Règlement sans confiance sur les trois tracks", de: "Vertrauensloses Settlement über alle drei Tracks", zh: "三条赛道全部上线无信任结算" },
    ],
  },
  {
    tag: { en: "The horizon", ru: "Горизонт", es: "El horizonte", pt: "O horizonte", fr: "L'horizon", de: "Der Horizont", zh: "地平线" },
    title: { en: "A trust-minimized layer for every market on Earth", ru: "Бездоверительный слой для любого рынка на Земле", es: "Una capa sin confianza para cada mercado del mundo", pt: "Uma camada sem confiança para cada mercado do mundo", fr: "Une couche sans confiance pour chaque marché du monde", de: "Eine vertrauensminimierte Schicht für jeden Markt der Welt", zh: "面向全球每个市场的无信任层" },
    state: "next",
    points: [
      { en: "Massive mainnet deployment", ru: "Массовый выход в mainnet", es: "Despliegue masivo en mainnet", pt: "Implantação massiva na mainnet", fr: "Déploiement massif sur le mainnet", de: "Massives Mainnet-Deployment", zh: "大规模主网部署" },
      { en: "Any sport, any event, any outcome", ru: "Любой спорт, любое событие, любой исход", es: "Cualquier deporte, evento y resultado", pt: "Qualquer esporte, evento e resultado", fr: "Tout sport, tout événement, tout résultat", de: "Jeder Sport, jedes Event, jedes Ergebnis", zh: "任意运动、任意事件、任意结果" },
      { en: "Explore advanced settlement topologies", ru: "Исследование продвинутых топологий расчёта", es: "Explorar topologías de liquidación avanzadas", pt: "Explorar topologias avançadas de liquidação", fr: "Explorer des topologies de règlement avancées", de: "Fortgeschrittene Settlement-Topologien erforschen", zh: "探索先进的结算拓扑" },
    ],
  },
  {
    tag: { en: "The mission", ru: "Миссия", es: "La misión", pt: "A missão", fr: "La mission", de: "Die Mission", zh: "使命" },
    title: { en: "Make trust optional, everywhere", ru: "Сделать доверие необязательным — везде", es: "Hacer que la confianza sea opcional, en todas partes", pt: "Tornar a confiança opcional, em todo lugar", fr: "Rendre la confiance optionnelle, partout", de: "Vertrauen überall optional machen", zh: "让信任在任何地方都成为可选项" },
    state: "next",
    points: [
      { en: "Scale globally", ru: "Глобальное масштабирование", es: "Escalar globalmente", pt: "Escalar globalmente", fr: "Passer à l'échelle mondiale", de: "Global skalieren", zh: "全球扩张" },
      { en: "Open settlement infrastructure for builders", ru: "Открытая инфраструктура расчёта для билдеров", es: "Infraestructura de liquidación abierta para builders", pt: "Infraestrutura de liquidação aberta para builders", fr: "Infrastructure de règlement ouverte pour les builders", de: "Offene Settlement-Infrastruktur für Builder", zh: "面向开发者的开放结算基础设施" },
      { en: "Relentless, long-term commitment", ru: "Бескомпромиссная приверженность вдолгую", es: "Compromiso implacable a largo plazo", pt: "Compromisso implacável de longo prazo", fr: "Engagement acharné sur le long terme", de: "Unermüdliches, langfristiges Engagement", zh: "长期主义，永不止步" },
    ],
  },
];

const stateStyles: Record<Phase["state"], string> = {
  done: "border-payout/40 text-payout",
  now: "border-solana/50 text-solana",
  next: "border-hairline text-muted",
};

export default function Roadmap() {
  const lang = useLang();
  return (
    <section id="roadmap" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {pick(lang, { en: "Roadmap", ru: "Дорожная карта", es: "Hoja de ruta", pt: "Roadmap", fr: "Feuille de route", de: "Roadmap", zh: "路线图" })}
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {pick(lang, { en: "From a trustless core to a global prediction layer", ru: "От бездоверительного ядра к глобальному слою предсказаний", es: "De un núcleo sin confianza a una capa global de predicción", pt: "De um núcleo sem confiança a uma camada global de previsão", fr: "D'un cœur sans confiance à une couche de prédiction mondiale", de: "Von einem vertrauenslosen Kern zu einer globalen Prognoseschicht", zh: "从无需信任的内核到全球预测层" })}
        </h2>

        <motion.div
          variants={listV}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {PHASES.map((phase) => (
            <motion.div
              key={phase.state}
              variants={itemV}
              className="rounded-2xl border border-hairline bg-subtle p-6"
            >
              <span
                className={
                  "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide " +
                  stateStyles[phase.state]
                }
              >
                {pick(lang, phase.tag)}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{pick(lang, phase.title)}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {phase.points.map((pt, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-solana" />
                    {pick(lang, pt)}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
