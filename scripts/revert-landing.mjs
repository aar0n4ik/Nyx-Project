import fs from "node:fs";
import path from "node:path";
const ROOTS=["app","components","lib","content","config","data"];
const EXT=new Set([".ts",".tsx",".js",".jsx",".json",".md",".mdx"]);
const files=[]; const walk=(d)=>{ if(!fs.existsSync(d))return; for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()){if(e.name==="node_modules"||e.name===".next")continue;walk(p);} else if(EXT.has(path.extname(e.name)))files.push(p);} };
ROOTS.forEach(walk);
const REV=[
  ["PoI on Solana Devnet","PoI anchored on Mainnet","mainnet-тэглайн назад"],
  ["SHA-256 reasoning digest","ed25519-signed digest","ed25519 назад"],
  ["in the Nyx agent runtime","inside Tether QVAC","QVAC назад"],
  ["Proof of reasoning","Proof of inference","PoI заголовок назад"],
  ["Recompute the agent's reasoning digest yourself","The AI can't lie about what it computed","PoI подзаг назад"],
];
let n=0;
for(const f of files){ let s=fs.readFileSync(f,"utf8"); const b=s; for(const[a,c,l]of REV){ if(s.includes(a)){s=s.split(a).join(c);console.log(`↩️ ${l} (${f})`);} } if(s!==b){fs.writeFileSync(f,s);n++;} }
console.log(n?`\n${n} файлов возвращено`:"\nНечего откатывать (шаг 1 не запускался).");
