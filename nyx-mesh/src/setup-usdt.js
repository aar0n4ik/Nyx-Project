// Nyx devnet USD₮ setup: create a test SPL mint (6 decimals), mint supply to the
// Nyx WDK wallet, and persist NYX_USDT_MINT into nyx-mesh/.env.
// Your WDK wallet (from your seed) is payer + mint authority, so you fund ONE address.
import "./load-env.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import WalletManagerSolana from "@tetherto/wdk-wallet-solana";
const ENV_PATH = fileURLToPath(new URL("../.env", import.meta.url));
const RPC = process.env.NYX_RPC_URL || "https://api.devnet.solana.com";
const DECIMALS = Number(process.env.NYX_USDT_DECIMALS || 6);
const SUPPLY = Number(process.env.NYX_MINT_SUPPLY || 1000);
function upsertEnv(key, value) {
  let txt = ""; try { txt = readFileSync(ENV_PATH, "utf8"); } catch {}
  const line = `${key}=${value}`; const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(txt)) txt = txt.replace(re, line); else txt = txt.replace(/\s*$/, "") + "\n" + line + "\n";
  writeFileSync(ENV_PATH, txt);
}
const seed = process.env.NYX_WALLET_SEED;
if (!seed) { console.error("No NYX_WALLET_SEED in .env"); process.exit(1); }
const wallet = new WalletManagerSolana(seed, { rpcUrl: RPC, provider: RPC, commitment: "confirmed" });
const account = await wallet.getAccount(0);
const wdkAddress = await account.getAddress();
console.log("Nyx wallet:", wdkAddress);
const seedHex = mnemonicToSeedSync(seed).toString("hex");
const candidatePaths = ["m/44'/501'/0'/0'", "m/44'/501'/0'", "m/44'/501'/0'/0'/0'", "m/44'/501'/0'/0/0"];
let payer = null, usedPath = null;
for (const p of candidatePaths) {
  try { const { key } = derivePath(p, seedHex); const kp = Keypair.fromSeed(key);
    if (kp.publicKey.toBase58() === wdkAddress) { payer = kp; usedPath = p; break; } } catch {}
}
if (!payer) {
  console.error("Could not reconstruct the signer for the WDK address with known derivation paths.");
  console.error("Tell the assistant — derivation needs adjusting. Nothing was changed.");
  wallet.dispose(); process.exit(1);
}
console.log("Signer matched via", usedPath);
const connection = new Connection(RPC, "confirmed");
let bal = await connection.getBalance(payer.publicKey);
console.log("SOL balance:", bal / LAMPORTS_PER_SOL);
if (bal < 0.02 * LAMPORTS_PER_SOL) {
  console.log("Low SOL — requesting devnet airdrop (1 SOL)...");
  try {
    const sig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    bal = await connection.getBalance(payer.publicKey);
    console.log("SOL after airdrop:", bal / LAMPORTS_PER_SOL);
  } catch (e) {
    console.error("Airdrop failed:", e.message);
    console.error("Faucet this address at https://faucet.solana.com (Devnet), then re-run:");
    console.error("  " + wdkAddress);
    wallet.dispose(); process.exit(1);
  }
}
console.log("Creating test USD₮ mint...");
const mint = await createMint(connection, payer, payer.publicKey, null, DECIMALS);
console.log("Mint:", mint.toBase58());
const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
const raw = BigInt(SUPPLY) * (10n ** BigInt(DECIMALS));
await mintTo(connection, payer, mint, ata.address, payer, raw);
console.log(`Minted ${SUPPLY} test USD₮ to ${wdkAddress}`);
upsertEnv("NYX_USDT_MINT", mint.toBase58());
console.log("Wrote NYX_USDT_MINT to .env");
console.log("Mint explorer:   https://explorer.solana.com/address/" + mint.toBase58() + "?cluster=devnet");
console.log("Wallet explorer: https://explorer.solana.com/address/" + wdkAddress + "?cluster=devnet");
wallet.dispose();
console.log("Done. Now run: node src/settle-demo.js");
