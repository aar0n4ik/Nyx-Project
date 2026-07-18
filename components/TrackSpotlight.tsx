"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;
type TC = { emoji: string; eyebrow: L; heading: L; points: L[]; cta: L; href: string };

const CONTENT: Record<TrackId, TC> = {
  settlement: {
    emoji: "🏁",
    href: "#verify",
    eyebrow: { en: "Settlement track", ru: "Трек Settlement", es: "Recorrido Settlement", pt: "Trilha Settlement", fr: "Parcours Settlement", de: "Settlement-Track", zh: "Settlement 路线" },
    heading: { en: "Nobody can touch the outcome", ru: "Никто не может повлиять на исход", es: "Nadie puede tocar el resultado", pt: "Ninguém pode mexer no resultado", fr: "Personne ne peut toucher au résultat", de: "Niemand kann das Ergebnis anfassen", zh: "没有人能干预结果" },
    points: [
      { en: "Resolution runs on-chain — no admin key, no override.", ru: "Разрешение исходов идёт ончейн — без админ-ключа и без ручного вмешательства.", es: "La resolución se ejecuta on-chain: sin clave de administrador, sin anulaciones.", pt: "A resolução roda on-chain — sem chave de administrador, sem override.", fr: "La résolution s'exécute on-chain — sans clé admin, sans passe-droit.", de: "Die Auflösung läuft on-chain — kein Admin-Key, kein Übersteuern.", zh: "判定在链上运行——没有管理员密钥，无法人为覆盖。" },
      { en: "Disputes are staked and slashed, not decided in a back room.", ru: "Споры решаются через стейк и слэшинг, а не в закулисье.", es: "Las disputas se resuelven con stake y slashing, no en una trastienda.", pt: "As disputas são decididas com stake e slashing, não nos bastidores.", fr: "Les litiges se règlent par mise et slashing, pas en coulisses.", de: "Streitfälle werden per Stake und Slashing entschieden, nicht im Hinterzimmer.", zh: "争议靠质押与罚没解决，而非暗箱操作。" },
      { en: "Every payout is a transaction you can verify.", ru: "Каждая выплата — это транзакция, которую можно проверить.", es: "Cada pago es una transacción que puedes verificar.", pt: "Cada pagamento é uma transação que você pode verificar.", fr: "Chaque paiement est une transaction que vous pouvez vérifier.", de: "Jede Auszahlung ist eine überprüfbare Transaktion.", zh: "每一笔赔付都是可验证的交易。" },
    ],
    cta: { en: "See how settlement works", ru: "Как работает расчёт", es: "Cómo funciona la liquidación", pt: "Como funciona a liquidação", fr: "Comment fonctionne le règlement", de: "So funktioniert Settlement", zh: "了解结算如何运作" },
  },
  agents: {
    emoji: "🤖",
    href: "#edge",
    eyebrow: { en: "Agents track", ru: "Трек Agents", es: "Recorrido Agents", pt: "Trilha Agents", fr: "Parcours Agents", de: "Agents-Track", zh: "Agents 路线" },
    heading: { en: "An agent that bets — but never holds your money", ru: "Агент, который делает ставки — но никогда не держит твои деньги", es: "Un agente que apuesta, pero nunca retiene tu dinero", pt: "Um agente que aposta — mas nunca guarda seu dinheiro", fr: "Un agent qui parie — mais ne détient jamais votre argent", de: "Ein Agent, der wettet — aber nie dein Geld hält", zh: "会下注的智能体——但永远不碰你的钱" },
    points: [
      { en: "Capped, expiring allowance — the agent can't exceed it.", ru: "Ограниченное и истекающее разрешение — агент не выйдет за его пределы.", es: "Autorización limitada y con vencimiento: el agente no puede superarla.", pt: "Permissão limitada e com expiração — o agente não pode ultrapassá-la.", fr: "Autorisation plafonnée et expirante — l'agent ne peut pas la dépasser.", de: "Begrenzte, ablaufende Freigabe — der Agent kann sie nicht überschreiten.", zh: "限额且会过期的授权——智能体无法超额。" },
      { en: "Zero custody: funds stay in your wallet until settlement.", ru: "Ноль кастодиальности: средства остаются в твоём кошельке до расчёта.", es: "Cero custodia: los fondos permanecen en tu billetera hasta la liquidación.", pt: "Zero custódia: os fundos ficam na sua carteira até a liquidação.", fr: "Zéro conservation : les fonds restent dans votre wallet jusqu'au règlement.", de: "Null Verwahrung: Gelder bleiben bis zur Abrechnung in deiner Wallet.", zh: "零托管：资金在结算前始终留在你的钱包里。" },
      { en: "Revoke anytime; every action is on-chain.", ru: "Отзови доступ в любой момент; каждое действие — ончейн.", es: "Revoca cuando quieras; cada acción está on-chain.", pt: "Revogue quando quiser; cada ação está on-chain.", fr: "Révoquez à tout moment ; chaque action est on-chain.", de: "Jederzeit widerrufbar; jede Aktion ist on-chain.", zh: "随时可撤销；每个动作都在链上。" },
    ],
    cta: { en: "Meet Nyx Edge", ru: "Знакомься с Nyx Edge", es: "Conoce Nyx Edge", pt: "Conheça o Nyx Edge", fr: "Découvrez Nyx Edge", de: "Lerne Nyx Edge kennen", zh: "认识 Nyx Edge" },
  },
  fan: {
    emoji: "🎉",
    href: "#markets",
    eyebrow: { en: "Fan track", ru: "Трек Fan", es: "Recorrido Fan", pt: "Trilha Fan", fr: "Parcours Fan", de: "Fan-Track", zh: "Fan 路线" },
    heading: { en: "Bet from any post — creators earn automatically", ru: "Ставь из любого поста — авторы зарабатывают автоматически", es: "Apuesta desde cualquier publicación: los creadores ganan automáticamente", pt: "Aposte a partir de qualquer post — os criadores ganham automaticamente", fr: "Pariez depuis n'importe quelle publication — les créateurs gagnent automatiquement", de: "Wette aus jedem Post — Creator verdienen automatisch", zh: "从任意帖子下注——创作者自动获得收益" },
    points: [
      { en: "Every bet is a Solana Blink you can drop anywhere.", ru: "Каждая ставка — это Solana Blink, который можно вставить куда угодно.", es: "Cada apuesta es un Solana Blink que puedes poner en cualquier lugar.", pt: "Cada aposta é um Solana Blink que você pode colocar em qualquer lugar.", fr: "Chaque pari est un Solana Blink que vous pouvez placer n'importe où.", de: "Jede Wette ist ein Solana Blink, den du überall platzieren kannst.", zh: "每一注都是可放置在任何地方的 Solana Blink。" },
      { en: "Affiliate split pays creators on-chain, instantly.", ru: "Реферальный сплит платит авторам ончейн, мгновенно.", es: "El reparto de afiliados paga a los creadores on-chain, al instante.", pt: "O split de afiliado paga os criadores on-chain, instantaneamente.", fr: "Le partage d'affiliation paie les créateurs on-chain, instantanément.", de: "Der Affiliate-Anteil zahlt Creator sofort on-chain aus.", zh: "联盟分成在链上即时支付给创作者。" },
      { en: "No app install — sign in your wallet and go.", ru: "Без установки приложения — подписал в кошельке и готово.", es: "Sin instalar apps: firma en tu billetera y listo.", pt: "Sem instalar app — assine na sua carteira e pronto.", fr: "Aucune appli à installer — signez dans votre wallet et c'est parti.", de: "Keine App-Installation — in der Wallet signieren und los.", zh: "无需安装应用——在钱包里签名即可开始。" },
    ],
    cta: { en: "Try a Blink", ru: "Попробовать Blink", es: "Prueba un Blink", pt: "Experimente um Blink", fr: "Essayez un Blink", de: "Blink ausprobieren", zh: "试试 Blink" },
  },
};

const fadeInit = { opacity: 0, y: 16 } as const;
const fadeAnim = { opacity: 1, y: 0 } as const;
const fadeExit = { opacity: 0, y: -16 } as const;
const fadeTrans = { duration: 0.35, ease: "easeOut" } as const;

export default function TrackSpotlight() {
  const lang = useLang();
  const [track] = useTrack();
  const active: TrackId = track ?? "settlement";
  const c = CONTENT[active];

  return (
    <section id="track" className="mx-auto max-w-content px-6 py-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={fadeInit}
          animate={fadeAnim}
          exit={fadeExit}
          transition={fadeTrans}
          className="relative overflow-hidden rounded-3xl border border-hairline bg-subtle p-8 sm:p-12"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-nyx/15 blur-[100px]"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-base text-2xl">
                {c.emoji}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                {pick(lang, c.eyebrow)}
              </span>
            </div>

            <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {pick(lang, c.heading)}
            </h2>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {c.points.map((p, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-hairline bg-base p-5 text-sm leading-relaxed text-muted"
                >
                  <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-nyx/10 text-xs font-semibold text-nyx">
                    {i + 1}
                  </span>
                  {pick(lang, p)}
                </li>
              ))}
            </ul>

            <a
              href={c.href}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-nyx to-verify px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {pick(lang, c.cta)}
              <span>→</span>
            </a>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
