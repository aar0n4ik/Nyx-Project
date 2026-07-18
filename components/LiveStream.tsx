"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ExternalLink } from "lucide-react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const WS_DEVNET = "wss://api.devnet.solana.com";

type L = Record<Lang, string>;
type Prog = { id: string; label: L };

const PROGRAMS: Prog[] = [
  { id: "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3", label: { en: "Settlement", ru: "Расчёты", es: "Liquidación", pt: "Liquidação", fr: "Règlement", de: "Settlement", zh: "结算" } },
  { id: "8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3", label: { en: "pAMM", ru: "pAMM", es: "pAMM", pt: "pAMM", fr: "pAMM", de: "pAMM", zh: "pAMM" } },
  { id: "BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk", label: { en: "Oracle bridge", ru: "Оракул-мост", es: "Puente de oráculo", pt: "Ponte de oráculo", fr: "Pont oracle", de: "Oracle-Bridge", zh: "预言机桥" } },
];

type Status = "connecting" | "live" | "closed" | "error";

const STATUS: Record<Status, L> = {
  connecting: { en: "connecting", ru: "подключение", es: "conectando", pt: "conectando", fr: "connexion", de: "verbinde…", zh: "连接中" },
  live: { en: "live", ru: "в эфире", es: "en vivo", pt: "ao vivo", fr: "en direct", de: "live", zh: "实时" },
  closed: { en: "closed", ru: "закрыто", es: "cerrado", pt: "fechado", fr: "fermé", de: "geschlossen", zh: "已关闭" },
  error: { en: "error", ru: "ошибка", es: "error", pt: "erro", fr: "erreur", de: "Fehler", zh: "错误" },
};

type Evt = {
  sig: string;
  err: boolean;
  line: string;
  at: number;
};

const itemHidden = { opacity: 0, x: -12 } as const;
const itemShown = { opacity: 1, x: 0 } as const;
const itemTrans = { duration: 0.2, ease: "easeOut" } as const;

function shorten(s: string) {
  if (s.length <= 14) return s;
  return s.slice(0, 7) + "…" + s.slice(-7);
}

function pickLine(logs: string[]) {
  for (const l of logs) if (l.indexOf("Instruction:") >= 0) return l.trim();
  for (const l of logs) if (l.indexOf("Program log:") >= 0) return l.trim();
  return (logs[0] || "").trim();
}

export default function LiveStream() {
  const lang = useLang();
  const [prog, setProg] = useState<Prog>(PROGRAMS[0]);
  const [status, setStatus] = useState<Status>("connecting");
  const [events, setEvents] = useState<Evt[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    setEvents([]);
    setStatus("connecting");

    const connect = () => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_DEVNET);
      } catch (e) {
        setStatus("error");
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("live");
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "logsSubscribe",
            params: [
              { mentions: [prog.id] },
              { commitment: "confirmed" },
            ],
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            method?: string;
            params?: {
              result?: {
                value?: { signature?: string; err?: unknown; logs?: string[] };
              };
            };
          };
          if (msg.method !== "logsNotification") return;
          const v = msg.params?.result?.value;
          if (!v || !v.signature) return;
          const evt: Evt = {
            sig: v.signature,
            err: v.err != null,
            line: pickLine(v.logs || []),
            at: Date.now(),
          };
          setEvents((prev) => {
            if (prev.length && prev[0].sig === evt.sig) return prev;
            return [evt, ...prev].slice(0, 40);
          });
        } catch (e) {
          // ignore malformed frame
        }
      };

      ws.onerror = () => setStatus("error");

      ws.onclose = () => {
        if (closedByUs) return;
        setStatus("closed");
        retry = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (retry) clearTimeout(retry);
      if (wsRef.current) wsRef.current.close();
    };
  }, [prog]);

  const dot =
    status === "live"
      ? "bg-payout"
      : status === "connecting"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <section id="stream" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <Radio className="h-3.5 w-3.5 text-verify" />
          {pick(lang, { en: "Live WebSocket · logsSubscribe", ru: "Живой WebSocket · logsSubscribe", es: "WebSocket en vivo · logsSubscribe", pt: "WebSocket ao vivo · logsSubscribe", fr: "WebSocket en direct · logsSubscribe", de: "Live-WebSocket · logsSubscribe", zh: "实时 WebSocket · logsSubscribe" })}
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {pick(lang, { en: "On-chain events, as they land", ru: "Ончейн-события в момент появления", es: "Eventos on-chain, en cuanto ocurren", pt: "Eventos on-chain, assim que acontecem", fr: "Événements on-chain, dès qu'ils arrivent", de: "On-Chain-Events, sobald sie eintreffen", zh: "链上事件，实时到达" })}
        </h2>
        <p className="mt-3 text-muted">
          {pick(lang, { en: "A real subscription to Solana devnet. Every confirmed transaction that touches the program streams straight into this panel — no polling, no middleman. Quiet periods mean the chain is quiet.", ru: "Настоящая подписка на Solana devnet. Каждая подтверждённая транзакция, затрагивающая программу, попадает прямо в эту панель — без опроса и посредников. Тишина здесь означает тишину в сети.", es: "Una suscripción real a Solana devnet. Cada transacción confirmada que toca el programa llega directo a este panel: sin sondeo, sin intermediarios. Los periodos de silencio significan que la cadena está tranquila.", pt: "Uma inscrição real na Solana devnet. Cada transação confirmada que toca o programa chega direto a este painel — sem polling, sem intermediário. Períodos de silêncio significam que a rede está calma.", fr: "Un véritable abonnement à Solana devnet. Chaque transaction confirmée touchant le programme arrive directement dans ce panneau — sans polling, sans intermédiaire. Les périodes calmes signifient que la chaîne est calme.", de: "Ein echtes Abo auf Solana devnet. Jede bestätigte Transaktion, die das Programm berührt, landet direkt in diesem Panel — kein Polling, kein Mittelsmann. Ruhige Phasen bedeuten, dass die Chain ruhig ist.", zh: "对 Solana devnet 的真实订阅。每一笔触及该程序的已确认交易都会直接推送到此面板——无轮询、无中间人。安静时段说明链上本就安静。" })}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {PROGRAMS.map((p) => {
            const active = p.id === prog.id;
            return (
              <button
                key={p.id}
                onClick={() => setProg(p)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs transition " +
                  (active
                    ? "border-nyx bg-nyx text-white"
                    : "border-hairline text-muted hover:text-ink")
                }
              >
                {pick(lang, p.label)}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted">
            <span className={"h-2 w-2 rounded-full " + dot} />
            {pick(lang, STATUS[status])}
          </div>
        </div>

        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <span className={"h-2 w-2 animate-pulse rounded-full " + dot} />
              {pick(lang, { en: "Listening for on-chain activity…", ru: "Ждём ончейн-активность…", es: "Escuchando actividad on-chain…", pt: "Ouvindo atividade on-chain…", fr: "À l'écoute de l'activité on-chain…", de: "Warte auf On-Chain-Aktivität…", zh: "正在监听链上活动…" })}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {events.map((e) => (
                <motion.div
                  key={e.sig + String(e.at)}
                  initial={itemHidden}
                  animate={itemShown}
                  exit={itemHidden}
                  transition={itemTrans}
                  className="rounded-xl border border-hairline bg-base px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "rounded px-1.5 py-0.5 text-[10px] font-medium " +
                        (e.err
                          ? "bg-red-500/10 text-red-500"
                          : "bg-payout/10 text-payout")
                      }
                    >
                      {e.err
                        ? pick(lang, { en: "reverted", ru: "откат", es: "revertido", pt: "revertido", fr: "annulée", de: "zurückgesetzt", zh: "已回滚" })
                        : pick(lang, { en: "confirmed", ru: "подтверждено", es: "confirmado", pt: "confirmado", fr: "confirmée", de: "bestätigt", zh: "已确认" })}
                    </span>
                    <a
                      href={
                        "https://explorer.solana.com/tx/" +
                        e.sig +
                        "?cluster=devnet"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs text-verify hover:underline"
                    >
                      {shorten(e.sig)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="ml-auto font-mono text-[11px] text-muted">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>
                  </div>
                  {e.line ? (
                    <div className="mt-1 truncate font-mono text-[11px] text-muted">
                      {e.line}
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
