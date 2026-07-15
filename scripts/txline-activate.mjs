import { readFileSync, appendFileSync } from "node:fs";
import os from "node:os";
import nacl from "tweetnacl";
import anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID as T22, ASSOCIATED_TOKEN_PROGRAM_ID as ATA } from "@solana/spl-token";
const { AnchorProvider, Program, Wallet } = anchor;
const HOST = "https://txline-dev.txodds.com", RPC = "https://api.devnet.solana.com";
const PID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8"))));
const conn = new Connection(RPC, "confirmed");
const provider = new AnchorProvider(conn, new Wallet(kp), { commitment: "confirmed" });
anchor.setProvider(provider);
const idl = await Program.fetchIdl(PID, provider);
const program = new Program(idl, provider);
const [ttPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], PID);
const ttVault = getAssociatedTokenAddressSync(MINT, ttPda, true, T22, ATA);
const [pm] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], PID);
const ata = await getOrCreateAssociatedTokenAccount(conn, kp, MINT, kp.publicKey, false, "confirmed", undefined, T22, ATA);
const g = await fetch(`${HOST}/auth/guest/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
const jwt = (await g.json()).token;
console.log("jwt", jwt.slice(0, 6), "...");
const txSig = await program.methods.subscribe(1, 4).accounts({
  user: kp.publicKey, pricingMatrix: pm, tokenMint: MINT, userTokenAccount: ata.address,
  tokenTreasuryVault: ttVault, tokenTreasuryPda: ttPda, tokenProgram: T22,
  associatedTokenProgram: ATA, systemProgram: SystemProgram.programId,
}).rpc();
console.log("subscribe", txSig);
const sig = Buffer.from(nacl.sign.detached(new TextEncoder().encode(`${txSig}::${jwt}`), kp.secretKey)).toString("base64");
const a = await fetch(`${HOST}/api/token/activate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ txSig, walletSignature: sig, leagues: [] }),
});
const raw = (await a.text()).trim();
if (!a.ok) throw new Error(`activate ${a.status}: ${raw}`);
let tok; try { const j = JSON.parse(raw); tok = j.token || j.apiToken || j.apiKey || raw; } catch { tok = raw; }
console.log("API token", tok.slice(0, 8), "... len", tok.length);
appendFileSync(".env.local", `\nTXLINE_NET=devnet\nTXLINE_ORIGIN=${HOST}\nTXLINE_JWT=${jwt}\nTXLINE_API_TOKEN=${tok}\n`);
console.log("OK saved to .env.local");
