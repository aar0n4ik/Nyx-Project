"use strict";
const { PublicKey } = require("@solana/web3.js");
const MAX_OUTCOMES = 8, SCALE = 1e9;
const readU64LE = (b,o) => { let x=0n; for(let i=7;i>=0;i--) x=(x<<8n)|BigInt(b[o+i]); return x; };
const readI128LE = (b,o) => { let x=0n; for(let i=15;i>=0;i--) x=(x<<8n)|BigInt(b[o+i]); if(x>=(1n<<127n)) x-=(1n<<128n); return x; };
const readPk = (b,o) => new PublicKey(b.subarray(o,o+32));

function decodeEventPool(data){
  let o = 8; // skip anchor discriminator
  const eventId = readU64LE(data,o); o+=8;
  const n = data[o]; o+=1;
  const b = readI128LE(data,o); o+=16;
  const q = []; for(let i=0;i<MAX_OUTCOMES;i++){ q.push(readI128LE(data,o)); o+=16; }
  const theta = []; for(let i=0;i<MAX_OUTCOMES;i++){ theta.push(readI128LE(data,o)); o+=16; }
  const resolved = data[o]!==0; o+=1;
  const winner = data[o]; o+=1;
  const keeper = readPk(data,o); o+=32;
  const usdtMint = readPk(data,o); o+=32;
  const vault = readPk(data,o); o+=32;
  const collateral = readU64LE(data,o); o+=8;
  const bump = data[o]; o+=1;
  return { eventId, n, b, q, theta, resolved, winner, keeper, usdtMint, vault, collateral, bump, size:o };
}
function poolPrices(p){
  const bf = Number(p.b);
  const L = []; for(let i=0;i<p.n;i++) L.push(Number(p.q[i])/bf + Number(p.theta[i])/SCALE);
  const mx = Math.max(...L), ex = L.map(x=>Math.exp(x-mx)), s = ex.reduce((a,b)=>a+b,0);
  return ex.map(e=>e/s);
}
module.exports = { decodeEventPool, poolPrices, MAX_OUTCOMES, SCALE };
