import fs from "node:fs";
import path from "node:path";

// ⬇️ ВПИШИ реальные сигнатуры вместо null. Ключ = плейсхолдер из кода.
const SIGS = {
  "65r1Whd_REPLACE_aMXfV9v": null, // Proof-gated CPI settle
  "q9yZGM_REPLACE_fwAkQ":    null, // Dispute resolve PDA
  "KDsynE_REPLACE_dB2vPFm":  null, // Arbitrated & slashed
  "2xXK_REPLACE_soga":       null, // First payout
  "4cHmiwce_REPLACE_ESdMUeR":null, // PoI devnet
  "2SDKgy1A_REPLACE_TaaH7Vn":null, // PoI mainnet ← удали если mainnet нет
  "29zHMJ9A_REPLACE_MLNqRS": null, // Affiliate split
};

const ROOTS = ["app","components","lib","content","config","data"];
const EXT = new Set([".ts",".tsx",".js",".jsx",".json"]);
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

let replaced = 0; const leftover = new Set();
for (const f of files) {
  let s = fs.readFileSync(f, "utf8"); const before = s;
  for (const [ph, sig] of Object.entries(SIGS)) {
    if (!s.includes(ph)) continue;
    if (sig) { s = s.split(ph).join(sig); replaced++; console.log(`✅ ${ph} → ${sig}`); }
    else leftover.add(ph);
  }
  if (s !== before) fs.writeFileSync(f, s);
}
if (leftover.size) {
  console.log("\n⚠️ Остались заглушки без реальной tx (впиши сигнатуру ИЛИ удали карточку):");
  [...leftover].forEach(x => console.log("  - " + x));
}
console.log(`\nЗаменено: ${replaced}. Осталось заглушек: ${leftover.size}.`);
