import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { newIdentity, signReceipt, verifyReceipt, hashCanonical } from "../nyx-mesh/src/poi.js";
import { PoIAnchor } from "../nyx-mesh/src/poi-anchor.js";
import { homedir } from "node:os";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const RPC = "https://api.devnet.solana.com";
const payoutAddress = process.env.NYX_PAYOUT || "5Ybj5JBMzoEp7UVQV1xWQQ5V7RVgBWarBfBdNuXShKBU";
const JOBS = [
  { modelId: "qwen3-4b", prompt: { role: "user", content: "What is the capital of France?" } },
  { modelId: "qwen3-8b", prompt: { role: "user", content: "Who won the 2022 World Cup final?" } },
];
const runCompletion = ({ modelId, prompt }) => {
  const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  return { output: "ECHO(" + modelId + "): " + p.slice(0, 80), tokenCount: 128 };
};

async function ensureKeypair(conn) {
  const kpPath = process.env.NYX_ANCHOR_KEYPAIR || path.join(homedir(), ".config", "solana", "id.json");
  let kp;
  if (existsSync(kpPath)) {
    kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(kpPath, "utf8"))));
    console.log("keypair:", kpPath, kp.publicKey.toBase58());
  } else {
    kp = Keypair.generate();
    mkdirSync(path.dirname(kpPath), { recursive: true });
    writeFileSync(kpPath, JSON.stringify(Array.from(kp.secretKey)));
    console.log("created keypair:", kpPath, kp.publicKey.toBase58());
  }
  let bal = await conn.getBalance(kp.publicKey);
  if (bal < 0.05 * LAMPORTS_PER_SOL) {
    console.log("airdrop 1 SOL ->", kp.publicKey.toBase58());
    try { const s = await conn.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL); await conn.confirmTransaction(s, "confirmed"); }
    catch (e) { console.log("airdrop failed:", e.message); }
    bal = await conn.getBalance(kp.publicKey);
  }
  console.log("balance:", bal / LAMPORTS_PER_SOL, "SOL");
  if (bal < 20000) { console.log("NEED SOL: пополни", kp.publicKey.toBase58(), "на devnet (https://faucet.solana.com) и перезапусти"); process.exit(1); }
  return kp;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const kp = await ensureKeypair(conn);
  const anchor = new PoIAnchor({ network: "devnet", connection: conn, keypair: kp });
  const out = [];
  for (const job of JOBS) {
    const identity = newIdentity();
    const { output, tokenCount } = runCompletion(job);
    const receipt = signReceipt(identity, {
      modelId: job.modelId, prompt: job.prompt, output, tokenCount,
      pricePerKTokenUsdt: 0.02, payoutAddress,
    });
    const v = verifyReceipt(receipt);
    if (!v.ok) { console.log("VERIFY FAIL:", v.reason); process.exit(1); }
    if (hashCanonical(receipt.body) !== receipt.digest) { console.log("CANONICAL DRIFT"); process.exit(1); }
    const a = await anchor.anchor(receipt);
    if (!a.anchored) { console.log("ANCHOR FAIL:", a.reason); process.exit(1); }
    const chk = await anchor.verifyAnchored(a.signature, receipt);
    console.log(job.modelId, "->", a.signature, "| on-chain:", chk.ok);
    out.push({ digest: receipt.digest, sig: a.signature, cluster: "devnet", body: receipt.body });
  }
  mkdirSync("lib", { recursive: true });
  writeFileSync("lib/poi-receipts.json", JSON.stringify(out, null, 2));
  console.log("OK -> lib/poi-receipts.json (" + out.length + " self-verifying receipts)");
}
main().catch((e) => { console.error(e); process.exit(1); });
