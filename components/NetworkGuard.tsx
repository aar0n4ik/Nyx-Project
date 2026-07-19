"use client";
import { useEffect } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { solanaDevnet } from "@reown/appkit/networks";

export default function NetworkGuard() {
  const { isConnected } = useAppKitAccount();
  const { chainId, switchNetwork } = useAppKitNetwork();
  useEffect(() => {
    if (!isConnected) return;
    if (String(chainId) === String(solanaDevnet.id)) return;
    try { switchNetwork(solanaDevnet); } catch (e) { void e; }
  }, [isConnected, chainId, switchNetwork]);
  return null;
}
