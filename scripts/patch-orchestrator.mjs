import fs from "node:fs";

const FILE = "lib/agents/orchestrator.ts";
let s = fs.readFileSync(FILE, "utf8");
let changed = 0;
const ok  = (n) => { changed++; console.log("✅ " + n); };
const skip = (n) => console.log("⏭️  " + n);

// (a) safeAnchor helper — после MAX_ROUNDS
if (!s.includes("async function safeAnchor(")) {
  const a = "const MAX_ROUNDS = 2;";
  if (s.includes(a)) {
    s = s.replace(a, a + `

async function safeAnchor(digestHex: string, meta: Record<string, unknown>) {
  try {
    const { anchorCotDigest } = await import("./proof-of-reasoning");
    return await anchorCotDigest(digestHex, meta);
  } catch {
    return { digest: digestHex, sig: null as string | null, url: null as string | null, note: "local" };
  }
}`);
    ok("safeAnchor helper");
  } else skip("safeAnchor: якорь 'const MAX_ROUNDS = 2;' не найден");
} else skip("safeAnchor: уже есть");

// (b + d) persona-overlay + proof на success — после digestHex
if (!s.includes("/* nyx:persona-proof */")) {
  const a = "const cotDigest = await cot.digestHex();";
  if (s.includes(a)) {
    s = s.replace(a, a + `
  /* nyx:persona-proof */
  const riskAppetite = Number((input as any)?.riskAppetite ?? 0.5);
  const oracleTrust  = Number((input as any)?.oracleTrust  ?? 0.5);
  const st: any = (typeof kv !== "undefined" && (kv as any)?.get) ? ((kv as any).get("state") ?? {}) : {};
  const modelProbYes = Number(st.modelProbYes ?? st.probYes ?? 0.5);
  const oraclePx     = Number(st.oraclePriceYes ?? st.oraclePx ?? modelProbYes);
  const lmsrPriceYes = Number(st.lmsrPriceYes ?? st.priceYes ?? 0.5);
  const effProbYes = oracleTrust * oraclePx + (1 - oracleTrust) * modelProbYes;
  const edgeBps = Math.abs(effProbYes - lmsrPriceYes) * 10000;
  const requiredEdgeBps = 300 - 260 * riskAppetite;
  const stakeScale = 0.4 + 1.2 * riskAppetite;
  const approve = edgeBps >= requiredEdgeBps;
  sink({ type: "persona", data: { riskAppetite, oracleTrust, effProbYes, edgeBps, requiredEdgeBps, stakeScale, approve } });
  const proof = await safeAnchor(cotDigest, { kind: "final", approve, edgeBps });
  sink({ type: "proof", data: proof });`);
    ok("persona-overlay + proof (success)");
  } else skip("persona/proof success: якорь 'const cotDigest = await cot.digestHex();' не найден");
} else skip("persona/proof success: уже есть");

// (c) proof на abort — перед первым sink abort
if (!s.includes("/* nyx:proof-abort */")) {
  const re = /(\n\s*)(sink\(\s*\{\s*type:\s*["']abort["'])/;
  if (re.test(s)) {
    s = s.replace(re, `$1/* nyx:proof-abort */$1try { const pd = await cot.digestHex(); const pa = await safeAnchor(pd, { kind: "abort" }); sink({ type: "proof", data: pa }); } catch {}$1$2`);
    ok("proof (abort)");
  } else skip("proof abort: событие 'abort' не найдено (не критично)");
} else skip("proof abort: уже есть");

fs.writeFileSync(FILE, s);
console.log(changed ? \`\n\${changed} правок внесено в \${FILE}\` : "\nНичего не менял.");
