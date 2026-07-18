/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CompletionArgs, CompletionResult, ToolCall } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.NYX_AGENT_MODEL || "llama-3.3-70b-versatile";

export function makeGroqCompletion(apiKey = process.env.GROQ_API_KEY): (a: CompletionArgs) => Promise<CompletionResult> {
  return async function groqCompletion(args: CompletionArgs): Promise<CompletionResult> {
    if (!apiKey) throw new Error("GROQ_API_KEY missing");
    const body: Record<string, unknown> = {
      model: args.model || DEFAULT_MODEL,
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 900,
      messages: args.messages,
    };
    if (args.tools && args.tools.length) { body.tools = args.tools; body.tool_choice = args.toolChoice || "auto"; }
    if (args.responseJson) body.response_format = { type: "json_object" };
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("groq " + r.status + ": " + (await r.text().catch(() => "")));
    const j: any = await r.json();
    const m = (j && j.choices && j.choices[0] && j.choices[0].message) || { role: "assistant", content: null };
    return {
      message: { role: "assistant", content: m.content ?? null, tool_calls: m.tool_calls as ToolCall[] | undefined },
      usage: j?.usage, provider: "groq",
    };
  };
}

export function safeParse(s: string): any { try { return JSON.parse(s); } catch { return {}; } }

export function parseJsonLoose<T = any>(content: string): T | null {
  if (!content) return null;
  let s = content.trim();
  const a = s.indexOf("{"); const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s) as T; } catch { return null; }
}
