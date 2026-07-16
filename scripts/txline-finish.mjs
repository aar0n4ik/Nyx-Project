import { readFileSync, appendFileSync } from "node:fs";
import os from "node:os";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
const HOST = process.env.TXLINE_ORIGIN || "https://txline-dev.txodds.com";
const TXSIG = process.env.TXLINE_TXSIG;
if (!TXSIG) throw new Error("set TXLINE_TXSIG=<subscribe tx>");
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.WALLET || `${os.homedir()}/.config/solana/id.json`, "utf8"))));
const short = (s) => (s ? `${String(s).slice(0,6)}\u2026${String(s).slice(-4)}` : s);

const gres = await fetch(`${HOST}/auth/guest/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
if (!gres.ok) throw new Error(`guest ${gres.status}: ${await gres.text()}`);
const jwt = (await gres.json()).token;
console.log("guest JWT:", short(jwt));

const message = `${TXSIG}::${jwt}`;
const walletSignature = Buffer.from(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey)).toString("base64");
const ares = await fetch(`${HOST}/api/token/activate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
  body: JSON.stringify({ txSig: TXSIG, walletSignature, leagues: [] }),
});
const raw = (await ares.text()).trim();
if (!ares.ok) throw new Error(`activate ${ares.status}: ${raw}`);
let apiToken;
try { const j = JSON.parse(raw); apiToken = j.token || j.apiToken || j.apiKey || raw; } catch { apiToken = raw; }
console.log("API token:", short(apiToken));

appendFileSync(".env.local", `\nTXLINE_NET=devnet\nTXLINE_ORIGIN=${HOST}\nTXLINE_JWT=${jwt}\nTXLINE_API_TOKEN=${apiToken}\n`);
console.log("\u2705 .env.local updated. Restart dev.");
