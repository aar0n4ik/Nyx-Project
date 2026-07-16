import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44");
const conn = new Connection(clusterApiUrl("devnet"), "confirmed");

const info = await conn.getAccountInfo(PROGRAM_ID);
if (!info) {
  console.log("!! Allowances program NOT FOUND on devnet:", PROGRAM_ID.toBase58());
  console.log("   -> we will need localnet/Surfpool for the demo");
} else {
  console.log("OK: Allowances program is live on devnet");
  console.log("   executable:", info.executable);
  console.log("   owner:", info.owner.toBase58());
}

// prove the PDA seed math runs (SubscriptionAuthority per (user, mint))
const user = new PublicKey("11111111111111111111111111111111");
const mint = new PublicKey("So11111111111111111111111111111111111111112");
const [sa] = PublicKey.findProgramAddressSync(
  [Buffer.from("SubscriptionAuthority"), user.toBuffer(), mint.toBuffer()],
  PROGRAM_ID
);
const [ev] = PublicKey.findProgramAddressSync([Buffer.from("event_authority")], PROGRAM_ID);
console.log("sample SubscriptionAuthority PDA:", sa.toBase58());
console.log("event_authority PDA:", ev.toBase58());
