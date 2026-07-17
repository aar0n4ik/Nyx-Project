"use client";

import { useRef, useState } from "react";
import { Cpu, Loader2, ShieldCheck, Sparkles } from "lucide-react";

const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

const PROMPTS = [
  "Two evenly matched football sides meet in a cup final. Walk through how to reason about who covers a -0.5 handicap, and be explicit about what you cannot know.",
  "A prediction market prices 'YES' at 62c. Explain step by step how that should update my own estimate — and where the logic breaks.",
  "I already placed a bet and want to hedge. Reason through when hedging is rational versus when it just locks in the vig.",
];

type Status = "idle" | "loading" | "ready" | "running";

export default function NyxEdge() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [output, setOutput] = useState("");
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const engineRef = useRef<unknown>(null);

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
      setOutput("Local run failed: " + ((e as Error).message || "unknown error"));
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
          A model that runs on your device
        </h2>
        <p className="mt-3 text-muted">
          Real inference in your browser — no server, no API key, no data
          leaving the tab. The model downloads once, then it works offline.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-hairline bg-subtle p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs text-payout">
          <ShieldCheck className="h-3.5 w-3.5" />
          100% on-device · nothing leaves your browser
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPrompt(p)}
              className={
                "rounded-full border px-3 py-1.5 text-xs transition " +
                (prompt === p
                  ? "border-nyx bg-nyx text-white"
                  : "border-hairline text-muted hover:text-ink")
              }
            >
              Scenario {i + 1}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
            ? "Loading model…"
            : status === "running"
              ? "Thinking locally…"
              : "Run on my device"}
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
            This browser has no WebGPU. Open in desktop Chrome or Edge to run the
            model locally — the rest of Nyx works everywhere.
          </div>
        ) : null}
      </div>
    </section>
  );
}
