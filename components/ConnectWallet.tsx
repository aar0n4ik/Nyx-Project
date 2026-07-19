"use client";
import { useWallet } from "@solana/wallet-adapter-react";

function short(a: string) { return a.slice(0, 4) + "…" + a.slice(-4); }

export default function ConnectWallet({ className }: { className?: string }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ";
  const open = () => window.dispatchEvent(new CustomEvent("nyx-open-wallet"));

  if (publicKey) {
    return (
      <button onClick={() => disconnect()} className={base + "border border-hairline bg-subtle text-ink hover:border-nyx " + (className || "")}>
        <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
        {short(publicKey.toBase58())}
      </button>
    );
  }
  return (
    <button onClick={open} className={base + "bg-gradient-to-r from-nyx to-solana text-white shadow-lg shadow-nyx/25 hover:brightness-110 " + (className || "")}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
