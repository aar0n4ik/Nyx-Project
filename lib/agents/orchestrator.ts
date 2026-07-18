/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Completion, MarketState, RiskVerdict, ExecPlan, RunInput, RunResult, Sink } from "./types";
import { KvSession, CoTLog } from "./kvcache";
import { parseJsonLoose } from "./llm";
import { TOOL_SCHEMAS, executeTool, ToolCtx } from "./tools";

const MAX_ROUNDS = 2;

export const SYSTEM_PREFIX = [
  "You are Nyx NASI, an autonomous, non-custodial prediction-market trading intelligence on Solana.",
  "You never invent data: you ONLY use values returned by tools. You never take custody of funds.",
  "You call tools via the native tool interface. When you are done, output a SINGLE JSON object, no prose.",
  "All markets settle on-chain against verified TxLINE proofs; pricing is a recentred-LMSR (max LP loss b*ln(n)).",
].join(" ");

const A_ROLE = "AGENT A (Data Oracle). Gather provable market state with fetch_market_odds and fetch_chain_state. Then output JSON: {modelProbYes:0..1, rationale, scoreHome, scoreAway, deMarginedYes, lmsrPriceYes, liquidityB, txlineSeq, epochDay, cryptoPrice, sources:[]}. modelProbYes is YOUR fair estimate, reasoned from the tool data.";
const B_ROLE = "AGENT B (Risk Manager). Adversarially critique Agent A. You MUST call evaluate_risk with the given numbers, then output JSON: {approve:boolean, maxStake, riskBps, edgeBps, kellyFraction, maxPriceBps, reasons:[]}. Reject if edge is thin, slippage kills EV, or stake exceeds the allowance.";
const C_ROLE = "AGENT C (Executor). You are reached ONLY on consensus. Call build_agent_bet_tx exactly once with the approved parameters, then output JSON: {ok:true}. Never exceed the approved amount.";

type AgentRun<T> = { final: T | null; toolResults: Record<string, any> };

async function runAgent<T>(o: {
  agent: string; role: string; task: string; tools: string[];
  kv: KvSession; cot: CoTLog; llm: Completion; ctx: ToolCtx; sink: Sink;
}): Promise<AgentRun<T>> {
  const schemas = TOOL_SCHEMAS.filter((s) => o.tools.includes(s.function.name));
  const messages = o.kv.frame(o.role, o.task);
  const toolResults: Record<string, any> = {};
  for (let step = 0; step < 6; step++) {
    const res = await o.llm({ messages, tools: schemas, toolChoice: "auto", temperature: 0.2, maxTokens: 900 });
    if (res.message.tool_calls && res.message.tool_calls.length) {
      messages.push({ role: "assistant", content: res.message.content, tool_calls: res.message.tool_calls });
      for (const tc of res.message.tool_calls) {
        o.sink.emit({ type: "tool_call", agent: o.agent, name: tc.function.name, args: tc.function.arguments });
        o.cot.add(o.agent, "tool_call", tc.function.name, tc.function.arguments);
        let out: any;
        try { out = await executeTool(tc.function.name, tc.function.arguments, o.ctx, o.kv); }
        catch (e: any) { out = { error: String((e && e.message) || e) }; }
        toolResults[tc.function.name] = out;
        o.cot.add(o.agent, "tool_result", tc.function.name, out);
        o.sink.emit({ type: "tool_result", agent: o.agent, name: tc.function.name, result: out });
        messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify(out) });
      }
      continue;
    }
    const content = res.message.content || "";
    o.cot.reason(o.agent, "final", content);
    o.sink.emit({ type: "message", agent: o.agent, content });
    return { final: parseJsonLoose<T>(content), toolResults };
  }
  return { final: null, toolResults };
}

export async function runPipeline(input: RunInput, sink: Sink, llm: Completion, origin: string): Promise<RunResult> {
  const kv = new KvSession(input.sessionId, SYSTEM_PREFIX);
  const cot = new CoTLog(input.sessionId);
  const ctx: ToolCtx = { origin, input };
  sink.emit({ type: "start", input: { fixtureId: input.fixtureId, market: input.market, execMode: input.execMode } });

  let state: MarketState | null = null;
  let verdict: RiskVerdict | null = null;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const critique: string = verdict && !verdict.approve ? " Risk Manager REJECTED the previous read: " + verdict.reasons.join("; ") + ". Re-examine and correct." : "";
    const aTask = "Assess fixture " + input.fixtureId + " market " + input.market + (input.cryptoSymbol ? " crypto " + input.cryptoSymbol : "") + " for a bettor with account " + input.account + "." + critique;
    const a = await runAgent<any>({ agent: "A", role: A_ROLE, task: aTask, tools: ["fetch_market_odds", "fetch_chain_state"], kv, cot, llm, ctx, sink });
    const odds = a.toolResults["fetch_market_odds"] || {};
    state = {
      fixtureId: input.fixtureId, market: input.market, label: input.market,
      scoreHome: odds.scoreHome ?? 0, scoreAway: odds.scoreAway ?? 0,
      txlineSeq: odds.txlineSeq ?? null, epochDay: odds.epochDay ?? null,
      deMarginedYes: odds.deMarginedYes ?? null, lmsrPriceYes: odds.lmsrPriceYes ?? 0.5,
      liquidityB: odds.liquidityB ?? 500, cryptoPrice: odds.cryptoPrice ?? null,
      modelProbYes: Number(a.final?.modelProbYes ?? odds.deMarginedYes ?? 0.5),
      rationale: String(a.final?.rationale ?? ""), sources: odds.sources ?? [],
    };
    kv.put("state", state);
    sink.emit({ type: "state", agent: "A", state });

    const bTask = "Critique this read and size risk. modelProbYes=" + state.modelProbYes + ", lmsrPriceYes=" + state.lmsrPriceYes + ", liquidityB=" + state.liquidityB + ", proposedStake=" + input.desiredStake + ", allowanceRemaining=" + input.allowanceRemaining + ". Call evaluate_risk with exactly these, then return the verdict JSON.";
    const b = await runAgent<any>({ agent: "B", role: B_ROLE, task: bTask, tools: ["evaluate_risk"], kv, cot, llm, ctx, sink });
    const risk = b.toolResults["evaluate_risk"] || {};
    verdict = {
      approve: Boolean(b.final?.approve ?? risk.approve),
      maxStake: Number(b.final?.maxStake ?? risk.maxStake ?? 0),
      riskBps: Number(b.final?.riskBps ?? risk.riskBps ?? 10000),
      edgeBps: Number(b.final?.edgeBps ?? risk.edgeBps ?? 0),
      kellyFraction: Number(b.final?.kellyFraction ?? risk.kellyFraction ?? 0),
      maxPriceBps: Number(risk.maxPriceBps ?? b.final?.maxPriceBps ?? 5000),
      reasons: (b.final?.reasons ?? risk.reasons ?? []) as string[],
    };
    kv.put("verdict", verdict);
    cot.verdict("risk", verdict);
    sink.emit({ type: "verdict", agent: "B", verdict });
    cot.decision("consensus.check", { round, approve: verdict.approve, maxStake: verdict.maxStake });
    if (verdict.approve) break;
    if (round === MAX_ROUNDS - 1) { const digest = await cot.digestHex(); sink.emit({ type: "abort", reason: "risk_rejected", cotDigest: digest }); return { ok: false, reason: "risk_rejected", cotDigest: digest, state, verdict, cot: cot.export() }; }
    await kv.compact(llm);
  }

  const cotDigest = await cot.digestHex();
  const plannedStake = Math.min(input.desiredStake, verdict!.maxStake, input.allowanceRemaining);
  const sideYes = state!.modelProbYes >= state!.lmsrPriceYes;
  const cTask = "Consensus reached. Build the bet: account=" + input.account + ", fixtureId=" + input.fixtureId + ", market=" + input.market + ", sideYes=" + sideYes + ", amount=" + plannedStake + ", maxPriceBps=" + verdict!.maxPriceBps + ", riskBps=" + verdict!.riskBps + ", cotDigestHex=" + cotDigest + ", mode=" + input.execMode + ". Call build_agent_bet_tx once.";
  const c = await runAgent<any>({ agent: "C", role: C_ROLE, task: cTask, tools: ["build_agent_bet_tx"], kv, cot, llm, ctx, sink });
  const built = c.toolResults["build_agent_bet_tx"] || {};

  const plan: ExecPlan = {
    sideYes, amount: plannedStake, maxPriceBps: verdict!.maxPriceBps,
    mode: (built.mode || input.execMode) as ExecPlan["mode"],
    unsignedTxBase64: built.unsignedTxBase64 || "", memo: built.memo || "", note: built.note,
  };
  cot.decision("execute", { amount: plannedStake, sideYes, mode: plan.mode });
  sink.emit({ type: "final", plan, cotDigest, verdict, state });
  return { ok: true, cotDigest, state: state!, verdict: verdict!, plan, cot: cot.export() };
}
