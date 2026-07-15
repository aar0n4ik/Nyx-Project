"use strict";
const { Connection, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, TransactionInstruction } = require("@solana/web3.js");
const C = require("./pamm-client.cjs");
const { decodeEventPool, poolPrices } = require("./pamm-decode.cjs");
const { connection, loadKeypair, USDT_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, ataOf, poolPda, ixInitPool, ixBuy, ixPushOracle, ixResolve, ixClaim } = C;

const EXP = (s) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;

// --- сырые SPL-инструкции (без @solana/spl-token) ---
function ixCreateAtaIdempotent(payer, owner, mint) {
  const ata = ataOf(owner, mint);
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true,  isWritable: true },
      { pubkey: ata,   isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint,  isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]), // 1 = CreateIdempotent
  });
}
function ixMintTo(mint, dest, authority, amount) {
  const data = Buffer.alloc(9); data[0] = 7; data.writeBigUInt64LE(BigInt(amount), 1); // 7 = MintTo
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data,
  });
}

async function send(c, ixs, signers, label) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = signers[0].publicKey;
  const sig = await sendAndConfirmTransaction(c, tx, signers, { commitment: "confirmed" });
  console.log(`  \u2713 ${label}\n    ${EXP(sig)}`);
  return sig;
}
async function showPrices(c, eventId, label) {
  const acc = await c.getAccountInfo(poolPda(eventId));
  const p = decodeEventPool(acc.data);
  const pr = poolPrices(p);
  const pct = pr.map((x,i)=>`p${i}=${(x*100).toFixed(1)}%`).join("  ");
  console.log(`  \ud83d\udcca ${label}:  ${pct}  | vault=${(Number(p.collateral)/1e6).toFixed(2)} USDT  resolved=${p.resolved}`);
  return p;
}
async function usdt(c, owner) { try { return (await c.getTokenAccountBalance(ataOf(owner, USDT_MINT))).value.uiAmountString; } catch { return "0"; } }

(async () => {
  const c = connection();
  const treasury = loadKeypair("~/.config/solana/nyx-treasury.json"); // creator + keeper + mint authority
  const trader   = loadKeypair("~/.config/solana/id.json");           // трейдер
  const eventId  = BigInt(Date.now());
  const n = 2, b = 10n * 1_000_000_000n;                              // b=10 -> субсидия ~6.93 USDT

  console.log("=== Nyx pAMM \u2014 живой цикл на Solana devnet ===");
  console.log("event_id      :", eventId.toString(), " (демо-рынок: победит ли Ecuador?)");
  console.log("creator/keeper:", treasury.publicKey.toBase58());
  console.log("trader        :", trader.publicKey.toBase58());
  console.log("pool PDA      :", poolPda(eventId).toBase58());

  console.log("\n[0] фандим трейдера USD\u20ae (mintTo, authority=treasury)...");
  await send(c, [ixCreateAtaIdempotent(trader.publicKey, trader.publicKey, USDT_MINT),
                 ixMintTo(USDT_MINT, ataOf(trader.publicKey, USDT_MINT), treasury.publicKey, 100_000_000n)],
             [trader, treasury], "mint 100 USDT -> trader");
  console.log("    trader USDT:", await usdt(c, trader.publicKey));

  console.log("\n[1] init_pool (LMSR, n=2, b=10, субсидия из treasury)...");
  await send(c, [ixInitPool({ creator: treasury.publicKey, eventId, n, b, keeper: treasury.publicKey }).ix], [treasury], "init_pool");
  await showPrices(c, eventId, "старт (равновесие)");

  console.log("\n[2] trader BUY outcome 0 (6 долей)...");
  await send(c, [ixBuy({ user: trader.publicKey, eventId, outcome: 0, shares: 6n*1_000_000_000n, maxCost: 20_000_000n }).ix], [trader], "buy");
  await showPrices(c, eventId, "после покупки");
  console.log("    trader USDT:", await usdt(c, trader.publicKey));

  console.log("\n[3] push_oracle: QVAC двигает вероятность \u03b8=[+0.7, 0] (БЕЗ сделок)...");
  await send(c, [ixPushOracle({ keeper: treasury.publicKey, eventId, theta: [700_000_000n, 0n] }).ix], [treasury], "push_oracle");
  await showPrices(c, eventId, "после оракула (QVAC)");

  console.log("\n[4] resolve winner=0...");
  await send(c, [ixResolve({ keeper: treasury.publicKey, eventId, winner: 0 }).ix], [treasury], "resolve");
  await showPrices(c, eventId, "после резолва");

  console.log("\n[5] trader CLAIM outcome 0...");
  const before = await usdt(c, trader.publicKey);
  await send(c, [ixClaim({ user: trader.publicKey, eventId, outcome: 0 }).ix], [trader], "claim");
  console.log(`    trader USDT: ${before} -> ${await usdt(c, trader.publicKey)}`);

  console.log("\n=== ЦИКЛ ЗАВЕРШЁН on-chain: init \u2192 buy \u2192 oracle \u2192 resolve \u2192 claim ===");
})().catch(e => { console.error("\nDEMO ERR:", e.message); if (e.logs) console.error(e.logs.join("\n")); process.exit(1); });
