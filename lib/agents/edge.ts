/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Completion, CompletionArgs, CompletionResult } from "./types";
import { sha256Hex } from "./kvcache";

export function makeEdgeCompletion(engine: any): Completion {
  return async function edgeCompletion(args: CompletionArgs): Promise<CompletionResult> {
    const messages = args.messages.map((m: any) => ({ role: m.role === "tool" ? "user" : m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m) }));
    const stream = await engine.chat.completions.create({ stream: false, temperature: args.temperature ?? 0.2, messages, response_format: args.responseJson ? { type: "json_object" } : undefined });
    const content = stream?.choices?.[0]?.message?.content ?? null;
    return { message: { role: "assistant", content }, provider: "edge" };
  };
}

export async function runEdgeCoT(engine: any, prompt: string): Promise<{ reasoning: string; digestHex: string }> {
  const r = await engine.chat.completions.create({
    stream: false, temperature: 0.3,
    messages: [
      { role: "system", content: "You are Nyx Edge. Reason step-by-step from the given on-chain data, quantify uncertainty, never claim certainty. Output numbered steps then a final line 'DECISION: ...'." },
      { role: "user", content: prompt },
    ],
  });
  const reasoning = r?.choices?.[0]?.message?.content ?? "";
  const digestHex = await sha256Hex(reasoning);
  return { reasoning, digestHex };
}
