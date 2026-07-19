"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

type L = Record<Lang, string>;

const PROMPTS: L[] = [
  {
    en: "Spain vs Argentina in the final. How should I think about who is more likely to win, and what can a model like you not actually know?",
    ru: "Финал Испания - Аргентина. Как рассуждать о том, кто вероятнее победит, и чего ты как модель на самом деле знать не можешь?",
    es: "Final Espana vs Argentina. Como pensar en quien tiene mas probabilidades de ganar, y que no puedes saber realmente como modelo?",
    pt: "Final Espanha vs Argentina. Como pensar sobre quem tem mais chance de vencer, e o que voce, como modelo, nao pode saber?",
    fr: "Finale Espagne - Argentine. Comment raisonner sur qui a le plus de chances de gagner, et que ne peux-tu pas vraiment savoir en tant que modele ?",
    de: "Finale Spanien gegen Argentinien. Wie denke ich darueber nach, wer eher gewinnt, und was kannst du als Modell wirklich nicht wissen?",
    zh: "西班牙对阵阿根廷的决赛。我该如何判断谁更可能获胜，而作为模型你其实无法知道什么？",
  },
  {
    en: "The market says there is a 62% chance of YES. In plain terms, how should that change my own guess?",
    ru: "Рынок говорит, что шанс YES - 62%. Простыми словами: как это должно поменять мою собственную оценку?",
    es: "El mercado dice 62% de probabilidad de SI. En terminos simples, como deberia cambiar eso mi estimacion?",
    pt: "O mercado diz 62% de chance de SIM. Em termos simples, como isso deve mudar meu palpite?",
    fr: "Le marche dit 62% de chances que ce soit OUI. Simplement, comment cela doit-il changer mon estimation ?",
    de: "Der Markt sagt 62% Chance fuer JA. Einfach gesagt: Wie sollte das meine Einschaetzung veraendern?",
    zh: "市场认为 YES 的概率是 62%。用通俗的话说，这该如何改变我自己的判断？",
  },
  {
    en: "I already placed a bet. When does it make sense to hedge it, and when is hedging just a waste of money?",
    ru: "Я уже сделал ставку. Когда есть смысл её хеджировать, а когда хедж - это просто пустая трата денег?",
    es: "Ya hice una apuesta. Cuando tiene sentido cubrirla, y cuando cubrirse es tirar el dinero?",
    pt: "Ja fiz uma aposta. Quando faz sentido fazer hedge, e quando o hedge e so desperdicio?",
    fr: "J'ai deja place un pari. Quand est-il logique de le couvrir, et quand n'est-ce qu'un gaspillage ?",
    de: "Ich habe bereits eine Wette platziert. Wann ist Hedging sinnvoll und wann nur Geldverschwendung?",
    zh: "我已经下了一注。什么时候对冲才有意义，什么时候只是在浪费钱？",
  },
];

type Status = "idle" | "loading" | "ready" | "running";

function formatOutput(raw: string): string {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

export default function NyxEdge() {
  const lang = useLang();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [output, setOutput] = useState("");
  const [sel, setSel] = useState(0);
  const [prompt, setPrompt] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);

  useEffect(() => {
    if (sel >= 0) setPrompt(pick(lang, PROMPTS[sel]));
  }, [lang, sel]);

  const ensureEngine = async () => {
    if (engineRef.current) return engineRef.current;
    const webllm = await import("@mlc-ai/web-llm");
    const engine = new webllm.MLCEngine({
      initProgressCallback: (p: { text: string }) => setProgress(p.text),
    });
    await engine.reload(MODEL);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine: any = await ensureEngine();
      setStatus("running");
      const stream = await engine.chat.completions.create({
        stream: true,
        temperature: 0.4,
        top_p: 0.9,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are Nyx Edge, a prediction copilot running fully on the user's device with no live data. " +
              "Reply in the same language as the user. " +
              "Answer in at most 120 words of plain conversational text. " +
              "Do NOT use markdown, asterisks, bold, headings, or numbered/bulleted lists. " +
              "Lead with a direct take in 1-2 sentences, then add one short sentence naming the single biggest thing you cannot know. " +
              "Never invent stats and never claim certainty about a real outcome.",
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
      engineRef.current = null;
      setOutput(
        pick(lang, {
          en: "Local run failed: ",
          ru: "Локальный запуск не удался: ",
          es: "La ejecución local falló: ",
          pt: "A execução local falhou: ",
          fr: "L'exécution locale a échoué : ",
          de: "Lokaler Lauf fehlgeschlagen: ",
          zh: "本地运行失败：",
        }) + ((e as Error).message || "unknown error"),
      );
      setStatus("ready");
    }
  };

  const busy = status === "loading" || status === "running";

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-hairline bg-base p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-nyx">
          <Cpu className="h-4 w-4" />
          Nyx Edge · WebGPU
        </div>

        <h3 className="mt-3 text-2xl font-bold text-ink">
          {pick(lang, {
            en: "A model that runs on your device",
            ru: "Модель, работающая прямо на твоём устройстве",
            es: "Un modelo que corre en tu dispositivo",
            pt: "Um modelo que roda no seu dispositivo",
            fr: "Un modèle qui tourne sur votre appareil",
            de: "Ein Modell, das auf deinem Gerät läuft",
            zh: "一个在你设备上运行的模型",
          })}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          {pick(lang, {
            en: "Real inference in your browser — no server, no API key, no data leaving the tab. The model downloads once, then it works offline.",
            ru: "Настоящий инференс прямо в браузере — без сервера, без API-ключа, без данных, покидающих вкладку. Модель скачивается один раз и дальше работает офлайн.",
            es: "Inferencia real en tu navegador: sin servidor, sin clave de API, sin datos que salgan de la pestaña. El modelo se descarga una vez y luego funciona sin conexión.",
            pt: "Inferência real no seu navegador — sem servidor, sem chave de API, sem dados saindo da aba. O modelo é baixado uma vez e depois funciona offline.",
            fr: "Une inférence réelle dans votre navigateur — sans serveur, sans clé API, sans données quittant l'onglet. Le modèle se télécharge une fois, puis fonctionne hors ligne.",
            de: "Echte Inferenz in deinem Browser — kein Server, kein API-Key, keine Daten, die den Tab verlassen. Das Modell wird einmal geladen und funktioniert dann offline.",
            zh: "真正的推理就在你的浏览器里——无服务器、无 API 密钥、数据不离开标签页。模型只需下载一次，之后即可离线运行。",
          })}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-nyx" />
          {pick(lang, {
            en: "100% on-device · nothing leaves your browser",
            ru: "100% на устройстве · ничего не покидает браузер",
            es: "100% en el dispositivo · nada sale de tu navegador",
            pt: "100% no dispositivo · nada sai do seu navegador",
            fr: "100% sur l'appareil · rien ne quitte votre navigateur",
            de: "100% auf dem Gerät · nichts verlässt deinen Browser",
            zh: "100% 本地运行 · 任何数据都不离开你的浏览器",
          })}
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
              {pick(lang, {
                en: "Scenario",
                ru: "Сценарий",
                es: "Escenario",
                pt: "Cenário",
                fr: "Scénario",
                de: "Szenario",
                zh: "场景",
              })}{" "}
              {i + 1}
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
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-nyx px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {status === "loading"
            ? pick(lang, {
                en: "Loading model…",
                ru: "Загрузка модели…",
                es: "Cargando modelo…",
                pt: "Carregando modelo…",
                fr: "Chargement du modèle…",
                de: "Modell wird geladen…",
                zh: "正在加载模型…",
              })
            : status === "running"
              ? pick(lang, {
                  en: "Thinking locally…",
                  ru: "Думаю локально…",
                  es: "Pensando localmente…",
                  pt: "Pensando localmente…",
                  fr: "Réflexion en local…",
                  de: "Denke lokal…",
                  zh: "正在本地思考…",
                })
              : pick(lang, {
                  en: "Run on my device",
                  ru: "Запустить на моём устройстве",
                  es: "Ejecutar en mi dispositivo",
                  pt: "Rodar no meu dispositivo",
                  fr: "Lancer sur mon appareil",
                  de: "Auf meinem Gerät ausführen",
                  zh: "在我的设备上运行",
                })}
        </button>

        {status === "loading" && progress ? (
          <p className="mt-3 font-mono text-xs text-muted">{progress}</p>
        ) : null}

        {output ? (
          <div
            className="mt-4 whitespace-pre-wrap rounded-xl border border-hairline bg-subtle px-4 py-3 text-sm leading-relaxed text-ink"
            dangerouslySetInnerHTML={{ __html: formatOutput(output) }}
          />
        ) : null}

        {supported === false ? (
          <p className="mt-3 text-xs text-muted">
            {pick(lang, {
              en: "This browser has no WebGPU. Open in desktop Chrome or Edge to run the model locally — the rest of Nyx works everywhere.",
              ru: "В этом браузере нет WebGPU. Открой в десктопном Chrome или Edge, чтобы запустить модель локально — остальной Nyx работает везде.",
              es: "Este navegador no tiene WebGPU. Ábrelo en Chrome o Edge de escritorio para ejecutar el modelo localmente; el resto de Nyx funciona en todas partes.",
              pt: "Este navegador não tem WebGPU. Abra no Chrome ou Edge de desktop para rodar o modelo localmente — o resto do Nyx funciona em qualquer lugar.",
              fr: "Ce navigateur n'a pas de WebGPU. Ouvrez-le dans Chrome ou Edge sur ordinateur pour exécuter le modèle en local — le reste de Nyx fonctionne partout.",
              de: "Dieser Browser hat kein WebGPU. Öffne ihn in Desktop-Chrome oder -Edge, um das Modell lokal auszuführen — der Rest von Nyx funktioniert überall.",
              zh: "此浏览器不支持 WebGPU。请在桌面版 Chrome 或 Edge 中打开以在本地运行模型——Nyx 的其余部分在任何地方都能用。",
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
