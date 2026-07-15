"use strict";
const { connection, USDT_MINT, ataOf, loadKeypair } = require("./pamm-client.cjs");

(async () => {
  const c = connection();

  const dep = loadKeypair("~/.config/solana/id.json");
  const tre = loadKeypair("~/.config/solana/nyx-treasury.json");
  console.log("RPC        :", c.rpcEndpoint);
  console.log("deployer   :", dep.publicKey.toBase58());
  console.log("treasury   :", tre.publicKey.toBase58());

  const mi = await c.getParsedAccountInfo(USDT_MINT);
  const info = mi.value && mi.value.data && mi.value.data.parsed && mi.value.data.parsed.info;
  console.log("\n== USDT mint", USDT_MINT.toBase58(), "==");
  console.log("decimals      :", info && info.decimals);
  console.log("mintAuthority :", info && info.mintAuthority);
  console.log("supply        :", info && info.supply);

  console.log("\n== balances ==");
  for (const [name, kp] of [["deployer", dep], ["treasury", tre]]) {
    const sol = await c.getBalance(kp.publicKey);
    const ata = ataOf(kp.publicKey, USDT_MINT);
    let usdt = "нет ATA / 0";
    try { const b = await c.getTokenAccountBalance(ata); usdt = b.value.uiAmountString + " USDT"; } catch (e) {}
    console.log(name.padEnd(9), (sol / 1e9).toFixed(4), "SOL |", usdt, "| ata", ata.toBase58());
  }
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
