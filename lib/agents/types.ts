/* eslint-disable @typescript-eslint/no-explicit-any */
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name?: string; content: string };
export type ToolSchema = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
export type Usage = { prompt_tokens: number; completion_tokens: number; cached_prompt_tokens?: number };
export type CompletionResult = {
  message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };
  usage?: Usage; provider: "groq" | "edge";
};
export type CompletionArgs = {
  messages: Msg[]; tools?: ToolSchema[]; toolChoice?: "auto" | "none" | "required";
  temperature?: number; maxTokens?: number; model?: string; responseJson?: boolean;
};
export type Completion = (args: CompletionArgs) => Promise<CompletionResult>;
export type Sink = { emit: (e: any) => void };

export type MarketState = {
  fixtureId: string; market: string; label: string;
  scoreHome: number; scoreAway: number;
  txlineSeq: number | null; epochDay: number | null;
  deMarginedYes: number | null; lmsrPriceYes: number; liquidityB: number;
  cryptoPrice?: number | null; modelProbYes: number; rationale: string; sources: string[];
};
export type RiskVerdict = {
  approve: boolean; maxStake: number; riskBps: number; edgeBps: number;
  kellyFraction: number; maxPriceBps: number; reasons: string[];
};
export type ExecPlan = {
  sideYes: boolean; amount: number; maxPriceBps: number;
  mode: "unsigned" | "delegated"; unsignedTxBase64: string; memo: string; note?: string;
};
export type RunInput = {
  sessionId: string; account: string; fixtureId: string; market: string;
  cryptoSymbol?: string; desiredStake: number; allowanceRemaining: number;
  execMode: "unsigned" | "delegated"; lang?: string;
  // Sandbox persona knobs (optional; when absent, pipeline behaves exactly as before)
  persona?: string; riskAppetite?: number; oracleTrust?: number;
};
export type RunResult = {
  ok: boolean; reason?: string; cotDigest: string;
  state?: MarketState; verdict?: RiskVerdict; plan?: ExecPlan; cot: any[];
};
