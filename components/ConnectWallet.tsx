"use client";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

function short(a: string) { return a.slice(0, 4) + "…" + a.slice(-4); }

export default function ConnectWallet({ className }: { className?: string }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ";

  if (isConnected && address) {
    return (
      <button onClick={() => open({ view: "Account" })} className={base + "border border-hairline bg-subtle text-ink hover:border-nyx " + (className || "")}>
        <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
        {short(address)}
      </button>
    );
  }
  return (
    <button onClick={() => open()} className={base + "bg-gradient-to-r from-nyx to-solana text-white shadow-lg shadow-nyx/25 hover:brightness-110 " + (className || "")}>
      Connect Wallet
    </button>
  );
}
