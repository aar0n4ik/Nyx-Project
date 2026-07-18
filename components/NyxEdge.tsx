"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

type L = Record<Lang, string>;

const PROMPTS: L[] = [
  { en: "Two evenly matched football sides meet in a cup final. Walk through how to reason about who covers a -0.5 handicap, and be explicit about what you cannot know.", ru: "Две равные футбольные команды встречаются в финале кубка. Разбери по шагам, как рассуждать о том, кто закроет гандикап -0.5, и честно скажи, чего ты знать не можешь.", es: "Dos equipos de fútbol parejos se enfrentan en una final de copa. Explica paso a paso cómo razonar sobre quién cubre un hándicap de -0.5, y sé explícito sobre lo que no puedes saber.", pt: "Dois times de futebol equilibrados se enfrentam numa final de copa. Explique passo a passo como raciocinar sobre quem cobre um handicap de -0.5, e seja explícito sobre o que você não pode saber.", fr: "Deux équipes de football de niveau égal s'affrontent en finale de coupe. Explique étape par étape comment raisonner sur qui couvre un handicap de -0.5, et sois explicite sur ce que tu ne peux pas savoir.", de: "Zwei gleich starke Fußballmannschaften treffen im Pokalfinale aufeinander. Erkläre Schritt für Schritt, wie man abschätzt, wer ein -0.5-Handicap deckt, und sage klar, was du nicht wissen kannst.", zh: "两支实力相当的足球队在杯赛决赛相遇。请一步步说明如何判断谁能打出 -0.5 让球盘，并明确指出哪些是你无法得知的。" },
  { en: "A prediction market prices 'YES' at 62c. Explain step by step how that should update my own estimate — and where the logic breaks.", ru: "Рынок предсказаний оценивает «YES» в 62 цента. Объясни по шагам, как это должно обновить мою собственную оценку — и где логика ломается.", es: "Un mercado de predicción cotiza 'YES' a 62c. Explica paso a paso cómo eso debería actualizar mi propia estimación, y dónde falla la lógica.", pt: "Um mercado de previsão precifica 'YES' a 62c. Explique passo a passo como isso deve atualizar minha própria estimativa — e onde a lógica falha.", fr: "Un marché de prédiction cote 'YES' à 62c. Explique étape par étape comment cela devrait mettre à jour ma propre estimation — et où la logique se brise.", de: "Ein Vorhersagemarkt bepreist 'YES' mit 62 Cent. Erkläre Schritt für Schritt, wie das meine eigene Schätzung aktualisieren sollte — und wo die Logik bricht.", zh: "某预测市场把 'YES' 定价为 62 美分。请一步步说明这应如何更新我自己的估计——以及逻辑在哪里会失效。" },
  { en: "I already placed a bet and want to hedge. Reason through when hedging is rational versus when it just locks in the vig.", ru: "Я уже сделал ставку и хочу захеджироваться. Разбери, когда хеджирование рационально, а когда оно просто фиксирует маржу букмекера (vig).", es: "Ya hice una apuesta y quiero cubrirme. Razona cuándo cubrirse es racional frente a cuándo solo fija el vig (margen de la casa).", pt: "Já fiz uma aposta e quero fazer hedge. Raciocine quando o hedge é racional versus quando ele apenas trava o vig (margem da casa).", fr: "J'ai déjà placé un pari et je veux me couvrir. Explique quand se couvrir est rationnel par rapport à quand cela ne fait que verrouiller le vig (marge du bookmaker).", de: "Ich habe bereits eine Wette platziert und möchte hedgen. Erläutere, wann Hedging rational ist und wann es nur den Vig (Buchmacher-Marge) festschreibt.", zh: "我已经下了一注，想做对冲。请分析什么时候对冲是理性的，什么时候只是把 vig（庄家抽水）锁死。" },
];

type Status = "idle" | "loading" | "ready" | "running";

export default function NyxEdge() {
  const lang = useLang();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [output, setOutput] = useState("");
  const [sel, setSel] = useState(0);
  const [prompt, setPrompt] = useState("");
  const engineRef = useRef<unknown>(null);

  useEffect(() => {
    if (sel >= 0) setPrompt(pick(lang, PROMPTS[sel]));
  }, [lang, sel]);

  const ensureEngine = async () => {
    if (engineRef.current) return engineRef.current;
    const webllm = await import("@mlc-ai/web-llm");
    const engine = await webllm.CreateMLCEngine(MODEL, {
      initProgressCallback: (p: { text: string }) => setProgress(p.text),
    });
    engineRef.current = engine;
    return engine;
  };

  const run = async () => {
    const gpu = (navigator as unknown as { gpu?: unknown }).gpu;
    if (!gpu) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setOutput("");
    try {
      setStatus("loading");
      const engine = (await ensureEngine()) as {
        chat: {
          completions: {
            create: (a: unknown) => Promise<
              AsyncIterable<{
                choices?: Array<{ delta?: { content?: string } }>;
              }>
            >;
          };
        };
      };
      setStatus("running");
      const stream = await engine.chat.completions.create({
        stream: true,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are Nyx Edge, a prediction assistant running fully on the user's device. You have no live data. Reason transparently, quantify uncertainty, and never claim certainty about real outcomes.",
          },
          { role: "user", content: prompt },
        ],
      });
      for await (const chunk of stream) {
        const delta = chunk?.choices?.[0]?.delta?.content || "";
        if (delta) setOutput((prev) => prev + delta);
      }
      setStatus("ready");
    } catch (e) {
      setOutput(pick(lang, { en: "Local run failed: ", ru: "Локальный запуск не удался: ", es: "La ejecución local falló: ", pt: "A execução local falhou: ", fr: "L'exécution locale a échoué : ", de: "Lokaler Lauf fehlgeschlagen: ", zh: "本地运行失败：" }) + ((e as Error).message || "unknown error"));
      setStatus("ready");
    }
  };

  const busy = status === "loading" || status === "running";

  return (
    <section id="edge" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <Cpu className="h-3.5 w-3.5 text-nyx" />
          Nyx Edge · WebGPU
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {pick(lang, { en: "A model that runs on your device", ru: "Модель, работающая прямо на твоём устройстве", es: "Un modelo que corre en tu dispositivo", pt: "Um modelo que roda no seu dispositivo", fr: "Un modèle qui tourne sur votre appareil", de: "Ein Modell, das auf deinem Gerät läuft", zh: "一个在你设备上运行的模型" })}
        </h2>
        <p className="mt-3 text-muted">
          {pick(lang, { en: "Real inference in your browser — no server, no API key, no data leaving the tab. The model downloads once, then it works offline.", ru: "Настоящий инференс прямо в браузере — без сервера, без API-ключа, без данных, покидающих вкладку. Модель скачивается один раз и дальше работает офлайн.", es: "Inferencia real en tu navegador: sin servidor, sin clave de API, sin datos que salgan de la pestaña. El modelo se descarga una vez y luego funciona sin conexión.", pt: "Inferência real no seu navegador — sem servidor, sem chave de API, sem dados saindo da aba. O modelo é baixado uma vez e depois funciona offline.", fr: "Une inférence réelle dans votre navigateur — sans serveur, sans clé API, sans données quittant l'onglet. Le modèle se télécharge une fois, puis fonctionne hors ligne.", de: "Echte Inferenz in deinem Browser — kein Server, kein API-Key, keine Daten, die den Tab verlassen. Das Modell wird einmal geladen und funktioniert dann offline.", zh: "真正的推理就在你的浏览器里——无服务器、无 API 密钥、数据不离开标签页。模型只需下载一次，之后即可离线运行。" })}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-payout">
          <ShieldCheck className="h-3.5 w-3.5" />
          {pick(lang, { en: "100% on-device · nothing leaves your browser", ru: "100% на устройстве · ничего не покидает браузер", es: "100% en el dispositivo · nada sale de tu navegador", pt: "100% no dispositivo · nada sai do seu navegador", fr: "100% sur l'appareil · rien ne quitte votre navigateur", de: "100% auf dem Gerät · nichts verlässt deinen Browser", zh: "100% 本地运行 · 任何数据都不离开你的浏览器" })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setSel(i)}
              className={
                "rounded-full border px-3 py-1.5 text-xs transition " +
                (sel === i
                  ? "border-nyx bg-nyx text-white"
                  : "border-hairline text-muted hover:text-ink")
              }
            >
              {pick(lang, { en: "Scenario", ru: "Сценарий", es: "Escenario", pt: "Cenário", fr: "Scénario", de: "Szenario", zh: "场景" })} {i + 1}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => {
            setSel(-1);
            setPrompt(e.target.value);
          }}
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-hairline bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-nyx"
        />

        <button
          onClick={run}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-nyx px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {status === "loading"
            ? pick(lang, { en: "Loading model…", ru: "Загрузка модели…", es: "Cargando modelo…", pt: "Carregando modelo…", fr: "Chargement du modèle…", de: "Modell wird geladen…", zh: "正在加载模型…" })
            : status === "running"
              ? pick(lang, { en: "Thinking locally…", ru: "Думаю локально…", es: "Pensando localmente…", pt: "Pensando localmente…", fr: "Réflexion en local…", de: "Denke lokal…", zh: "正在本地思考…" })
              : pick(lang, { en: "Run on my device", ru: "Запустить на моём устройстве", es: "Ejecutar en mi dispositivo", pt: "Rodar no meu dispositivo", fr: "Lancer sur mon appareil", de: "Auf meinem Gerät ausführen", zh: "在我的设备上运行" })}
        </button>

        {status === "loading" && progress ? (
          <div className="mt-3 truncate font-mono text-[11px] text-muted">
            {progress}
          </div>
        ) : null}

        {output ? (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-hairline bg-base px-4 py-3 text-sm leading-relaxed text-ink">
            {output}
          </div>
        ) : null}

        {supported === false ? (
          <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            {pick(lang, { en: "This browser has no WebGPU. Open in desktop Chrome or Edge to run the model locally — the rest of Nyx works everywhere.", ru: "В этом браузере нет WebGPU. Открой в десктопном Chrome или Edge, чтобы запустить модель локально — остальной Nyx работает везде.", es: "Este navegador no tiene WebGPU. Ábrelo en Chrome o Edge de escritorio para ejecutar el modelo localmente; el resto de Nyx funciona en todas partes.", pt: "Este navegador não tem WebGPU. Abra no Chrome ou Edge de desktop para rodar o modelo localmente — o resto do Nyx funciona em qualquer lugar.", fr: "Ce navigateur n'a pas de WebGPU. Ouvrez-le dans Chrome ou Edge sur ordinateur pour exécuter le modèle en local — le reste de Nyx fonctionne partout.", de: "Dieser Browser hat kein WebGPU. Öffne ihn in Desktop-Chrome oder -Edge, um das Modell lokal auszuführen — der Rest von Nyx funktioniert überall.", zh: "此浏览器不支持 WebGPU。请在桌面版 Chrome 或 Edge 中打开以在本地运行模型——Nyx 的其余部分在任何地方都能用。" })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
