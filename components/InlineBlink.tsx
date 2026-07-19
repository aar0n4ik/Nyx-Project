"use client";

import { useMemo, useRef } from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection, type Provider } from "@reown/appkit-adapter-solana/react";
import { Blink, useBlink, type BlinkAdapter } from "@dialectlabs/blinks";
import "@dialectlabs/blinks/index.css";

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// A Solana Action may return a legacy or a versioned transaction.
function deserializeTx(b64: string): Transaction | VersionedTransaction {
  const bytes = b64ToBytes(b64);
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

export default function InlineBlink({ url }: { url: string }) {
  const { open: openWallet } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider<Provider>("solana");

  // Always read the freshest wallet state inside the adapter's async callbacks
  // (Reown's connect() does not resolve when the wallet connects).
  const stateRef = useRef({ address, isConnected, connection, walletProvider });
  stateRef.current = { address, isConnected, connection, walletProvider };

  // Blink providers must be absolute URLs.
  const blinkUrl = useMemo(() => {
    if (typeof window === "undefined") return url;
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  }, [url]);

  // Bridge the official Blink renderer to the app's existing Reown AppKit wallet.
  const adapter = useMemo<BlinkAdapter>(
    () => ({
      metadata: { supportedBlockchainIds: ["solana:devnet"] },
      connect: async () => {
        const s = stateRef.current;
        if (s.isConnected && s.address) return s.address;
        openWallet();
        const start = Date.now();
        while (Date.now() - start < 60_000) {
          await new Promise((r) => setTimeout(r, 300));
          const cur = stateRef.current;
          if (cur.isConnected && cur.address) return cur.address;
        }
        return null;
      },
      signTransaction: async (txBase64: string) => {
        try {
          const s = stateRef.current;
          if (!s.walletProvider || !s.connection) return { error: "Wallet not ready" };
          const tx = deserializeTx(txBase64);
          const signature = await s.walletProvider.sendTransaction(tx as any, s.connection);
          return { signature };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      },
      confirmTransaction: async (signature: string) => {
        const s = stateRef.current;
        if (!s.connection) return;
        await s.connection.confirmTransaction(signature, "confirmed");
      },
    }),
    [openWallet],
  );

  const { blink, isLoading } = useBlink({ url: blinkUrl });

  if (isLoading || !blink) {
    return <div className="h-[420px] w-full animate-pulse rounded-3xl border border-hairline bg-subtle" />;
  }

  // stylePreset "x-dark"  -> the recognizable X/Twitter-style dark Blink card.
  // securityLevel "all"   -> don't gate our own trusted endpoint behind the
  //                          "unknown blink" interstitial.
  const blinkProps: any = { blink, adapter, stylePreset: "x-dark", securityLevel: "all" };

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <Blink {...blinkProps} />
    </div>
  );
}
