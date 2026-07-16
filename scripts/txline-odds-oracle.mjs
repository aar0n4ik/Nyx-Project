import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { createHash } from "node:crypto";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

try { for (const l of fs.readFileSync(".env.local","utf8").split("\n")){ const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^"|"$/g,""); } } catch {}
const ORIGIN = process.env.TXLINE_ORIGIN || "https://txline-dev.txodds.com";
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const LOP = new PublicKey("6k1LZGb8xWPwiZNhyk9p4AMdZRGeyYerDaxzPXmRRr83");
let jwt = process.env.TXLINE_JWT, apiToken = process.env.TXLINE_API_TOKEN;
if(!apiToken){ console.error("Missing TXLINE_API_TOKEN — activate first"); process.exit(1); }
const getJwt=async()=>(await(await fetch(`${ORIGIN}/auth/guest/start`,{method:"POST"})).json()).token;
async function api(q,retry=true){ const r=await fetch(`${ORIGIN}/api${q}`,{headers:{Authorization:`Bearer ${jwt}`,"X-Api-Token":apiToken}});
  if(r.status===401&&retry){jwt=await getJwt();return api(q,false);} const t=await r.text();
  if(!r.ok) throw new Error(`${r.status} ${q}: ${t.slice(0,180)}`); return t?JSON.parse(t):null; }

async function fixtures(){ for(const q of ["/fixtures/snapshot?competitionId=72","/fixtures/snapshot"]){ try{ const f=await api(q); if(Array.isArray(f)&&f.length) return f; }catch(e){} } return []; }
const fx = await fixtures(); const byId = new Map(fx.map(f=>[f.FixtureId??f.fixtureId,f]));
let fixtureId=process.env.FIXTURE_ID?Number(process.env.FIXTURE_ID):null, meta=null, odds=null;
const order = fixtureId?[fixtureId]:[18241006,17588320,...fx.map(f=>f.FixtureId??f.fixtureId)];
for(const id of order){ try{ const o=await api(`/odds/snapshot/${id}`); if(Array.isArray(o)&&o.length){ fixtureId=id; odds=o; meta=byId.get(id)||null; break; } }catch(e){} }
if(!odds){ console.error("No fixture with odds"); process.exit(1); }

console.log(`\n=== FIXTURE ${fixtureId} | entries ${odds.length} ===`);
odds.forEach((o,i)=>console.log(`[${i}] ${o.SuperOddsType} | ${o.MarketParameters} | ${o.MarketPeriod} | names=${JSON.stringify(o.PriceNames)} Prices=${JSON.stringify(o.Prices)} Pct=${JSON.stringify(o.Pct)}`));
const sc=o=>{ let s=0; const t=String(o.SuperOddsType||""),per=String(o.MarketPeriod||""),mp=String(o.MarketParameters||"");
  if(/MATCH|RESULT|1X2|MONEYLINE|WINNER|3.?WAY|WDW|OUTRIGHT/i.test(t)) s+=100;
  if(/ASIANHANDICAP/i.test(t)) s+=40; if(/half=0|full/i.test(per)) s+=25; if(!per) s+=10;
  if(/(^|)line=0(|$)/.test(mp)) s+=10; if(o.InRunning===false) s+=2; return s; };
const best=[...odds].sort((a,b)=>sc(b)-sc(a))[0];
const homeIsPart1 = meta ? (meta.Participant1IsHome!==false) : true;
let homeBps=null, via=null;
if(Array.isArray(best.Pct)&&best.Pct.length>=2){ const h=Number(best.Pct[homeIsPart1?0:1]); if(isFinite(h)){ homeBps=Math.max(1,Math.min(9999,Math.round(h*100))); via="Pct%"; } }
if(homeBps==null && Array.isArray(best.Prices)&&best.Prices.length>=2){ const ip=best.Prices.map(p=>1/(Number(p)/1000)); const sum=ip[0]+ip[1]; homeBps=Math.max(1,Math.min(9999,Math.round(ip[homeIsPart1?0:1]/sum*10000))); via="Prices(shortDecimal)"; }
const home = meta && (homeIsPart1?meta.Participant1:meta.Participant2);
const away = meta && (homeIsPart1?meta.Participant2:meta.Participant1);
console.log(`\nSelected market: ${best.SuperOddsType} | ${best.MarketParameters} | ${best.MarketPeriod}`);
console.log(`Source: ${best.Bookmaker} (MessageId ${best.MessageId})`);
console.log(`De-margined implied prob(home) = ${homeBps} bps (via ${via}) | ${home??"part1"} vs ${away??"part2"}`);

let initSig=null, pushSig=null, market=null;
if(homeBps!=null){
  const conn=new Connection(RPC,"confirmed");
  const auth=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(),".config/solana/id.json"),"utf8"))));
  const mkt=Keypair.generate(); market=mkt.publicKey.toBase58();
  const disc=n=>createHash("sha256").update(`global:${n}`).digest().subarray(0,8);
  const u16=n=>{ const b=Buffer.alloc(2); b.writeUInt16LE(n&0xffff); return b; };
  const send=async(ix,signers)=>{ const tx=new Transaction().add(ix); tx.feePayer=auth.publicKey; const s=await sendAndConfirmTransaction(conn,tx,signers,{commitment:"confirmed"}); await new Promise(r=>setTimeout(r,600)); return s; };
  initSig=await send(new TransactionInstruction({ programId:LOP, keys:[
    {pubkey:mkt.publicKey,isSigner:true,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:true},
    {pubkey:SystemProgram.programId,isSigner:false,isWritable:false}], data:Buffer.concat([disc("initialize_market"),auth.publicKey.toBuffer(),u16(2000),u16(5000)]) }), [auth,mkt]);
  console.log("initialize_market:", initSig);
  pushSig=await send(new TransactionInstruction({ programId:LOP, keys:[
    {pubkey:mkt.publicKey,isSigner:false,isWritable:true},{pubkey:auth.publicKey,isSigner:true,isWritable:false}], data:Buffer.concat([disc("push_oracle"),u16(homeBps),u16(0)]) }), [auth]);
  console.log("push_oracle:", pushSig, "| oracle prob bps:", homeBps);
}
fs.writeFileSync("public/odds-oracle-trace.json", JSON.stringify({ program:LOP.toBase58(), cluster:"devnet", fixtureId, home, away,
  source:best.Bookmaker, messageId:best.MessageId, market:best.SuperOddsType, marketParams:best.MarketParameters, marketPeriod:best.MarketPeriod,
  prices:best.Prices, pct:best.Pct, homeProbBps:homeBps, via, lopMarket:market, initSig, pushSig, recordedAt:new Date().toISOString() },null,2));
console.log("\nWROTE public/odds-oracle-trace.json");
