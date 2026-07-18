"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, LineChart, Zap, Sparkles, ExternalLink } from "lucide-react";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION + (BLINK_ACTION.includes("?")?"&":"?") + "cb=" + (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA||"dev"));

type TabId = "live" | "markets" | "bet" | "edge";

const TABS = [
  { id: "live", Icon: Activity },
  { id: "markets", Icon: LineChart },
  { id: "bet", Icon: Zap },
  { id: "edge", Icon: Sparkles },
] as const;

const TAB_LABELS: Record<TabId, L> = {
  live: { en: "Live", ru: "Лайв", es: "En vivo", pt: "Ao vivo", fr: "Direct", de: "Live", zh: "实时" },
  markets: { en: "Markets", ru: "Рынки", es: "Mercados", pt: "Mercados", fr: "Marchés", de: "Märkte", zh: "市场" },
  bet: { en: "Bet", ru: "Ставка", es: "Apostar", pt: "Apostar", fr: "Parier", de: "Wetten", zh: "下注" },
  edge: { en: "Edge", ru: "Edge", es: "Edge", pt: "Edge", fr: "Edge", de: "Edge", zh: "Edge" },
};

const TRACK_COPY: Record<TrackId, { title: string; sub: L }> = {
  settlement: {
    title: "Settlement",
    sub: { en: "No admin key can decide your bet.", ru: "Ни один админ-ключ не решает исход твоей ставки.", es: "Ninguna clave de administrador puede decidir tu apuesta.", pt: "Nenhuma chave de administrador pode decidir sua aposta.", fr: "Aucune clé admin ne peut décider de votre pari.", de: "Kein Admin-Key kann über deine Wette entscheiden.", zh: "没有任何管理员密钥能决定你的下注结果。" },
  },
  agents: {
    title: "Agents",
    sub: { en: "An agent bets for you — it never holds your funds.", ru: "Агент делает ставки за тебя — и никогда не держит твои средства.", es: "Un agente apuesta por ti y nunca retiene tus fondos.", pt: "Um agente aposta por você — e nunca guarda seus fundos.", fr: "Un agent parie pour vous — sans jamais détenir vos fonds.", de: "Ein Agent wettet für dich — und hält nie deine Gelder.", zh: "智能体替你下注——却永远不碰你的资金。" },
  },
  fan: {
    title: "Fan",
    sub: { en: "Bet from any post. Creators earn automatically.", ru: "Делай ставку из любого поста. Авторы зарабатывают автоматически.", es: "Apuesta desde cualquier publicación. Los creadores ganan automáticamente.", pt: "Aposte a partir de qualquer post. Os criadores ganham automaticamente.", fr: "Pariez depuis n'importe quelle publication. Les créateurs gagnent automatiquement.", de: "Wette aus jedem Post. Creator verdienen automatisch.", zh: "从任意帖子下注。创作者自动获得收益。" },
  },
};

const MARKETS: Array<{ q: L; yes: number; vol: string }> = [
  { q: { en: "Brazil to win the World Cup?", ru: "Бразилия выиграет чемпионат мира?", es: "¿Brasil ganará el Mundial?", pt: "O Brasil vai ganhar a Copa do Mundo?", fr: "Le Brésil va-t-il gagner la Coupe du monde ?", de: "Gewinnt Brasilien die Weltmeisterschaft?", zh: "巴西会赢得世界杯吗？" }, yes: 0.41, vol: "128.4K" },
  { q: { en: "Over 2.5 goals — Final?", ru: "Больше 2.5 голов — финал?", es: "¿Más de 2.5 goles — Final?", pt: "Mais de 2,5 gols — Final?", fr: "Plus de 2,5 buts — finale ?", de: "Über 2,5 Tore — Finale?", zh: "决赛进球数超过 2.5 个？" }, yes: 0.57, vol: "84.9K" },
  { q: { en: "Penalty shootout in the Final?", ru: "Серия пенальти в финале?", es: "¿Tanda de penales en la Final?", pt: "Disputa de pênaltis na Final?", fr: "Séance de tirs au but en finale ?", de: "Elfmeterschießen im Finale?", zh: "决赛会进入点球大战吗？" }, yes: 0.23, vol: "31.2K" },
];

const SETTLEMENTS: Array<{ label: L; sig: string }> = [
  { label: { en: "Auto-settled payout", ru: "Автоматическая выплата", es: "Pago liquidado automáticamente", pt: "Pagamento liquidado automaticamente", fr: "Paiement réglé automatiquement", de: "Automatisch abgerechnete Auszahlung", zh: "自动结算的赔付" }, sig: "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy" },
  { label: { en: "Trustless resolve", ru: "Бездоверительное разрешение", es: "Resolución sin confianza", pt: "Resolução sem confiança", fr: "Résolution sans confiance", de: "Vertrauenslose Auflösung", zh: "无信任判定" }, sig: "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev" },
  { label: { en: "Dispute resolved", ru: "Спор разрешён", es: "Disputa resuelta", pt: "Disputa resolvida", fr: "Litige résolu", de: "Streit gelöst", zh: "争议已解决" }, sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ" },
];

const panelTrans = { duration: 0.24, ease: "easeOut" } as const;
const tabSpring = { type: "spring", stiffness: 420, damping: 34 } as const;
const enterV = { opacity: 0, y: 10 } as const;
const centerV = { opacity: 1, y: 0 } as const;
const exitV = { opacity: 0, y: -10 } as const;

function explorer(sig: string) {
  return "https://explorer.solana.com/tx/" + sig + "?cluster=devnet";
}

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 w-full animate-pulse rounded-2xl bg-subtle" />
      <div className="h-16 w-full animate-pulse rounded-2xl bg-subtle" />
      <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-subtle" />
    </div>
  );
}

function LivePanel() {
  const lang = useLang();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-subtle p-4">
          <div className="text-2xl font-semibold text-ink">—</div>
          <div className="text-xs text-muted">{pick(lang, { en: "Settled on-chain", ru: "Рассчитано ончейн", es: "Liquidado on-chain", pt: "Liquidado on-chain", fr: "Réglé on-chain", de: "On-chain abgerechnet", zh: "链上已结算" })}</div>
        </div>
        <div className="rounded-2xl border border-hairline bg-subtle p-4">
          <div className="text-2xl font-semibold text-ink">0</div>
          <div className="text-xs text-muted">{pick(lang, { en: "Admin keys", ru: "Админ-ключей", es: "Claves de administrador", pt: "Chaves de administrador", fr: "Clés admin", de: "Admin-Keys", zh: "管理员密钥" })}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-hairline p-4">
        <div className="mb-3 text-sm font-medium text-ink">{pick(lang, { en: "Recent settlements", ru: "Недавние расчёты", es: "Liquidaciones recientes", pt: "Liquidações recentes", fr: "Règlements récents", de: "Jüngste Abrechnungen", zh: "最近的结算" })}</div>
        <div className="space-y-2">
          {SETTLEMENTS.map((s) => (
            <a
              key={s.sig}
              href={explorer(s.sig)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-subtle px-3 py-2 text-sm text-ink transition hover:opacity-80"
            >
              <span>{pick(lang, s.label)}</span>
              <ExternalLink className="h-4 w-4 text-muted" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketsPanel() {
  const lang = useLang();
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">{pick(lang, { en: "Devnet demo · test USD₮", ru: "Демо в devnet · тестовые USD₮", es: "Demo en devnet · USD₮ de prueba", pt: "Demo na devnet · USD₮ de teste", fr: "Démo devnet · USD₮ de test", de: "Devnet-Demo · Test-USD₮", zh: "Devnet 演示 · 测试 USD₮" })}</div>
      {MARKETS.map((m, i) => (
        <div key={i} className="rounded-2xl border border-hairline p-4">
          <div className="mb-3 text-sm font-medium text-ink">{pick(lang, m.q)}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">{pick(lang, { en: "Vol", ru: "Объём", es: "Vol", pt: "Vol", fr: "Vol", de: "Vol", zh: "成交量" })} {m.vol} USD₮</div>
            <a
              href={BLINK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-nyx px-4 py-1.5 text-sm font-medium text-white"
            >
              {pick(lang, { en: "Yes", ru: "Да", es: "Sí", pt: "Sim", fr: "Oui", de: "Ja", zh: "是" })} {Math.round(m.yes * 100)}¢
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function BetPanel({ track }: { track: TrackId }) {
  const lang = useLang();
  const copy = TRACK_COPY[track];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline p-5">
        <div className="text-lg font-semibold text-ink">{copy.title}</div>
        <div className="mt-1 text-sm text-muted">{pick(lang, copy.sub)}</div>
        <a
          href={BLINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={haptic}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-nyx px-5 py-3 text-base font-semibold text-white"
        >
          <Zap className="h-5 w-5" />
          {pick(lang, { en: "Place a bet", ru: "Сделать ставку", es: "Hacer una apuesta", pt: "Fazer uma aposta", fr: "Placer un pari", de: "Wette platzieren", zh: "下注" })}
        </a>
      </div>
      <div className="rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
        {pick(lang, { en: "Devnet · you sign in your wallet · Nyx never holds your funds.", ru: "Devnet · ты подписываешь в своём кошельке · Nyx никогда не держит твои средства.", es: "Devnet · firmas en tu billetera · Nyx nunca retiene tus fondos.", pt: "Devnet · você assina na sua carteira · a Nyx nunca guarda seus fundos.", fr: "Devnet · vous signez dans votre wallet · Nyx ne détient jamais vos fonds.", de: "Devnet · du signierst in deiner Wallet · Nyx hält nie deine Gelder.", zh: "Devnet · 你在自己的钱包中签名 · Nyx 永不保管你的资金。" })}
      </div>
    </div>
  );
}

function EdgePanel() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Sparkles className="h-5 w-5 text-nyx" />
          Nyx Edge
        </div>
        <p className="mt-2 text-sm text-muted">
          {pick(lang, { en: "On-device AI agent powered by QVAC. Runs locally and privately, works offline, and delegates heavy inference to your own desktop over P2P — the model never blocks startup.", ru: "ИИ-агент на устройстве на базе QVAC. Работает локально и приватно, функционирует офлайн и делегирует тяжёлый инференс твоему собственному компьютеру по P2P — модель никогда не блокирует запуск.", es: "Agente de IA en el dispositivo, impulsado por QVAC. Se ejecuta de forma local y privada, funciona sin conexión y delega la inferencia pesada a tu propio ordenador por P2P: el modelo nunca bloquea el arranque.", pt: "Agente de IA no dispositivo, com tecnologia QVAC. Roda localmente e com privacidade, funciona offline e delega a inferência pesada ao seu próprio computador via P2P — o modelo nunca bloqueia a inicialização.", fr: "Agent IA sur l'appareil, propulsé par QVAC. Il s'exécute localement et en privé, fonctionne hors ligne et délègue l'inférence lourde à votre propre ordinateur en P2P — le modèle ne bloque jamais le démarrage.", de: "KI-Agent auf dem Gerät, angetrieben von QVAC. Läuft lokal und privat, funktioniert offline und delegiert schwere Inferenz per P2P an deinen eigenen Desktop — das Modell blockiert nie den Start.", zh: "由 QVAC 驱动的设备端 AI 智能体。本地私密运行，可离线工作，并通过 P2P 将繁重的推理委托给你自己的电脑——模型永远不会阻塞启动。" })}
        </p>
        <button
          onClick={() => {
            haptic();
            setOpen((v) => !v);
          }}
          className="mt-4 w-full rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink transition hover:bg-subtle"
        >
          {open
            ? pick(lang, { en: "Hide details", ru: "Скрыть детали", es: "Ocultar detalles", pt: "Ocultar detalhes", fr: "Masquer les détails", de: "Details ausblenden", zh: "隐藏详情" })
            : pick(lang, { en: "How it will work", ru: "Как это будет работать", es: "Cómo funcionará", pt: "Como vai funcionar", fr: "Comment ça marchera", de: "Wie es funktionieren wird", zh: "它将如何运作" })}
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.ul
              initial={enterV}
              animate={centerV}
              exit={exitV}
              transition={panelTrans}
              className="mt-4 space-y-2 text-sm text-muted"
            >
              <li>{pick(lang, { en: "· Local Qwen3 agent — private, no data leaves the phone.", ru: "· Локальный агент Qwen3 — приватно, данные не покидают телефон.", es: "· Agente Qwen3 local — privado, ningún dato sale del teléfono.", pt: "· Agente Qwen3 local — privado, nenhum dado sai do telefone.", fr: "· Agent Qwen3 local — privé, aucune donnée ne quitte le téléphone.", de: "· Lokaler Qwen3-Agent — privat, keine Daten verlassen das Telefon.", zh: "· 本地 Qwen3 智能体——私密，数据不离开手机。" })}</li>
              <li>{pick(lang, { en: "· Delegated inference — your PC does the heavy lifting.", ru: "· Делегированный инференс — тяжёлую работу берёт на себя твой ПК.", es: "· Inferencia delegada — tu PC hace el trabajo pesado.", pt: "· Inferência delegada — o seu PC faz o trabalho pesado.", fr: "· Inférence déléguée — votre PC fait le gros du travail.", de: "· Delegierte Inferenz — dein PC übernimmt die schwere Arbeit.", zh: "· 委托推理——繁重的计算由你的电脑完成。" })}</li>
              <li>{pick(lang, { en: "· P2P mesh — markets and receipts spread phone-to-phone offline.", ru: "· P2P-меш — рынки и квитанции расходятся между телефонами офлайн.", es: "· Malla P2P — los mercados y recibos se propagan de teléfono a teléfono sin conexión.", pt: "· Malha P2P — mercados e recibos se espalham de telefone para telefone offline.", fr: "· Maillage P2P — marchés et reçus se propagent de téléphone à téléphone hors ligne.", de: "· P2P-Mesh — Märkte und Belege verbreiten sich offline von Telefon zu Telefon.", zh: "· P2P 网状网络——市场与回执在手机之间离线传播。" })}</li>
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
        {pick(lang, { en: "Ships in the native Nyx Edge companion — not yet enabled in this web build.", ru: "Появится в нативном приложении Nyx Edge — в этой веб-сборке пока не включено.", es: "Llegará en la app nativa Nyx Edge — aún no está habilitado en esta versión web.", pt: "Chega no app nativo Nyx Edge — ainda não habilitado nesta build web.", fr: "Arrive dans l'app native Nyx Edge — pas encore activé dans cette version web.", de: "Kommt in der nativen Nyx-Edge-App — in diesem Web-Build noch nicht aktiviert.", zh: "将在原生 Nyx Edge 应用中推出——本网页版本尚未启用。" })}
      </div>
    </div>
  );
}

export default function AppShell() {
  const lang = useLang();
  const [trackId] = useTrack();
  const track: TrackId = trackId ?? "settlement";
  const [tab, setTab] = useState<TabId>("live");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 520);
    return () => clearTimeout(t);
  }, []);

  const selectTab = (id: TabId) => {
    haptic();
    setTab(id);
  };

  const renderPanel = () => {
    if (!ready) return <Skeleton />;
    if (tab === "live") return <LivePanel />;
    if (tab === "markets") return <MarketsPanel />;
    if (tab === "bet") return <BetPanel track={track} />;
    return <EdgePanel />;
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-base text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-base/80 px-5 py-4 backdrop-blur">
        <span className="text-lg font-semibold tracking-tight">Nyx</span>
        <span className="rounded-full border border-hairline px-2.5 py-1 text-xs text-muted">
          Devnet
        </span>
      </header>

      <main className="flex-1 px-5 py-5 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + String(ready)}
            initial={enterV}
            animate={centerV}
            exit={exitV}
            transition={panelTrans}
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t border-hairline bg-base/90 px-2 py-2 backdrop-blur">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.Icon;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2"
            >
              {active ? (
                <motion.span
                  layoutId="nyx-app-tab"
                  transition={tabSpring}
                  className="absolute inset-0 rounded-xl bg-subtle"
                />
              ) : null}
              <Icon
                className={
                  "relative h-5 w-5 " + (active ? "text-nyx" : "text-muted")
                }
              />
              <span
                className={
                  "relative text-[11px] " + (active ? "text-ink" : "text-muted")
                }
              >
                {pick(lang, TAB_LABELS[t.id])}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
