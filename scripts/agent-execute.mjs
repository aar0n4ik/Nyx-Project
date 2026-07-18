// Nyx NASI Executor proof: rebuilds Agent C bet tx and signs it with the Nyx agent wallet.
// Confirmed devnet round-trip: https://explorer.solana.com/tx/2ZMDue4AwT1K3bHokfmmchY81PnsFd1NqWuE3JcnvRL9kurs9Qz83BRDtN2Z4Z55KrJ4BJ1R9XsayxW8JrGkW8D2?cluster=devnet
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from "@solana/web3.js";
import { getMint, getAssociatedTokenAddress, getAccount, createTransferCheckedInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const STABLE_MINT = new PublicKey(process.env.NYX_STABLE_MINT || "4PNbNNDr53XFQ8AUqf8xYBHc5DwtaQdJ6UHtkF24ft5i");
const TREASURY = new PublicKey(process.env.NYX_TREASURY || "DDLyynBSATRkb5svSXjZRLYGPrf2Trvudbrv7HKoaraE");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const fixtureId = process.env.FIXTURE || "17588232";
const market = process.env.MARKET || "ou25";
const amount = Number(process.env.AMOUNT || 25);
const sideYes = (process.env.SIDE || "yes") !== "no";
const riskBps = Number(process.env.RISK_BPS || 2500);

const kpPath = process.env.KEYPAIR || (os.homedir() + "/.config/solana/id.json");
const payerKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, "utf8"))));
const payer = payerKp.publicKey;

const conn = new Connection(RPC, "confirmed");
const mintInfo = await getMint(conn, STABLE_MINT);
const DECIMALS = mintInfo.decimals;
const cotDigestHex = crypto.createHash("sha256").update(JSON.stringify({ fixtureId, market, amount, sideYes, riskBps, ts: Date.now() })).digest("hex");

const fromAta = await getAssociatedTokenAddress(STABLE_MINT, payer);
const toAta = await getAssociatedTokenAddress(STABLE_MINT, TREASURY);
const ixs = [];
try { await getAccount(conn, toAta); } catch { ixs.push(createAssociatedTokenAccountInstruction(payer, toAta, TREASURY, STABLE_MINT)); }
const raw = BigInt(Math.round(amount * 10 ** DECIMALS));
ixs.push(createTransferCheckedInstruction(fromAta, STABLE_MINT, toAta, payer, raw, DECIMALS));
const memo = JSON.stringify({ p: "nyx-bet-v1", fixture: fixtureId, market, side: sideYes ? "yes" : "no", amount, riskBps, cot: cotDigestHex.slice(0, 64), agent: "nyx-nasi-v1" });
ixs.push(new TransactionInstruction({ keys: [{ pubkey: payer, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM_ID, data: Buffer.from(memo, "utf8") }));
const bh = await conn.getLatestBlockhash();
const tx = new Transaction({ feePayer: payer, recentBlockhash: bh.blockhash });
tx.add(...ixs);
tx.sign(payerKp);
console.log("agent wallet :", payer.toBase58());
console.log("mint/dec     :", STABLE_MINT.toBase58(), "d=" + DECIMALS);
console.log("-> treasury  :", TREASURY.toBase58());
console.log("memo         :", memo);
const sig = await conn.sendRawTransaction(tx.serialize());
console.log("sent         :", sig);
await conn.confirmTransaction({ signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight }, "confirmed");
console.log("CONFIRMED    : https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
