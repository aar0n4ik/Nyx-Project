"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;
type Track = {
  id: TrackId;
  emoji: string;
  name: L;
  tagline: L;
  blurb: L;
  points: L[];
  ctaLabel: L;
  ctaHref: string;
  accent: string;
};

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL = "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);

const TRACKS: Track[] = [
  {
    id: "settlement",
    emoji: "🏁",
    accent: "text-solana",
    ctaHref: "#feed",
    name: { en: "Prediction Markets & Settlement", ru: "Прогнозные рынки и расчёт", es: "Mercados de predicción y liquidación", pt: "Mercados de previsão e liquidação", fr: "Marchés de prédiction et règlement", de: "Prognosemärkte & Abwicklung", zh: "预测市场与结算" },
    tagline: { en: "No admin key can decide your bet.", ru: "Никакой админ-ключ не решит исход твоей ставки.", es: "Ninguna clave de administrador decide tu apuesta.", pt: "Nenhuma chave de admin decide sua aposta.", fr: "Aucune clé admin ne décide de votre pari.", de: "Kein Admin-Schlüssel entscheidet über deine Wette.", zh: "没有任何管理员密钥能决定你的下注结果。" },
    blurb: { en: "The core track. Nyx settles real football markets from the TxLINE live feed with no privileged key — outcomes are resolved by an oracle bridge, challenged through on-chain disputes, and paid out in USD₮.", ru: "Основной трек. Nyx рассчитывает реальные футбольные рынки из живого фида TxLINE без привилегированного ключа — исходы определяет оракульный мост, оспариваются через ончейн-споры и выплачиваются в USD₮.", es: "El track principal. Nyx liquida mercados de fútbol reales del feed en vivo de TxLINE sin ninguna clave privilegiada: los resultados los resuelve un puente de oráculo, se disputan mediante disputas on-chain y se pagan en USD₮.", pt: "O track principal. A Nyx liquida mercados de futebol reais do feed ao vivo da TxLINE sem nenhuma chave privilegiada — os resultados são resolvidos por uma ponte de oráculo, contestados via disputas on-chain e pagos em USD₮.", fr: "Le track principal. Nyx règle de vrais marchés de football depuis le flux live TxLINE sans aucune clé privilégiée — les résultats sont résolus par un pont d'oracle, contestés via des litiges on-chain et payés en USD₮.", de: "Der Kern-Track. Nyx wickelt echte Fußballmärkte aus dem TxLINE-Live-Feed ohne privilegierten Schlüssel ab — Ergebnisse werden von einer Oracle-Bridge aufgelöst, über On-Chain-Disputes angefochten und in USD₮ ausgezahlt.", zh: "核心赛道。Nyx 依据 TxLINE 实时数据流结算真实足球市场，无需任何特权密钥——结果由预言机桥解析，通过链上争议进行挑战，并以 USD₮ 支付。" },
    points: [
      { en: "Trustless resolve via oracle bridge", ru: "Бездоверительный расчёт через оракульный мост", es: "Resolución sin confianza vía puente de oráculo", pt: "Resolução sem confiança via ponte de oráculo", fr: "Résolution sans confiance via pont d'oracle", de: "Vertrauensfreie Auflösung über Oracle-Bridge", zh: "通过预言机桥的无信任结算" },
      { en: "On-chain disputes with staking & slashing", ru: "Ончейн-споры со стейкингом и слэшингом", es: "Disputas on-chain con staking y slashing", pt: "Disputas on-chain com staking e slashing", fr: "Litiges on-chain avec staking et slashing", de: "On-Chain-Disputes mit Staking & Slashing", zh: "带质押与罚没的链上争议" },
      { en: "USD₮ payouts, no admin key", ru: "Выплаты в USD₮, без админ-ключа", es: "Pagos en USD₮, sin clave de admin", pt: "Pagamentos em USD₮, sem chave de admin", fr: "Paiements en USD₮, sans clé admin", de: "USD₮-Auszahlungen, kein Admin-Schlüssel", zh: "USD₮ 赔付，无管理员密钥" },
      { en: "Built on the TxLINE live football feed", ru: "На базе живого футбольного фида TxLINE", es: "Sobre el feed de fútbol en vivo TxLINE", pt: "Sobre o feed de futebol ao vivo TxLINE", fr: "Basé sur le flux football live TxLINE", de: "Auf dem TxLINE-Live-Fußball-Feed", zh: "基于 TxLINE 实时足球数据流" },
    ],
    ctaLabel: { en: "Watch a market settle", ru: "Смотреть расчёт рынка", es: "Ver liquidar un mercado", pt: "Ver um mercado liquidar", fr: "Voir un marché se régler", de: "Marktabwicklung ansehen", zh: "观看市场结算" },
  },
  {
    id: "agents",
    emoji: "🤖",
    accent: "text-nyx",
    ctaHref: "#feed",
    name: { en: "Trading Tools & Agents", ru: "Торговые инструменты и агенты", es: "Herramientas de trading y agentes", pt: "Ferramentas de trading e agentes", fr: "Outils de trading et agents", de: "Trading-Tools & Agenten", zh: "交易工具与智能体" },
    tagline: { en: "An agent that bets for you — and can never touch your money.", ru: "Агент, который ставит за тебя — и никогда не касается твоих денег.", es: "Un agente que apuesta por ti y nunca puede tocar tu dinero.", pt: "Um agente que aposta por você — e nunca pode tocar no seu dinheiro.", fr: "Un agent qui parie pour vous — sans jamais toucher à votre argent.", de: "Ein Agent, der für dich wettet — und dein Geld nie berühren kann.", zh: "一个替你下注、却永远碰不到你钱的智能体。" },
    blurb: { en: "Give an agent a capped, expiring allowance and let it trade. It can place bets on your behalf, but the instant it tries to exceed your limit the transaction reverts. Non-custodial by construction.", ru: "Дай агенту ограниченное разрешение с истечением — и пусть торгует. Он ставит от твоего имени, но как только пытается превысить лимит, транзакция откатывается. Некастодиально по построению.", es: "Dale a un agente una autorización limitada y con caducidad y déjalo operar. Puede apostar en tu nombre, pero en cuanto intenta superar tu límite la transacción se revierte. No custodial por diseño.", pt: "Dê a um agente uma permissão limitada e expirável e deixe-o operar. Ele aposta em seu nome, mas assim que tenta exceder seu limite a transação é revertida. Não custodial por construção.", fr: "Donnez à un agent une autorisation plafonnée et expirable, et laissez-le trader. Il parie en votre nom, mais dès qu'il tente de dépasser votre limite, la transaction est annulée. Non-custodial par conception.", de: "Gib einem Agenten eine begrenzte, ablaufende Freigabe und lass ihn handeln. Er wettet in deinem Namen, aber sobald er dein Limit überschreiten will, wird die Transaktion rückgängig gemacht. Non-custodial per Konstruktion.", zh: "给智能体一个有上限、会过期的授权，让它去交易。它能代你下注，但一旦试图超出你的限额，交易就会回滚。天生非托管。" },
    points: [
      { en: "Capped & expiring allowances", ru: "Ограниченные разрешения с истечением", es: "Autorizaciones limitadas y con caducidad", pt: "Permissões limitadas e expiráveis", fr: "Autorisations plafonnées et expirables", de: "Begrenzte, ablaufende Freigaben", zh: "有上限且会过期的授权" },
      { en: "Agent loop live on devnet", ru: "Цикл агента работает в devnet", es: "Bucle del agente en vivo en devnet", pt: "Loop do agente ativo na devnet", fr: "Boucle d'agent en direct sur devnet", de: "Agenten-Loop live im Devnet", zh: "智能体循环已在 devnet 运行" },
      { en: "Reverts on over-spend (AmountExceedsLimit)", ru: "Откат при перерасходе (AmountExceedsLimit)", es: "Se revierte al exceder el gasto (AmountExceedsLimit)", pt: "Reverte ao exceder o gasto (AmountExceedsLimit)", fr: "Annulation en cas de dépassement (AmountExceedsLimit)", de: "Rückabwicklung bei Überschreitung (AmountExceedsLimit)", zh: "超额即回滚（AmountExceedsLimit）" },
      { en: "You keep your keys, always", ru: "Ключи всегда остаются у тебя", es: "Tú conservas tus llaves, siempre", pt: "Você mantém suas chaves, sempre", fr: "Vous gardez vos clés, toujours", de: "Deine Schlüssel bleiben immer bei dir", zh: "你的密钥始终在你手中" },
    ],
    ctaLabel: { en: "See the agent on-chain", ru: "Смотреть агента в сети", es: "Ver el agente on-chain", pt: "Ver o agente on-chain", fr: "Voir l'agent on-chain", de: "Agent on-chain ansehen", zh: "在链上查看智能体" },
  },
  {
    id: "fan",
    emoji: "🎉",
    accent: "text-verify",
    ctaHref: BLINK_URL,
    name: { en: "Consumer & Fan Experiences", ru: "Потребительский и фан-опыт", es: "Experiencias para consumidores y fans", pt: "Experiências para consumidores e fãs", fr: "Expériences grand public et fans", de: "Consumer- & Fan-Erlebnisse", zh: "消费者与球迷体验" },
    tagline: { en: "Bet from any post. Creators earn automatically.", ru: "Ставь из любого поста. Авторы зарабатывают автоматически.", es: "Apuesta desde cualquier publicación. Los creadores ganan automáticamente.", pt: "Aposte a partir de qualquer post. Os criadores ganham automaticamente.", fr: "Pariez depuis n'importe quel post. Les créateurs gagnent automatiquement.", de: "Wette aus jedem Post. Creator verdienen automatisch.", zh: "从任意帖子下注。创作者自动获得收益。" },
    blurb: { en: "Turn any tweet or post into a bet with Solana Blinks. Fans stake in one tap, and the creators who drove them earn an automatic on-chain split — no dashboards, no manual payouts.", ru: "Преврати любой твит или пост в ставку с помощью Solana Blinks. Фанаты ставят в один тап, а приведшие их авторы получают автоматическую ончейн-долю — без дашбордов и ручных выплат.", es: "Convierte cualquier tweet o publicación en una apuesta con Solana Blinks. Los fans apuestan con un toque y los creadores que los atrajeron ganan un reparto on-chain automático: sin paneles, sin pagos manuales.", pt: "Transforme qualquer tweet ou post em uma aposta com Solana Blinks. Os fãs apostam com um toque e os criadores que os trouxeram ganham um repasse on-chain automático — sem painéis, sem pagamentos manuais.", fr: "Transformez n'importe quel tweet ou post en pari avec Solana Blinks. Les fans misent en un tap, et les créateurs qui les ont amenés touchent un partage on-chain automatique — sans tableaux de bord, sans paiements manuels.", de: "Verwandle jeden Tweet oder Post mit Solana Blinks in eine Wette. Fans setzen mit einem Tipp, und die Creator, die sie gebracht haben, erhalten einen automatischen On-Chain-Anteil — keine Dashboards, keine manuellen Auszahlungen.", zh: "用 Solana Blinks 把任意推文或帖子变成一次下注。球迷一键下注，带来他们的创作者自动获得链上分成——无需后台，无需手动结算。" },
    points: [
      { en: "One-tap betting via Solana Blinks", ru: "Ставки в один тап через Solana Blinks", es: "Apuestas de un toque vía Solana Blinks", pt: "Apostas com um toque via Solana Blinks", fr: "Paris en un tap via Solana Blinks", de: "Ein-Tipp-Wetten über Solana Blinks", zh: "通过 Solana Blinks 一键下注" },
      { en: "Bet straight from a post", ru: "Ставь прямо из поста", es: "Apuesta directo desde una publicación", pt: "Aposte direto de um post", fr: "Pariez directement depuis un post", de: "Wette direkt aus einem Post", zh: "直接从帖子下注" },
      { en: "Automatic 5% creator affiliate split", ru: "Автоматическая 5% партнёрская доля автору", es: "Reparto de afiliado automático del 5% al creador", pt: "Repasse de afiliado automático de 5% ao criador", fr: "Partage d'affiliation automatique de 5% au créateur", de: "Automatischer 5%-Affiliate-Anteil für Creator", zh: "创作者自动获得 5% 联盟分成" },
      { en: "No custody, no middleman", ru: "Без кастодиала, без посредников", es: "Sin custodia, sin intermediarios", pt: "Sem custódia, sem intermediários", fr: "Sans dépôt, sans intermédiaire", de: "Keine Verwahrung, kein Mittelsmann", zh: "无托管，无中间人" },
    ],
    ctaLabel: { en: "Open a Blink", ru: "Открыть Blink", es: "Abrir un Blink", pt: "Abrir um Blink", fr: "Ouvrir un Blink", de: "Blink öffnen", zh: "打开 Blink" },
  },
];

const fadeV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeIn" } },
} as const;

const EYEBROW = { en: "Built for the World Cup Hackathon", ru: "Создано для World Cup Hackathon", es: "Creado para el World Cup Hackathon", pt: "Feito para o World Cup Hackathon", fr: "Conçu pour le World Cup Hackathon", de: "Für den World Cup Hackathon gebaut", zh: "为 World Cup Hackathon 打造" };
const HEADING = { en: "Three tracks. One trustless engine.", ru: "Три трека. Один бездоверительный движок.", es: "Tres tracks. Un motor sin confianza.", pt: "Três tracks. Um motor sem confiança.", fr: "Trois tracks. Un moteur sans confiance.", de: "Drei Tracks. Eine vertrauensfreie Engine.", zh: "三条赛道。一个无信任引擎。" };
const INTRO = { en: "Nyx enters all three tracks of the TxODDS × Solana World Cup. Pick one to see exactly how it fits — the core (zero custody, no admin key, verifiable settlement) is shared across every track. You can switch anytime, here or from the pill at the bottom.", ru: "Nyx участвует во всех трёх треках TxODDS × Solana World Cup. Выбери один, чтобы увидеть, как именно он ложится — ядро (ноль кастодиала, отсутствие админ-ключа, проверяемый расчёт) общее для всех треков. Переключаться можно в любой момент — здесь или через пилюлю внизу.", es: "Nyx participa en los tres tracks del TxODDS × Solana World Cup. Elige uno para ver exactamente cómo encaja: el núcleo (sin custodia, sin clave de admin, liquidación verificable) es común a todos los tracks. Puedes cambiar cuando quieras, aquí o desde la píldora de abajo.", pt: "A Nyx participa dos três tracks do TxODDS × Solana World Cup. Escolha um para ver exatamente como ele se encaixa — o núcleo (sem custódia, sem chave de admin, liquidação verificável) é compartilhado por todos os tracks. Você pode trocar a qualquer momento, aqui ou na pílula lá embaixo.", fr: "Nyx participe aux trois tracks du TxODDS × Solana World Cup. Choisissez-en un pour voir précisément comment il s'y intègre — le cœur (zéro dépôt, pas de clé admin, règlement vérifiable) est commun à tous les tracks. Vous pouvez changer à tout moment, ici ou depuis la pastille en bas.", de: "Nyx tritt in allen drei Tracks des TxODDS × Solana World Cup an. Wähle einen, um genau zu sehen, wie er passt — der Kern (keine Verwahrung, kein Admin-Schlüssel, überprüfbare Abwicklung) ist über alle Tracks hinweg gleich. Du kannst jederzeit wechseln, hier oder über die Pille unten.", zh: "Nyx 参加 TxODDS × Solana World Cup 的全部三条赛道。选择一条，看看它如何贴合——核心（零托管、无管理员密钥、可验证结算）在每条赛道中都是共享的。你可以随时切换，在这里或通过底部的胶囊按钮。" };
const HINT = { en: "↑ Choose a track to see how Nyx delivers it.", ru: "↑ Выбери трек, чтобы увидеть, как Nyx его реализует.", es: "↑ Elige un track para ver cómo lo entrega Nyx.", pt: "↑ Escolha um track para ver como a Nyx o entrega.", fr: "↑ Choisissez un track pour voir comment Nyx le réalise.", de: "↑ Wähle einen Track, um zu sehen, wie Nyx ihn umsetzt.", zh: "↑ 选择一条赛道，看看 Nyx 如何实现它。" };

export default function Tracks() {
  const lang = useLang();
  const [selected, choose] = useTrack();
  const active = TRACKS.find((t) => t.id === selected) || null;

  return (
    <section id="tracks" className="bg-base py-24 text-ink">
      <div className="mx-auto max-w-content px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">{pick(lang, EYEBROW)}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{pick(lang, HEADING)}</h2>
        <p className="mt-4 max-w-2xl text-base text-muted">{pick(lang, INTRO)}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => {
            const isOn = t.id === selected;
            return (
              <button key={t.id} type="button" onClick={() => choose(t.id)} className={"rounded-2xl border p-5 text-left transition " + (isOn ? "border-solana bg-subtle" : "border-hairline bg-subtle hover:border-solana/40")}>
                <div className="text-2xl">{t.emoji}</div>
                <h3 className="mt-3 text-base font-semibold">{pick(lang, t.name)}</h3>
                <p className="mt-1 text-sm text-muted">{pick(lang, t.tagline)}</p>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={active.id} variants={fadeV} initial="hidden" animate="show" exit="exit" className="mt-8 rounded-3xl border border-hairline bg-subtle p-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{active.emoji}</span>
                <div>
                  <h3 className="text-xl font-semibold">{pick(lang, active.name)}</h3>
                  <p className={"text-sm font-medium " + active.accent}>{pick(lang, active.tagline)}</p>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-base text-muted">{pick(lang, active.blurb)}</p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {active.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-solana" />
                    {pick(lang, p)}
                  </li>
                ))}
              </ul>
              <a href={active.ctaHref} target={active.ctaHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-nyx to-solana px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                {pick(lang, active.ctaLabel)} →
              </a>
            </motion.div>
          ) : (
            <motion.p key="hint" variants={fadeV} initial="hidden" animate="show" exit="exit" className="mt-8 text-center text-sm text-muted">
              {pick(lang, HINT)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
