import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app","components","lib","content","config","data"];
const EXT = new Set([".ts",".tsx",".js",".jsx",".json",".md",".mdx"]);
const files = [];
const walk = (d) => {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === "node_modules" || e.name === ".next") continue; walk(p); }
    else if (EXT.has(path.extname(e.name))) files.push(p);
  }
};
ROOTS.forEach(walk);

// [что найти, на что заменить, метка]
const RULES = [
  ["PoI anchored on Mainnet", "PoI on Solana Devnet", "mainnet-тэглайн"],
  ["· PoI anchored on Mainnet", "", "mainnet-тэглайн хвост"],
  ["ed25519-signed digest", "SHA-256 reasoning digest", "ed25519 → SHA-256"],
  ["ed25519-signed", "SHA-256", "ed25519 → SHA-256 (короткое)"],
  ["inside Tether QVAC", "in the Nyx agent runtime", "Tether QVAC claim"],
  ["Tether QVAC", "the Nyx agent runtime", "Tether QVAC claim (короткое)"],
  ["front-running-proof", "order-independent by design", "LMSR overclaim"],
  ["Odds that can't be gamed", "Odds priced by a bounded curve", "LMSR overclaim 2"],
  ["The AI can't lie about what it computed", "Recompute the agent's reasoning digest yourself", "PoR overclaim"],
  ["Proof of inference", "Proof of reasoning", "PoI → PoR заголовок"],
];

let total = 0;
for (const f of files) {
  let s = fs.readFileSync(f, "utf8"); const before = s;
  for (const [a, b, label] of RULES) {
    if (s.includes(a)) { s = s.split(a).join(b); console.log(`✅ ${label}  (${f})`); }
  }
  if (s !== before) { fs.writeFileSync(f, s); total++; }
}
console.log(total ? `\n${total} файлов обновлено` : "\n⚠️ Совпадений не найдено — строки в исходнике отличаются от рендера. Пришли мне файлы, подгоню.");
