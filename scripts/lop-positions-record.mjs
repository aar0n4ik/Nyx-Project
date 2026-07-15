import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os"; import crypto from "node:crypto";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
const conn=new Connection("https://api.devnet.solana.com","confirmed");
const LOP=new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
const POS=new PublicKey("5mHnHLotoAnXzaSQwnM8HeL6JyAdirdTm96gK6wGhUgu");
const kp=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${os.homedir()}/.config/solana/id.json`,"utf8"))));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const disc=n=>crypto.createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16LE(n&0xffff);return b;};
const u64=n=>{const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
const ixL=(d,k)=>new TransactionInstruction({programId:LOP,keys:k,data:d});
const ixP=(d,k)=>new TransactionInstruction({programId:POS,keys:k,data:d});
const send=async(i,s)=>{const sig=await sendAndConfirmTransaction(conn,new Transaction().add(...i),s,{commitment:"confirmed"});await sleep(600);return sig;};
const pois=l=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;};
function pHome(hg,ag,min){const left=Math.max(0,95-min)/90;if(left<=0)return hg>ag?1:hg<ag?0:0.5;const lh=1.45*left,la=1.15*left;let w=0,N=30000;for(let i=0;i<N;i++){const fh=hg+pois(lh),fa=ag+pois(la);if(fh>fa)w++;else if(fh===fa)w+=0.5;}return w/N;}
const mkt=Keypair.generate();
const readP=async()=>(await conn.getAccountInfo(mkt.publicKey)).data.readUInt16LE(76);
const userNo=Keypair.generate();
await send([SystemProgram.transfer({fromPubkey:kp.publicKey,toPubkey:userNo.publicKey,lamports:12000000})],[kp]);
console.log("userNo",userNo.publicKey.toBase58());
const posPda=u=>PublicKey.findProgramAddressSync([Buffer.from("pos"),mkt.publicKey.toBuffer(),u.toBuffer()],POS)[0];
const pdaYes=posPda(kp.publicKey), pdaNo=posPda(userNo.publicKey);
const initSig=await send([ixL(Buffer.concat([disc("initialize_market"),kp.publicKey.toBuffer(),u16(2000),u16(5000)]),[{pubkey:mkt.publicKey,isSigner:true,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}])],[kp,mkt]);
console.log("market",mkt.publicKey.toBase58());
const openPos=(pda,user,side)=>ixP(Buffer.concat([disc("open_position"),Buffer.from([side]),u64(1000000)]),[{pubkey:pda,isSigner:false,isWritable:true},{pubkey:mkt.publicKey,isSigner:false,isWritable:false},{pubkey:user.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}]);
const steps=[]; let openYesSig,openNoSig,entryPrice,first=true;
const tl=[[0,0,0,"Kickoff"],[23,1,0,"GOAL Home 1-0"],[40,1,0,"Halftime"],[55,1,1,"GOAL Away 1-1"],[70,1,1,""],[78,2,1,"GOAL Home 2-1"],[90,2,1,"90'"]];
for(const [min,hg,ag,label] of tl){
  const p=pHome(hg,ag,min),prob=Math.min(9999,Math.max(1,Math.round(p*10000))),tf=Math.min(10000,Math.round(min/90*10000));
  const sig=await send([ixL(Buffer.concat([disc("push_oracle"),u16(prob),u16(tf)]),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:false}]),ixL(disc("apply_funding"),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true}])],[kp]);
  const price=await readP(); steps.push({min,hg,ag,label,oracle:prob,price,tf,sig,phase:"match"}); console.log("min"+min,hg+"-"+ag,"oracle"+prob,"price"+price);
  if(first){first=false; entryPrice=price;
    openYesSig=await send([openPos(pdaYes,kp,1)],[kp]); console.log("openYES",openYesSig.slice(0,8));
    openNoSig=await send([openPos(pdaNo,userNo,0)],[userNo]); console.log("openNO",openNoSig.slice(0,8));}
}
for(let i=1;i<=8;i++){const sig=await send([ixL(disc("apply_funding"),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true}])],[kp]);const price=await readP();steps.push({min:90,hg:2,ag:1,label:i===8?"Converged to truth":"",oracle:9699,price,tf:10000,sig,phase:"relax"});console.log("relax"+i,"price"+price);}
const settleSig=await send([ixL(Buffer.concat([disc("settle"),Buffer.from([1])]),[{pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:kp.publicKey,isSigner:true,isWritable:false}])],[kp]);
console.log("market settled",settleSig.slice(0,8));
const settlePos=(pda,owner)=>ixP(disc("settle_position"),[{pubkey:pda,isSigner:false,isWritable:true},{pubkey:mkt.publicKey,isSigner:false,isWritable:false},{pubkey:owner,isSigner:false,isWritable:false}]);
const setYesSig=await send([settlePos(pdaYes,kp.publicKey)],[kp]);
const setNoSig=await send([settlePos(pdaNo,userNo.publicKey)],[kp]);
const decodePos=async pda=>{const d=(await conn.getAccountInfo(pda)).data;return{notional:Number(d.readBigUInt64LE(73)),entryPriceBps:d.readUInt16LE(81),settled:d[83]!==0,pnlBps:d.readInt32LE(84)};};
const yes=await decodePos(pdaYes), no=await decodePos(pdaNo);
const b=(await conn.getAccountInfo(mkt.publicKey)).data;
const trace={program:LOP.toBase58(),market:mkt.publicKey.toBase58(),cluster:"devnet",initSig,settleSig,final:{price:b.readUInt16LE(76),decided:b[80]!==0,terminalYes:b[81]!==0},fixture:{home:"Home",away:"Away",competition:"World Cup — live oracle replay"},steps,recordedAt:new Date().toISOString()};
mkdirSync("public",{recursive:true}); writeFileSync("public/demo-trace.json",JSON.stringify(trace,null,2));
const ptrace={positionsProgram:POS.toBase58(),market:mkt.publicKey.toBase58(),cluster:"devnet",entryPriceBps:entryPrice,marketSettleSig:settleSig,terminalYes:b[81]!==0,positions:[{side:"YES",user:kp.publicKey.toBase58(),pda:pdaYes.toBase58(),...yes,openSig:openYesSig,settleSig:setYesSig},{side:"NO",user:userNo.publicKey.toBase58(),pda:pdaNo.toBase58(),...no,openSig:openNoSig,settleSig:setNoSig}],recordedAt:new Date().toISOString()};
writeFileSync("public/positions-trace.json",JSON.stringify(ptrace,null,2));
console.log("WROTE demo-trace.json + positions-trace.json | YES pnl_bps",yes.pnlBps,"NO pnl_bps",no.pnlBps);
