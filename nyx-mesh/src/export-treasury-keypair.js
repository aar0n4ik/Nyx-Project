// Derive the Nyx WDK wallet keypair from NYX_WALLET_SEED and write it as a
// Solana CLI keypair file, so we can move devnet SOL from the funded wallet.
// Self-verifies against the known WDK address before writing anything.
import "./load-env.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { Keypair } from "@solana/web3.js";
import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
const EXPECT = process.env.NYX_WALLET_EXPECT || "8AV3c2YE4XnUDXSBVkGtzgvQXNhbHLQL9FwyKFYviftF";
const seed = process.env.NYX_WALLET_SEED;
if (!seed) { console.error("No NYX_WALLET_SEED in .env"); process.exit(1); }
const seedHex = mnemonicToSeedSync(seed).toString("hex");
const candidatePaths = ["m/44'/501'/0'/0'", "m/44'/501'/0'", "m/44'/501'/0'/0'/0'", "m/44'/501'/0'/0/0"];
let kp = null, usedPath = null;
for (const p of candidatePaths) {
  try { const { key } = derivePath(p, seedHex); const cand = Keypair.fromSeed(key);
    if (cand.publicKey.toBase58() === EXPECT) { kp = cand; usedPath = p; break; } } catch {}
}
if (!kp) { console.error("Could not reconstruct the keypair for", EXPECT, "- aborting. Nothing written."); process.exit(1); }
const out = process.env.NYX_TREASURY_OUT || join(homedir(), ".config/solana/nyx-treasury.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)));
console.log("Matched via", usedPath);
console.log("Wrote", out);
console.log("Address", kp.publicKey.toBase58());
