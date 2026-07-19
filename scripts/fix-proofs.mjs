import fs from "node:fs";
import path from "node:path";

// Реальные подписи из DEPLOYMENTS.md
const SIGS = {
  "65r1Whd_REPLACE_aMXfV9v":  "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v",
  "q9yZGM_REPLACE_fwAkQ":     "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ",
  "KDsynE_REPLACE_dB2vPFm":   "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm",
  "2xXK_REPLACE_soga":        "2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA",
  "4cHmiwce_REPLACE_ESdMUeR": "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR",
  "2SDKgy1A_REPLACE_TaaH7Vn": "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn",
  "29zHMJ9A_REPLACE_MLNqRS":  "29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS",
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
    if (sig) { s = s.split(ph).join(sig); replaced++; console.log(`✅ ${ph}`); }
    else leftover.add(ph);
  }
  if (s !== before) fs.writeFileSync(f, s);
}
if (leftover.size) { console.log("\n⚠️ остались:"); [...leftover].forEach(x=>console.log("  - "+x)); }
console.log(`\nЗаменено вхождений: ${replaced}. Заглушек осталось: ${leftover.size}.`);
