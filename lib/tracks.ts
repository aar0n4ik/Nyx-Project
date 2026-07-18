import type { Lang } from "@/lib/i18n";
import type { TrackId } from "@/components/useTrack";

export type Loc = Partial<Record<Lang, string>> & { en: string };

export type TrackMeta = {
  id: TrackId;
  name: Loc;
  eyebrow: Loc;
  headA: Loc;
  accent: Loc;
  headB: Loc;
  sub: Loc;
  signals: Loc[];
  ctaLabel: Loc;
  ctaHref: string;
};

export const TRACK_ORDER: TrackId[] = ["settlement", "agents", "fan"];

export const TRACK_META: Record<TrackId, TrackMeta> = {
  settlement: {
    id: "settlement",
    ctaHref: "#verify",
    name: { en: "Prediction Markets & Settlement", ru: "Прогнозные рынки и расчёт", es: "Mercados de predicción y liquidación", pt: "Mercados de previsão e liquidação", fr: "Marchés de prédiction et règlement", de: "Prognosemärkte & Abwicklung", zh: "预测市场与结算" },
    eyebrow: { en: "Prediction Markets & Settlement", ru: "Прогнозные рынки и расчёт", es: "Mercados de predicción y liquidación", pt: "Mercados de previsão e liquidação", fr: "Marchés de prédiction et règlement", de: "Prognosemärkte & Abwicklung", zh: "预测市场与结算" },
    headA: { en: "Bets you don't have to ", ru: "Ставки, которым не нужно ", es: "Apuestas en las que no tienes que ", pt: "Apostas em que você não precisa ", fr: "Des paris auxquels vous n'avez pas à ", de: "Wetten, denen du nicht ", zh: "无需" },
    accent: { en: "trust", ru: "доверять", es: "confiar", pt: "confiar", fr: "faire confiance", de: "vertrauen", zh: "信任" },
    headB: { en: ".", ru: ".", es: ".", pt: ".", fr: ".", de: " musst.", zh: "的下注。" },
    sub: { en: "Real football markets settled on-chain with no admin key. Outcomes are resolved by an oracle bridge, challenged through staked disputes, and paid out in USD₮ — every step verifiable in an explorer.", ru: "Реальные футбольные рынки рассчитываются ончейн без единого админ-ключа. Исходы определяет оракульный мост, оспариваются через стейк-споры и выплачиваются в USD₮ — каждый шаг можно проверить в эксплорере.", es: "Mercados de fútbol reales liquidados on-chain sin ninguna clave de administrador. Los resultados los resuelve un puente de oráculo, se disputan con stake y se pagan en USD₮: cada paso es verificable en un explorador.", pt: "Mercados de futebol reais liquidados on-chain sem nenhuma chave de administrador. Os resultados são resolvidos por uma ponte de oráculo, contestados com stake e pagos em USD₮ — cada passo é verificável em um explorador.", fr: "De vrais marchés de football réglés on-chain sans aucune clé admin. Les résultats sont résolus par un pont d'oracle, contestés via des litiges avec mise et payés en USD₮ — chaque étape est vérifiable dans un explorateur.", de: "Echte Fußballmärkte, on-chain abgewickelt ohne Admin-Key. Ergebnisse werden von einer Oracle-Bridge aufgelöst, über Staking-Disputes angefochten und in USD₮ ausgezahlt — jeder Schritt im Explorer überprüfbar.", zh: "真实足球市场在链上结算，没有任何管理员密钥。结果由预言机桥解析，通过质押争议进行挑战，并以 USD₮ 支付——每一步都可在区块浏览器中验证。" },
    signals: [
      { en: "No admin key", ru: "Без админ-ключа", es: "Sin clave admin", pt: "Sem chave admin", fr: "Sans clé admin", de: "Kein Admin-Key", zh: "无管理员密钥" },
      { en: "Oracle-bridged resolve", ru: "Расчёт через оракул-мост", es: "Resolución vía oráculo", pt: "Resolução via oráculo", fr: "Résolution via oracle", de: "Oracle-Bridge-Resolve", zh: "预言机桥结算" },
      { en: "USD₮ payouts", ru: "Выплаты в USD₮", es: "Pagos en USD₮", pt: "Pagamentos em USD₮", fr: "Paiements en USD₮", de: "USD₮-Auszahlungen", zh: "USD₮ 赔付" },
    ],
    ctaLabel: { en: "Watch a market settle", ru: "Смотреть расчёт рынка", es: "Ver liquidar un mercado", pt: "Ver um mercado liquidar", fr: "Voir un marché se régler", de: "Marktabwicklung ansehen", zh: "观看市场结算" },
  },
  agents: {
    id: "agents",
    ctaHref: "#edge",
    name: { en: "Trading Tools & Agents", ru: "Торговые инструменты и агенты", es: "Herramientas de trading y agentes", pt: "Ferramentas de trading e agentes", fr: "Outils de trading et agents", de: "Trading-Tools & Agenten", zh: "交易工具与智能体" },
    eyebrow: { en: "Trading Tools & Agents", ru: "Торговые инструменты и агенты", es: "Herramientas de trading y agentes", pt: "Ferramentas de trading e agentes", fr: "Outils de trading et agents", de: "Trading-Tools & Agenten", zh: "交易工具与智能体" },
    headA: { en: "An agent bets. It never holds your ", ru: "Агент ставит. Он не держит твои ", es: "Un agente apuesta. Nunca retiene tus ", pt: "Um agente aposta. Nunca guarda seus ", fr: "Un agent parie. Il ne détient jamais vos ", de: "Ein Agent wettet. Er hält nie deine ", zh: "智能体替你下注，却永不持有你的" },
    accent: { en: "funds", ru: "средства", es: "fondos", pt: "fundos", fr: "fonds", de: "Gelder", zh: "资金" },
    headB: { en: ".", ru: ".", es: ".", pt: ".", fr: ".", de: ".", zh: "。" },
    sub: { en: "Grant a capped, expiring on-chain allowance and let Nyx trade for you. It places bets on your behalf — and the instant it tries to exceed your limit, the transaction reverts. Non-custodial by construction.", ru: "Выдай ограниченное разрешение с истечением прямо ончейн и позволь Nyx торговать за тебя. Он ставит от твоего имени — и как только пытается превысить лимит, транзакция откатывается. Некастодиально по построению.", es: "Otorga una autorización on-chain limitada y con caducidad y deja que Nyx opere por ti. Apuesta en tu nombre y, en cuanto intenta superar tu límite, la transacción se revierte. No custodial por diseño.", pt: "Conceda uma permissão on-chain limitada e com expiração e deixe a Nyx operar por você. Ela aposta em seu nome — e assim que tenta exceder seu limite, a transação é revertida. Não custodial por construção.", fr: "Accordez une autorisation on-chain plafonnée et expirante, et laissez Nyx trader pour vous. Elle parie en votre nom — et dès qu'elle tente de dépasser votre limite, la transaction est annulée. Non-custodial par conception.", de: "Erteile eine begrenzte, ablaufende On-Chain-Freigabe und lass Nyx für dich handeln. Der Agent wettet in deinem Namen — und sobald er dein Limit überschreiten will, wird die Transaktion rückgängig gemacht. Non-custodial per Konstruktion.", zh: "在链上授予一个有上限、会过期的额度，让 Nyx 替你交易。它以你的名义下注——一旦试图超出限额，交易立即回滚。天生非托管。" },
    signals: [
      { en: "Capped allowance", ru: "Лимитированное разрешение", es: "Autorización limitada", pt: "Permissão limitada", fr: "Autorisation plafonnée", de: "Begrenzte Freigabe", zh: "限额授权" },
      { en: "Reverts on overspend", ru: "Откат при перерасходе", es: "Se revierte al exceder", pt: "Reverte ao exceder", fr: "Annule au dépassement", de: "Rückabwicklung bei Überschreitung", zh: "超额即回滚" },
      { en: "You keep your keys", ru: "Ключи остаются у тебя", es: "Conservas tus llaves", pt: "Você mantém suas chaves", fr: "Vous gardez vos clés", de: "Deine Schlüssel bleiben bei dir", zh: "密钥始终在你手中" },
    ],
    ctaLabel: { en: "See the agent on-chain", ru: "Смотреть агента в сети", es: "Ver el agente on-chain", pt: "Ver o agente on-chain", fr: "Voir l'agent on-chain", de: "Agent on-chain ansehen", zh: "在链上查看智能体" },
  },
  fan: {
    id: "fan",
    ctaHref: "#markets",
    name: { en: "Consumer & Fan Experiences", ru: "Потребительский и фан-опыт", es: "Experiencias para consumidores y fans", pt: "Experiências para consumidores e fãs", fr: "Expériences grand public et fans", de: "Consumer- & Fan-Erlebnisse", zh: "消费者与球迷体验" },
    eyebrow: { en: "Consumer & Fan Experiences", ru: "Потребительский и фан-опыт", es: "Experiencias para consumidores y fans", pt: "Experiências para consumidores e fãs", fr: "Expériences grand public et fans", de: "Consumer- & Fan-Erlebnisse", zh: "消费者与球迷体验" },
    headA: { en: "Bet from any post. Creators ", ru: "Ставь из любого поста. Авторы ", es: "Apuesta desde cualquier post. Los creadores ", pt: "Aposte de qualquer post. Os criadores ", fr: "Pariez depuis n'importe quel post. Les créateurs ", de: "Wette aus jedem Post. Creator ", zh: "从任意帖子下注。创作者" },
    accent: { en: "earn automatically", ru: "зарабатывают сами", es: "ganan automáticamente", pt: "ganham automaticamente", fr: "gagnent automatiquement", de: "verdienen automatisch", zh: "自动获得收益" },
    headB: { en: ".", ru: ".", es: ".", pt: ".", fr: ".", de: ".", zh: "。" },
    sub: { en: "Turn any tweet or post into a bet with Solana Blinks. Fans stake in one tap, and the creators who drove them earn an automatic on-chain split — no dashboards, no manual payouts.", ru: "Преврати любой твит или пост в ставку через Solana Blinks. Фанаты ставят в один тап, а приведшие их авторы получают автоматическую ончейн-долю — без дашбордов и ручных выплат.", es: "Convierte cualquier tweet o post en una apuesta con Solana Blinks. Los fans apuestan con un toque y los creadores que los atrajeron ganan un reparto on-chain automático: sin paneles, sin pagos manuales.", pt: "Transforme qualquer tweet ou post em uma aposta com Solana Blinks. Os fãs apostam com um toque e os criadores que os trouxeram ganham um repasse on-chain automático — sem painéis, sem pagamentos manuais.", fr: "Transformez n'importe quel tweet ou post en pari avec Solana Blinks. Les fans misent en un tap, et les créateurs qui les ont amenés touchent un partage on-chain automatique — sans tableaux de bord, sans paiements manuels.", de: "Verwandle jeden Tweet oder Post mit Solana Blinks in eine Wette. Fans setzen mit einem Tipp, und die Creator, die sie gebracht haben, erhalten einen automatischen On-Chain-Anteil — keine Dashboards, keine manuellen Auszahlungen.", zh: "用 Solana Blinks 把任意推文或帖子变成一次下注。球迷一键下注，带来他们的创作者自动获得链上分成——无需后台，无需手动结算。" },
    signals: [
      { en: "One-tap Blinks", ru: "Ставки в один тап", es: "Blinks de un toque", pt: "Blinks com um toque", fr: "Blinks en un tap", de: "Ein-Tipp-Blinks", zh: "一键 Blinks" },
      { en: "Auto creator split", ru: "Авто-доля авторам", es: "Reparto automático", pt: "Repasse automático", fr: "Partage automatique", de: "Auto-Creator-Anteil", zh: "自动创作者分成" },
      { en: "No app install", ru: "Без установки приложения", es: "Sin instalar app", pt: "Sem instalar app", fr: "Sans installer d'appli", de: "Keine App-Installation", zh: "无需安装应用" },
    ],
    ctaLabel: { en: "Try a Blink", ru: "Попробовать Blink", es: "Prueba un Blink", pt: "Experimente um Blink", fr: "Essayez un Blink", de: "Blink ausprobieren", zh: "试试 Blink" },
  },
};
