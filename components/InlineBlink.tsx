"use client";
import { Blink, useBlink, useBlinksRegistryInterval } from "@dialectlabs/blinks";
import { useBlinkSolanaWalletAdapter } from "@dialectlabs/blinks/hooks/solana";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const RPC = "https://api.devnet.solana.com";

export default function InlineBlink({ url }: { url: string }) {
  useBlinksRegistryInterval();
  const { adapter } = useBlinkSolanaWalletAdapter(RPC);
  const { blink, isLoading } = useBlink({ url });

  if (isLoading || !blink) {
    return <div className="mt-5 text-center text-sm text-muted">Loading blink…</div>;
  }
  return (
    <div className="mt-5">
      <div className="mb-3 flex justify-center">
        <WalletMultiButton />
      </div>
      <Blink blink={blink} adapter={adapter} {...({ stylePreset: "x-dark" } as any)} />
    </div>
  );
}
