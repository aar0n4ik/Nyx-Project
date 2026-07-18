# Nyx Autonomous Settlement Intelligence (NASI)

Most "AI + crypto" demos are a chatbot that pretty-prints a hard-coded script. Nyx is the
opposite: a verifiable multi-agent system where the model never parses free text with regex,
never holds keys, and never has the final say -- the Solana program does.

## Pipeline
- Agent A (Data Oracle): assembles provable state from TxLINE (mandatory TxODDS oracle, on-chain
  validate_stat_v2 proofs) + Bitfinex for crypto markets, via NATIVE tool-calls.
- Agent B (Risk Manager): adversarially critiques A, bounds the stake with half-Kelly + the
  recentred-LMSR loss bound (b*ln(n)) + the user's on-chain allowance. Can veto C and send A back.
- Agent C (Executor): only runs on consensus. Builds an unsigned tx (user signs) or routes
  through nyx_agent.execute_agent_bet within a capped allowance.

## Guarantees
1. Native tool-calling, zero ad-hoc parsing (schemas injected into completion()).
2. Consensus enforced on-chain: execute_agent_bet re-checks risk_bps <= cap and the capped,
   auto-expiring allowance before a single lamport moves. Positions are owned by the user.
3. Auditable reasoning: the full chain-of-thought is a decision tree, hashed (sha256), and
   anchored on-chain (cot_digest). Recompute the digest and verify it yourself.
4. Long low-latency sessions: stable schema/role prefix -> prompt-cache hits every tick; TTL
   tool-memo avoids re-fetching unchanged TxLINE stats; rolling summary bounds the window.
   On-device (QVAC/WebGPU) the engine KV cache persists across ticks so trading stays real-time.

## Run
Live server pipeline (judges watch the agents debate, SSE):
  curl -N -X POST $ORIGIN/api/agent-run -H 'content-type: application/json' \
    -d '{"account":"<PUBKEY>","fixtureId":"17588232","market":"ou25","desiredStake":25,"allowanceRemaining":100,"execMode":"unsigned"}'
Requires GROQ_API_KEY. On-chain executor program: programs/nyx_agent (anchor build --no-idl).
