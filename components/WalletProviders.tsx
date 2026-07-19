"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

const ENDPOINT = "https://api.devnet.solana.com";

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [], []); // wallet-standard авто-детект (Phantom/Solflare/Backpack)
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
