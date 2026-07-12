// Nyx real payout demo: sends test USD₮ on Solana devnet from your Nyx wallet
// to a recipient and prints the on-chain transaction hash + explorer link.
// Recipient: NYX_DEMO_RECIPIENT env / CLI arg, else your own account #1.
import "./load-env.js";
import { NyxWallet } from "./wallet.js";
const amount = process.env.NYX_DEMO_AMOUNT || "10";
const wallet = new NyxWallet();
const st = await wallet.init();
if (!st.ready) { console.error("Wallet not ready:", st.reason); process.exit(1); }
let to = process.env.NYX_DEMO_RECIPIENT || process.argv[2];
if (!to) { const w2 = new NyxWallet({ accountIndex: 1 }); const s2 = await w2.init(); to = s2.address; await w2.dispose(); console.log("No recipient given — using your account #1 as the winner:", to); }
console.log(`Sender : ${st.address}`);
console.log(`Paying : ${amount} USD₮ -> ${to}`);
const res = await wallet.settle({ to, amount, memo: "nyx-demo-payout" });
if (res.settled) {
  console.log("PAID ✅  tx:", res.hash);
  console.log("Explorer:", "https://explorer.solana.com/tx/" + res.hash + "?cluster=devnet");
} else { console.error("NOT settled:", res.reason); }
await wallet.dispose();
