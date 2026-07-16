import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

try { for (const l of fs.readFileSync(".env.local","utf8").split("\n")){ const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^"|"$/g,""); } } catch {}
const ORIGIN=process.env.TXLINE_ORIGIN||"https://txline-dev.txodds.com";
const RPC=process.env.SOLANA_RPC||"https://api.devnet.solana.com";
const LOP=new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
const DURATION=Number(process.env.DURATION_MS||120000);
let jwt=process.env.TXLINE_JWT, apiToken=process.env.TXLINE_API_TOKEN;
if(!apiToken){ console.error("Missing TXLINE_API_TOKEN"); process.exit(1); }
const getJwt=async()=>(await(await fetch(`${ORIGIN}/auth/guest/start`,{method:"POST"})).json()).token;
async function api(q,retry=true){ const r=await fetch(`${ORIGIN}/api${q}`,{headers:{Authorization:`Bearer ${jwt}`,"X-Api-Token":apiToken}}); if(r.status===401&&retry){jwt=await getJwt();return api(q,false);} const t=await r.text(); if(!r.ok) throw new Error(`${r.status} ${q}: ${t.slice(0,150)}`); return t?JSON.parse(t):null; }

const fx=await(async()=>{ for(const q of ["/fixtures/snapshot?competitionId=72","/fixtures/snapshot"]){ try{ const f=await api(q); if(Array.isArray(f)&&f.length) return f; }catch(e){} } return []; })();
const byId=new Map(fx.map(f=>[f.FixtureId??f.fixtureId,f]));
const fixtureId=process.env.FIXTURE_ID?Number(process.env.FIXTURE_ID):18241006;
const meta=byId.get(fixtureId)||null;
const homeIsPart1=meta?(meta.Participant1IsHome!==false):true;
function deriveBps(odds){ if(!Array.isArray(odds)||!odds.length) return null;
  const sc=o=>{ let s=0; const t=String(o.SuperOddsType||""),per=String(o.MarketPeriod||""),mp=String(o.MarketParameters||"");
    if(/MATCH|RESULT|1X2|MONEYLINE|WINNER|3.?WAY|WDW|OUTRIGHT/i.test(t)) s+=100; if(/ASIANHANDICAP/i.test(t)) s+=40;
    if(/half=0|full/i.test(per)) s+=25; if(!per) s+=10; if(/(^|)line=0(|$)/.test(mp)) s+=10; if(o.InRunning===false) s+=2; return s; };
  const b=[...odds].sort((a,b)=>sc(b)-sc(a))[0];
  if(Array.isArray(b.Pct)&&b.Pct.length>=2){ const h=Number(b.Pct[homeIsPart1?0:1]); if(isFinite(h)) return Math.max(1,Math.min(9999,Math.round(h*100))); }
  if(Array.isArray(b.Prices)&&b.Prices.length>=2){ const ip=b.Prices.map(p=>1/(Number(p)/1000)); const s=ip[0]+ip[1]; return Math.max(1,Math.min(9999,Math.round(ip[homeIsPart1?0:1]/s*10000))); }
  return null; }

const conn=new Connection(RPC,"confirmed");
const auth=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(),".config/solana/id.json"),"utf8"))));
const disc=n=>createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
const u16=n=>{ const b=Buffer.alloc(2); b.writeUInt16LE(n&0xffff); return b; };
const send=async(ix,signers)=>{ const tx=new Transaction().add(ix); tx.feePayer=auth.publicKey; const s=await sendAndConfirmTransaction(conn,tx,signers,{commitment:"confirmed"}); await new Promise(r=>setTimeout(r,600)); return s; };

let market=process.env.MARKET;
try{ if(!market) market=JSON.parse(fs.readFileSync("public/odds-oracle-trace.json","utf8")).lopMarket; }catch{}
let mktPk;
if(market){ mktPk=new PublicKey(market); console.log("Reusing market:", market); }
else { const mkt=Keypair.generate(); mktPk=mkt.publicKey; market=mktPk.toBase58();
  console.log("initialize_market:", await send(new TransactionInstruction({programId:LOP,keys:[{pubkey:mkt.publicKey,isSigner:true,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data:Buffer.concat([disc("initialize_market"),auth.publicKey.toBuffer(),u16(2000),u16(5000)])}),[auth,mkt])); }

const steps=[]; let last=0,lastBps=null,busy=false;
async function pushOracle(bps,src){ const now=Date.now(); if(bps==null||busy||now-last<5000||bps===lastBps) return; busy=true;
  try{ const sig=await send(new TransactionInstruction({programId:LOP,keys:[{pubkey:mktPk,isSigner:false,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:false}],data:Buffer.concat([disc("push_oracle"),u16(bps),u16(0)])}),[auth]);
    last=now; lastBps=bps; steps.push({ts:new Date().toISOString(),bps,src,sig}); console.log(`push[${src}] ${bps}bps -> ${sig.slice(0,16)}…`); }
  catch(e){ console.log("push fail:",e.message); } finally{ busy=false; } }
async function tick(src){ try{ await pushOracle(deriveBps(await api(`/odds/snapshot/${fixtureId}`)),src); }catch(e){ console.log("tick fail:",e.message); } }

console.log(`Keeper start: fixture ${fixtureId} (${meta?.Participant1} vs ${meta?.Participant2}), market ${market}, ${DURATION/1000}s`);
await tick("init");
const poll=setInterval(()=>tick("poll"),15000);
const ab=new AbortController();
(async()=>{ try{ const res=await fetch(`${ORIGIN}/api/odds/stream`,{headers:{Authorization:`Bearer ${jwt}`,"X-Api-Token":apiToken,Accept:"text/event-stream","Cache-Control":"no-cache"},signal:ab.signal});
  if(!res.ok||!res.body){ console.log("SSE unavailable:",res.status,"— falling back to poll"); return; }
  console.log("SSE odds stream opened"); const rd=res.body.getReader(),dec=new TextDecoder(); let buf="";
  while(true){ const {value,done}=await rd.read(); if(done) break; buf+=dec.decode(value,{stream:true});
    let mm; while((mm=buf.match(/\r?\n\r?\n/))){ const blk=buf.slice(0,mm.index); buf=buf.slice(mm.index+mm[0].length);
      if(blk.split(/\r?\n/).some(l=>l.startsWith("data:"))) await tick("sse"); } } }
  catch(e){ if(e.name!=="AbortError") console.log("SSE err:",e.message); } })();

setTimeout(()=>{ clearInterval(poll); ab.abort();
  fs.writeFileSync("public/oracle-live-trace.json", JSON.stringify({program:LOP.toBase58(),cluster:"devnet",fixtureId,home:meta&&(homeIsPart1?meta.Participant1:meta.Participant2),away:meta&&(homeIsPart1?meta.Participant2:meta.Participant1),lopMarket:market,source:"TxLINE StablePrice (SSE+poll)",updates:steps.length,steps,recordedAt:new Date().toISOString()},null,2));
  console.log(`\nDone: ${steps.length} oracle updates from TxLINE. WROTE public/oracle-live-trace.json`); process.exit(0);
}, DURATION);
