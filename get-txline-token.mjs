import * as anchor from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import nacl from "tweetnacl";
import fs from "node:fs";

const NETWORK = (process.env.TXLINE_NET || "devnet").toLowerCase();
const SERVICE_LEVEL_ID = Number(process.env.TXLINE_SERVICE_LEVEL || 1);
const DURATION_WEEKS = Number(process.env.TXLINE_WEEKS || 4);
const SELECTED_LEAGUES = [];

const CONFIG = {
  mainnet: { rpcUrl: "https://api.mainnet-beta.solana.com", apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"), txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL") },
  devnet: { rpcUrl: "https://api.devnet.solana.com", apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"), txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG") },
};
const cfg = CONFIG[NETWORK];
const apiBaseUrl = `${cfg.apiOrigin}/api`;

let kp;
if (fs.existsSync("./txline-wallet.json")) {
  kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync("./txline-wallet.json", "utf8"))));
  console.log("Wallet:", kp.publicKey.toBase58());
} else {
  kp = Keypair.generate();
  fs.writeFileSync("./txline-wallet.json", JSON.stringify([...kp.secretKey]));
  console.log("New wallet:", kp.publicKey.toBase58());
}

const connection = new Connection(cfg.rpcUrl, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(kp), { commitment: "confirmed" });
anchor.setProvider(provider);

async function ensureSol() {
  const bal = await connection.getBalance(kp.publicKey);
  console.log("Balance:", bal / LAMPORTS_PER_SOL, "SOL");
  if (bal >= 0.05 * LAMPORTS_PER_SOL) return;
  if (NETWORK !== "devnet") throw new Error(`Send ~0.05 SOL to ${kp.publicKey.toBase58()} then re-run.`);
  console.log("Airdropping devnet SOL...");
  const sig = await connection.requestAirdrop(kp.publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

async function main() {
  await ensureSol();
  const idl = await anchor.Program.fetchIdl(cfg.programId, provider);
  if (!idl) throw new Error("Could not fetch on-chain IDL.");
  const program = new anchor.Program(idl, provider);

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], cfg.programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], cfg.programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(cfg.txlTokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(cfg.txlTokenMint, kp.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

  console.log(`Subscribing (level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks, free)...`);
  const txSig = await program.methods.subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS).accounts({
    user: kp.publicKey, pricingMatrix: pricingMatrixPda, tokenMint: cfg.txlTokenMint,
    userTokenAccount, tokenTreasuryVault, tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
  }).rpc();
  console.log("txSig:", txSig);

  const jwt = (await (await fetch(`${cfg.apiOrigin}/auth/guest/start`, { method: "POST" })).json()).token;
  const msg = new TextEncoder().encode(`${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`);
  const walletSignature = Buffer.from(nacl.sign.detached(msg, kp.secretKey)).toString("base64");

  const actRes = await fetch(`${apiBaseUrl}/token/activate`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ txSig, walletSignature, leagues: SELECTED_LEAGUES }),
  });
  if (!actRes.ok) throw new Error(`activate failed: ${actRes.status} ${await actRes.text()}`);
  const b = await actRes.json();
  const apiToken = b.token || b;

  console.log("\n===== PASTE INTO VERCEL =====");
  console.log("TXLINE_JWT       =", jwt);
  console.log("TXLINE_API_TOKEN =", typeof apiToken === "string" ? apiToken : JSON.stringify(apiToken));
  console.log("=============================");
}
main().catch(e => { console.error("FAILED:", e.message || e); process.exit(1); });
