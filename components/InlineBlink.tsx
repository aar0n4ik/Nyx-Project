"use client";
import { useEffect, useState } from "react";
import { Blink, useBlink, useBlinksRegistryInterval } from "@dialectlabs/blinks";
import { useBlinkSolanaWalletAdapter } from "@dialectlabs/blinks/hooks/solana";

const RPC = "https://api.devnet.solana.com";

export default function InlineBlink({ url }: { url: string }) {
  useBlinksRegistryInterval();
  const { adapter } = useBlinkSolanaWalletAdapter(RPC);
  const { blink, isLoading } = useBlink({ url });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (isLoading || !blink) {
    return <div className="p-4 text-sm text-muted">Loading blink…</div>;
  }
  return (
    <div className="nyx-blink">
      <Blink blink={blink} adapter={adapter} stylePreset={dark ? "x-dark" : "x-light"} />
    </div>
  );
}
