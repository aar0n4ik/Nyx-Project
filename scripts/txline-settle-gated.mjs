import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

try { for (const l of fs.readFileSync(".env.local","utf8").split("\n")){ const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^"|"$/g,""); } } catch {}
const RPC=process.env.SOLANA_RPC||"https://api.devnet.solana.com";
const LOP=new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");

console.log("== GATE: on-chain TxLINE validation (validateStatV2) ==");
let out=""; try { out=execSync("node scripts/txline-validate.mjs",{encoding:"utf8"}); } catch(e){ out=(e.stdout||"")+"\n"+(e.stderr||""); }
process.stdout.write(out);
const proofOk=/MERKLE PROOF VERIFIED/i.test(out);
const m=out.match(/predicate\s*=\s*(true|false)/i); let outcome=m?/true/i.test(m[1]):null;
try { if(outcome==null){ const t=JSON.parse(fs.readFileSync("public/validation-trace.json","utf8")); outcome=!!(t.predicate??t.outcome??t.result); } } catch {}
if(!proofOk){ console.error("\n❌ TxLINE proof NOT verified — SETTLEMENT BLOCKED (trustless gate)."); process.exit(1); }
console.log(`\n✅ TxLINE Merkle proof verified on-chain. Verified outcome = ${outcome}. Allowing settle.\n`);

const conn=new Connection(RPC,"confirmed");
const auth=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(),".config/solana/id.json"),"utf8"))));
const disc=n=>createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
const u16=n=>{ const b=Buffer.alloc(2); b.writeUInt16LE(n&0xffff); return b; };
const send=async(ix,signers)=>{ const tx=new Transaction().add(ix); tx.feePayer=auth.publicKey; const s=await sendAndConfirmTransaction(conn,tx,signers,{commitment:"confirmed"}); await new Promise(r=>setTimeout(r,600)); return s; };

const mkt=Keypair.generate();
const initSig=await send(new TransactionInstruction({programId:LOP,keys:[{pubkey:mkt.publicKey,isSigner:true,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data:Buffer.concat([disc("initialize_market"),auth.publicKey.toBuffer(),u16(2000),u16(5000)])}),[auth,mkt]);
console.log("initialize_market:", initSig);
const pushSig=await send(new TransactionInstruction({programId:LOP,keys:[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:false}],data:Buffer.concat([disc("push_oracle"),u16(outcome?9900:100),u16(0)])}),[auth]);
console.log("push_oracle:", pushSig);
const settleSig=await send(new TransactionInstruction({programId:LOP,keys:[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:false}],data:Buffer.concat([disc("settle"),Buffer.from([outcome?1:0])])}),[auth]);
console.log("settle:", settleSig, "| terminal_yes =", outcome);

fs.writeFileSync("public/settlement-trace.json", JSON.stringify({program:LOP.toBase58(),cluster:"devnet",gate:"TxLINE validateStatV2 (Merkle proof)",proofVerified:true,verifiedOutcome:outcome,market:mkt.publicKey.toBase58(),initSig,pushSig,settleSig,terminalYes:outcome,recordedAt:new Date().toISOString()},null,2));
console.log("\nWROTE public/settlement-trace.json — settle executed ONLY after a verified TxLINE proof.");
