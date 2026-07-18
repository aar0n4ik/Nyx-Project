/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Completion, Msg } from "./types";

export async function sha256Hex(input: string): Promise<string> {
  const g: any = globalThis as any;
  if (g.crypto && g.crypto.subtle) {
    const buf = await g.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("crypto");
  return createHash("sha256").update(input).digest("hex");
}

export type CoTKind = "observe" | "reason" | "tool_call" | "tool_result" | "decision" | "verdict";
export type CoTNode = { id: number; parent: number | null; agent: string; kind: CoTKind; label: string; data?: any; ts: number };

export class CoTLog {
  private nodes: CoTNode[] = [];
  private seq = 0;
  constructor(public sessionId: string) {}
  add(agent: string, kind: CoTKind, label: string, data?: any, parent: number | null = null): number {
    const id = ++this.seq; this.nodes.push({ id, parent, agent, kind, label, data, ts: Date.now() }); return id;
  }
  observe(a: string, l: string, d?: any) { return this.add(a, "observe", l, d); }
  reason(a: string, l: string, d?: any) { return this.add(a, "reason", l, d); }
  decision(l: string, d?: any) { return this.add("orchestrator", "decision", l, d); }
  verdict(l: string, d?: any) { return this.add("B", "verdict", l, d); }
  export(): CoTNode[] { return this.nodes; }
  canonical(): string { return JSON.stringify(this.nodes.map((n) => [n.id, n.parent, n.agent, n.kind, n.label, n.data ?? null])); }
  digestHex(): Promise<string> { return sha256Hex(this.canonical()); }
}

export class KvSession {
  prefixHandle?: string;
  private memo = new Map<string, { at: number; value: any }>();
  private board: Record<string, any> = {};
  private turns: Msg[] = [];
  private rollingSummary = "";
  constructor(public id: string, public systemPrefix: string, public ttlMs = 15000) {}

  frame(agentRole: string, task: string): Msg[] {
    const msgs: Msg[] = [
      { role: "system", content: this.systemPrefix },
      { role: "system", content: agentRole },
    ];
    if (this.rollingSummary) msgs.push({ role: "system", content: "CONTEXT SO FAR:\n" + this.rollingSummary });
    msgs.push({ role: "user", content: task });
    return msgs;
  }
  memoKey(...parts: Array<string | number>) { return parts.join("|"); }
  recall<T>(k: string): T | undefined { const h = this.memo.get(k); return h && Date.now() - h.at < this.ttlMs ? (h.value as T) : undefined; }
  remember(k: string, v: any) { this.memo.set(k, { at: Date.now(), value: v }); }
  put<T>(k: string, v: T) { this.board[k] = v; }
  get<T>(k: string): T | undefined { return this.board[k] as T | undefined; }
  note(m: Msg) { this.turns.push(m); }
  async compact(llm: Completion, after = 12) {
    if (this.turns.length < after) return;
    const r = await llm({ messages: [{ role: "system", content: "Summarize the trading session so far in <=120 words; keep all numbers." }, ...this.turns], maxTokens: 220, temperature: 0 });
    this.rollingSummary = r.message.content || this.rollingSummary; this.turns = [];
  }
}
