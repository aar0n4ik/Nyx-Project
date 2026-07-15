import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os"; import crypto from "node:crypto";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
const conn=new Connection("https://api.devnet.solana.com","confirmed");
const LOP=new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
const kp=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${os.homedir()}/.config/solana/id.json`,"utf8"))));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const disc=n=>crypto.createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16LE(n&0xffff);return b;};
const ix=(d,k)=>new TransactionInstruction({programId:LOP,keys:k,data:d});
const send=async(i,s)=>{const sig=await sendAndConfirmTransaction(conn,new Transaction().add(...i),s,{commitment:"confirmed"});await sleep(600);return sig;};
const pois=l=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;};
function pHome(hg,ag,min){const left=Math.max(0,95-min)/90;if(left<=0)return hg>ag?1:hg<ag?0:0.5;const lh=1.45*left,la=1.15*left;let w=0,N=30000;for(let i=0;i<N;i++){const fh=hg+pois(lh),fa=ag+pois(la);if(fh>fa)w++;else if(fh===fa)w+=0.5;}return w/N;}
const mkt=Keypair.generate();
const readP=async()=>(await conn.getAccountInfo(mkt.publicKey)).data.readUInt16LE(76);
const initSig=await send([ix(Buffer.concat([disc("initialize_market"),kp.publicKey.toBuffer(),u16(2000),u16(5000)]),[{pubkey:mkt.publicKey,isSigner:true,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}])],[kp,mkt]);
console.log("market",mkt.publicKey.toBase58());
const steps=[];
const tl=[[0,0,0,"Kickoff"],[23,1,0,"GOAL Home 1-0"],[40,1,0,"Halftime"],[55,1,1,"GOAL Away 1-1"],[70,1,1,""],[78,2,1,"GOAL Home 2-1"],[90,2,1,"90'"]];
for(const [min,hg,ag,label] of tl){const p=pHome(hg,ag,min),prob=Math.min(9999,Math.max(1,Math.round(p*10000))),tf=Math.min(10000,Math.round(min/90*10000));
  const sig=await send([ix(Buffer.concat([disc("push_oracle"),u16(prob),u16(tf)]),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:false}]),ix(disc("apply_funding"),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true}])],[kp]);
  const price=await readP(); steps.push({min,hg,ag,label,oracle:prob,price,tf,sig,phase:"match"}); console.log("min"+min,hg+"-"+ag,"oracle="+prob,"price="+price);}
for(let i=1;i<=8;i++){const sig=await send([ix(disc("apply_funding"),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true}])],[kp]);const price=await readP();steps.push({min:90,hg:2,ag:1,label:i===8?"Converged to truth":"",oracle:9699,price,tf:10000,sig,phase:"relax"});console.log("relax"+i,"price="+price);}
const settleSig=await send([ix(Buffer.concat([disc("settle"),Buffer.from([1])]),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:false}])],[kp]);
const b=(await conn.getAccountInfo(mkt.publicKey)).data;
const trace={program:LOP.toBase58(),market:mkt.publicKey.toBase58(),cluster:"devnet",initSig,settleSig,final:{price:b.readUInt16LE(76),decided:b[80]!==0,terminalYes:b[81]!==0},fixture:{home:"Home",away:"Away",competition:"World Cup — live oracle replay"},steps,recordedAt:new Date().toISOString()};
mkdirSync("public",{recursive:true}); writeFileSync("public/demo-trace.json",JSON.stringify(trace,null,2));
console.log("WROTE public/demo-trace.json  settle",settleSig.slice(0,8));
