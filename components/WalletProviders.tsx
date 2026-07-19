"use client";
import type { ReactNode } from "react";
import AppKitProvider from "@/components/appkit";
import NetworkGuard from "@/components/NetworkGuard";

export default function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <AppKitProvider>
      <NetworkGuard />
      {children}
    </AppKitProvider>
  );
}
