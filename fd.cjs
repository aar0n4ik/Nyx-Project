"use strict";
const { PublicKey } = require("@solana/web3.js");
const { connection, poolPda } = require("./pamm-client.cjs");
const USDT = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
(async()=>{
  const c=connection();
  const d=(await c.getAccountInfo(poolPda(1783991968844n))).data;
  const seg=(a,b)=>d.subarray(a,b).toString("hex");
  const mint=seg(323,355), me=USDT.toBuffer().toString("hex");
  console.log("keeper   @291..323:", seg(291,323));
  console.log("usdt_mint@323..355:", mint);
  console.log("  expected mint   :", me, "| MATCH:", mint===me);
  console.log("vault    @355..387:", seg(355,387));
  console.log("collat   @387..395:", seg(387,395), "(=", d.readBigUInt64LE(387).toString(), ")");
  console.log("bump     @395     :", d[395]);
})();
