/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeGroqCompletion } from "@/lib/agents/llm";
import { runPipeline } from "@/lib/agents/orchestrator";
import type { RunInput } from "@/lib/agents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const body: any = await req.json().catch(() => ({}));
  const input: RunInput = {
    sessionId: String(body.sessionId || Date.now()),
    account: String(body.account || ""),
    fixtureId: String(body.fixtureId || "88008802"),
    market: String(body.market || "ou25"),
    cryptoSymbol: body.cryptoSymbol ? String(body.cryptoSymbol) : undefined,
    desiredStake: Number(body.desiredStake || 25),
    allowanceRemaining: Number(body.allowanceRemaining || 100),
    execMode: body.execMode === "delegated" ? "delegated" : "unsigned",
    lang: body.lang || "en",
    persona: body.persona ? String(body.persona) : undefined,
    riskAppetite: body.riskAppetite != null ? Number(body.riskAppetite) : undefined,
    oracleTrust: body.oracleTrust != null ? Number(body.oracleTrust) : undefined,
  };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: any) => { try { controller.enqueue(enc.encode("data: " + JSON.stringify(e) + "\n\n")); } catch { /* closed */ } };
      try {
        if (!input.account) { emit({ type: "error", message: "Missing 'account'" }); controller.close(); return; }
        const llm = makeGroqCompletion();
        const result = await runPipeline(input, { emit }, llm, origin);
        emit({ type: "done", result });
      } catch (e: any) { emit({ type: "error", message: String((e && e.message) || e) }); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
