// Nyx wallet inspector: prints the WDK Solana address + SOL and USD₮ balances.
// Run:  cd nyx-mesh && node src/wallet-info.js
import "./load-env.js";
import { NyxWallet } from "./wallet.js";
const w = new NyxWallet();
const st = await w.init();
console.log("=== Nyx WDK wallet ===");
console.log("Module   :", process.env.WDK_MODULE || "@tetherto/wdk-wallet-solana");
console.log("RPC      :", w.rpcUrl);
console.log("USDT mint:", w.mint);
if (!st.ready) {
  console.log("Status   : NOT ready");
  console.log("Reason   :", st.reason);
  console.log("\nSet NYX_WALLET_SEED in nyx-mesh/.env, then run this again to see your address.");
  await w.dispose(); process.exit(0);
}
console.log("Address  :", st.address, "  <-- FUND THIS ADDRESS");
try { const lamports = await w._account.getBalance(); console.log("SOL      :", Number(lamports) / 1e9, "SOL (needed for gas)"); }
catch (e) { console.log("SOL      : unavailable -", e.message); }
const bal = await w.balance();
if (bal.ready) console.log("USD₮     :", bal.usdt, "USDT");
else console.log("USD₮     : unavailable -", bal.reason);
await w.dispose();
