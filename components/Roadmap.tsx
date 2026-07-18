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
    tag: { en: "Q2 2026 · Devnet", ru: "Q2 2026 · Devnet", es: "Q2 2026 · Devnet", pt: "Q2 2026 · Devnet", fr: "Q2 2026 · Devnet", de: "Q2 2026 · Devnet", zh: "Q2 2026 · Devnet" },
    title: { en: "The trustless core, live", ru: "Бездоверительное ядро — вживую", es: "El núcleo sin confianza, en vivo", pt: "O núcleo sem confiança, no ar", fr: "Le cœur sans confiance, en direct", de: "Der vertrauenslose Kern, live", zh: "无需信任的内核，已上线" },
    state: "done",
    points: [
      { en: "Settlement with no admin key", ru: "Расчёт без админ-ключа", es: "Liquidación sin clave de administrador", pt: "Liquidação sem chave de administrador", fr: "Règlement sans clé admin", de: "Abrechnung ohne Admin-Key", zh: "无管理员密钥的结算" },
      { en: "AI resolution + on-chain dispute & slashing", ru: "ИИ-разрешение + ончейн-спор и слэшинг", es: "Resolución con IA + disputa on-chain y slashing", pt: "Resolução por IA + disputa on-chain e slashing", fr: "Résolution par IA + litige on-chain et slashing", de: "KI-Auflösung + On-chain-Streit & Slashing", zh: "AI 判定 + 链上争议与罚没" },
      { en: "Zero-custody agent betting via capped allowances", ru: "Ставки агентов без кастодиана через ограниченные разрешения", es: "Apuestas de agentes sin custodia mediante autorizaciones limitadas", pt: "Apostas de agentes sem custódia via permissões limitadas", fr: "Paris d'agents sans garde via des autorisations plafonnées", de: "Zero-Custody-Agentenwetten über begrenzte Freigaben", zh: "通过限额授权实现零托管的智能体下注" },
    ],
  },
  {
    tag: { en: "Now · World Cup Hackathon", ru: "Сейчас · World Cup Hackathon", es: "Ahora · World Cup Hackathon", pt: "Agora · World Cup Hackathon", fr: "Maintenant · World Cup Hackathon", de: "Jetzt · World Cup Hackathon", zh: "进行中 · World Cup Hackathon" },
    title: { en: "Flagship product & real football markets", ru: "Флагманский продукт и реальные футбольные рынки", es: "Producto insignia y mercados de fútbol reales", pt: "Produto principal e mercados reais de futebol", fr: "Produit phare et vrais marchés de football", de: "Flaggschiff-Produkt & echte Fußballmärkte", zh: "旗舰产品与真实足球市场" },
    state: "now",
    points: [
      { en: "TxLINE live football feed wired in", ru: "Подключён живой футбольный фид TxLINE", es: "Feed de fútbol en vivo de TxLINE integrado", pt: "Feed de futebol ao vivo do TxLINE integrado", fr: "Flux de football en direct TxLINE intégré", de: "TxLINE-Live-Fußballfeed integriert", zh: "接入 TxLINE 实时足球数据流" },
      { en: "Proof-of-Inference anchored on mainnet", ru: "Proof-of-Inference закреплён в mainnet", es: "Proof-of-Inference anclado en mainnet", pt: "Proof-of-Inference ancorado na mainnet", fr: "Proof-of-Inference ancré sur le mainnet", de: "Proof-of-Inference auf dem Mainnet verankert", zh: "Proof-of-Inference 锚定在主网" },
      { en: "Premium site, Blinks, verifiable feed", ru: "Премиальный сайт, Blinks, проверяемый фид", es: "Sitio premium, Blinks, feed verificable", pt: "Site premium, Blinks, feed verificável", fr: "Site premium, Blinks, flux vérifiable", de: "Premium-Site, Blinks, verifizierbarer Feed", zh: "高端站点、Blinks、可验证数据流" },
    ],
  },
  {
    tag: { en: "Next · Mainnet", ru: "Дальше · Mainnet", es: "Próximo · Mainnet", pt: "Próximo · Mainnet", fr: "Ensuite · Mainnet", de: "Als Nächstes · Mainnet", zh: "接下来 · Mainnet" },
    title: { en: "Real money, real payouts", ru: "Реальные деньги, реальные выплаты", es: "Dinero real, pagos reales", pt: "Dinheiro real, pagamentos reais", fr: "Argent réel, gains réels", de: "Echtes Geld, echte Auszahlungen", zh: "真金白银，真实赔付" },
    state: "next",
    points: [
      { en: "USD₮ settlement on mainnet", ru: "Расчёт в USD₮ в mainnet", es: "Liquidación en USD₮ en mainnet", pt: "Liquidação em USD₮ na mainnet", fr: "Règlement en USD₮ sur le mainnet", de: "USD₮-Abrechnung auf dem Mainnet", zh: "主网上的 USD₮ 结算" },
      { en: "Creator & fan Blinks with automatic splits", ru: "Blinks для авторов и фанатов с автоматическим сплитом", es: "Blinks para creadores y fans con reparto automático", pt: "Blinks para criadores e fãs com divisão automática", fr: "Blinks créateurs & fans avec répartition automatique", de: "Creator- & Fan-Blinks mit automatischer Aufteilung", zh: "面向创作者与粉丝、自动分成的 Blinks" },
      { en: "Multi-sport, mobile PWA, global access", ru: "Мультиспорт, мобильное PWA, глобальный доступ", es: "Multideporte, PWA móvil, acceso global", pt: "Multiesporte, PWA móvel, acesso global", fr: "Multisport, PWA mobile, accès mondial", de: "Multisport, mobile PWA, globaler Zugang", zh: "多项运动、移动 PWA、全球可用" },
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
