"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);

const overlayV = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
} as const;

const panelV = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } },
} as const;

export default function PlaceBet() {
  const lang = useLang();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gradient-to-r from-nyx to-solana px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:opacity-90"
      >
        {pick(lang, { en: "Try a live bet →", ru: "Сделать живую ставку →", es: "Prueba una apuesta real →", pt: "Faça uma aposta real →", fr: "Essayez un pari réel →", de: "Echte Wette testen →", zh: "试下一笔真实下注 →" })}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            variants={overlayV}
            initial="hidden"
            animate="show"
            exit="hidden"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              variants={panelV}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0B14] p-6 text-white shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-payout" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  {pick(lang, { en: "Devnet · test USD₮", ru: "Devnet · тестовый USD₮", es: "Devnet · USD₮ de prueba", pt: "Devnet · USD₮ de teste", fr: "Devnet · USD₮ de test", de: "Devnet · Test-USD₮", zh: "Devnet · 测试 USD₮" })}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                {pick(lang, { en: "Place a real bet", ru: "Сделай настоящую ставку", es: "Haz una apuesta real", pt: "Faça uma aposta real", fr: "Placez un pari réel", de: "Platziere eine echte Wette", zh: "下一笔真实下注" })}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {pick(lang, { en: "You sign from your own wallet. Nyx never takes custody — your stake is escrowed on-chain and settled with no admin key. This is live on Solana devnet with test USD₮, so nothing costs real money yet.", ru: "Ты подписываешь из своего кошелька. Nyx никогда не берёт средства в кастодиан — твоя ставка эскроу-ится ончейн и рассчитывается без админ-ключа. Это работает вживую на Solana devnet с тестовым USD₮, так что пока это не стоит реальных денег.", es: "Firmas desde tu propia billetera. Nyx nunca toma custodia: tu apuesta queda en depósito on-chain y se liquida sin clave de administrador. Esto está en vivo en Solana devnet con USD₮ de prueba, así que todavía no cuesta dinero real.", pt: "Você assina da sua própria carteira. O Nyx nunca assume custódia — sua aposta fica em escrow on-chain e é liquidada sem chave de administrador. Isto está no ar na Solana devnet com USD₮ de teste, então ainda não custa dinheiro real.", fr: "Vous signez depuis votre propre portefeuille. Nyx ne prend jamais la garde — votre mise est mise en séquestre on-chain et réglée sans clé admin. C'est en direct sur Solana devnet avec des USD₮ de test, donc rien ne coûte d'argent réel pour l'instant.", de: "Du signierst aus deiner eigenen Wallet. Nyx übernimmt nie die Verwahrung — dein Einsatz wird on-chain treuhänderisch gehalten und ohne Admin-Key abgerechnet. Das läuft live auf Solana devnet mit Test-USD₮, es kostet also noch kein echtes Geld.", zh: "你从自己的钱包签署。Nyx 绝不托管——你的本金在链上托管，并在没有管理员密钥的情况下结算。它已在 Solana devnet 上以测试 USD₮ 实时运行，所以目前不花真钱。" })}
              </p>

              <ol className="mt-5 space-y-2 text-sm text-white/70">
                <li>{pick(lang, { en: "1. Open the Blink and connect a Solana wallet (devnet).", ru: "1. Открой Blink и подключи кошелёк Solana (devnet).", es: "1. Abre el Blink y conecta una billetera de Solana (devnet).", pt: "1. Abra o Blink e conecte uma carteira Solana (devnet).", fr: "1. Ouvrez le Blink et connectez un portefeuille Solana (devnet).", de: "1. Öffne den Blink und verbinde eine Solana-Wallet (devnet).", zh: "1. 打开 Blink 并连接一个 Solana 钱包（devnet）。" })}</li>
                <li>{pick(lang, { en: "2. Choose your outcome and stake.", ru: "2. Выбери исход и сумму ставки.", es: "2. Elige tu resultado y tu apuesta.", pt: "2. Escolha seu resultado e sua aposta.", fr: "2. Choisissez votre résultat et votre mise.", de: "2. Wähle dein Ergebnis und deinen Einsatz.", zh: "2. 选择你的结果和下注金额。" })}</li>
                <li>{pick(lang, { en: "3. Sign — your bet is escrowed on-chain.", ru: "3. Подпиши — ставка эскроу-ится ончейн.", es: "3. Firma: tu apuesta queda en depósito on-chain.", pt: "3. Assine — sua aposta fica em escrow on-chain.", fr: "3. Signez — votre pari est mis en séquestre on-chain.", de: "3. Signiere — deine Wette wird on-chain treuhänderisch gehalten.", zh: "3. 签署——你的下注在链上托管。" })}</li>
              </ol>

              <a
                href={BLINK_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-nyx to-solana px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {pick(lang, { en: "Open the Blink & sign →", ru: "Открыть Blink и подписать →", es: "Abrir el Blink y firmar →", pt: "Abrir o Blink e assinar →", fr: "Ouvrir le Blink et signer →", de: "Blink öffnen & signieren →", zh: "打开 Blink 并签署 →" })}
              </a>

              <a
                href="/app"
                className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {pick(lang, { en: "Or explore the full app", ru: "Или изучи полное приложение", es: "O explora la app completa", pt: "Ou explore o app completo", fr: "Ou explorez l'application complète", de: "Oder erkunde die komplette App", zh: "或探索完整应用" })}
              </a>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full text-center text-xs uppercase tracking-wide text-white/40 transition hover:text-white/70"
              >
                {pick(lang, { en: "Close", ru: "Закрыть", es: "Cerrar", pt: "Fechar", fr: "Fermer", de: "Schließen", zh: "关闭" })}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
