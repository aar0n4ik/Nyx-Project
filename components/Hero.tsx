"use client";

import { motion } from "framer-motion";
import { useT, useLang, pick } from "@/lib/i18n";
import PlaceBet from "@/components/PlaceBet";
import AuroraMesh from "@/components/AuroraMesh";

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
} as const;

const itemV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export default function Hero() {
  const { t } = useT();
  const lang = useLang();
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#07070C] text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0B18] via-[#07070C] to-[#05050A]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-nyx/20 blur-[120px]" />
      <AuroraMesh />

      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-content px-6 py-28 text-center"
      >
        <motion.div
          variants={itemV}
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-payout" />
          {pick(lang, { en: "Live on Solana · Devnet + Mainnet", ru: "Вживую на Solana · Devnet + Mainnet", es: "En vivo en Solana · Devnet + Mainnet", pt: "Ao vivo na Solana · Devnet + Mainnet", fr: "En direct sur Solana · Devnet + Mainnet", de: "Live auf Solana · Devnet + Mainnet", zh: "在 Solana 上实时运行 · Devnet + Mainnet" })}
        </motion.div>

        <motion.p
          variants={itemV}
          className="mx-auto mt-8 max-w-2xl text-xs font-semibold uppercase tracking-[0.24em] text-white/50"
        >
          {pick(lang, { en: "The prediction market the world hasn't built yet", ru: "Рынок предсказаний, который мир ещё не построил", es: "El mercado de predicción que el mundo aún no ha construido", pt: "O mercado de previsão que o mundo ainda não construiu", fr: "Le marché de prédiction que le monde n'a pas encore construit", de: "Der Prognosemarkt, den die Welt noch nicht gebaut hat", zh: "世界尚未建成的预测市场" })}
        </motion.p>

        <motion.h1
          variants={itemV}
          className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          {pick(lang, { en: "Bets you don't have to ", ru: "Ставки, которым не нужно ", es: "Apuestas en las que no tienes que ", pt: "Apostas em que você não precisa ", fr: "Des paris auxquels vous n'avez pas à ", de: "Wetten, denen du nicht ", zh: "无需" })}
          <span className="bg-gradient-to-r from-nyx via-solana to-verify bg-clip-text text-transparent">
            {pick(lang, { en: "trust", ru: "доверять", es: "confiar", pt: "confiar", fr: "faire confiance", de: "vertrauen", zh: "信任" })}
          </span>
          {pick(lang, { en: ".", ru: ".", es: ".", pt: ".", fr: ".", de: " musst.", zh: "的下注。" })}
        </motion.h1>

        <motion.p
          variants={itemV}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/70"
        >
          {pick(lang, { en: "Zero custody. No admin key. AI resolution you verify block by block. We're not competing with bookmakers — we're replacing the reason they exist. This is Nyx, and we're going global.", ru: "Ноль кастодиальности. Никаких админ-ключей. Разрешение исходов ИИ, которое ты проверяешь блок за блоком. Мы не конкурируем с букмекерами — мы устраняем саму причину их существования. Это Nyx, и мы выходим на весь мир.", es: "Cero custodia. Sin clave de administrador. Resolución con IA que verificas bloque a bloque. No competimos con las casas de apuestas: eliminamos la razón misma de su existencia. Esto es Nyx, y vamos a por el mundo entero.", pt: "Zero custódia. Sem chave de administrador. Resolução por IA que você verifica bloco a bloco. Não competimos com as casas de apostas — eliminamos a própria razão de elas existirem. Isto é a Nyx, e vamos para o mundo todo.", fr: "Zéro conservation. Aucune clé admin. Une résolution par IA que vous vérifiez bloc par bloc. Nous ne concurrençons pas les bookmakers — nous supprimons la raison même de leur existence. C'est Nyx, et nous partons à la conquête du monde.", de: "Null Verwahrung. Kein Admin-Key. KI-Auflösung, die du Block für Block überprüfst. Wir konkurrieren nicht mit Buchmachern — wir beseitigen den Grund ihrer Existenz. Das ist Nyx, und wir gehen global.", zh: "零托管。没有管理员密钥。由 AI 判定，你可逐块验证。我们不是在与博彩公司竞争——我们要消除它们存在的理由。这就是 Nyx，我们要走向全球。" })}
        </motion.p>

        <motion.div
          variants={itemV}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <PlaceBet />
          <a
            href="#verify"
            className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t("cta.verify")}
          </a>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.22em] text-white/40">
        {pick(lang, { en: "Scroll ↓", ru: "Листай ↓", es: "Desliza ↓", pt: "Role ↓", fr: "Défiler ↓", de: "Scrollen ↓", zh: "向下滚动 ↓" })}
      </div>
    </section>
  );
}
