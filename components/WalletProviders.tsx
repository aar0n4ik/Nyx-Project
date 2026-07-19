"use client";
import type { ReactNode } from "react";
import AppKitProvider from "@/components/appkit";

export default function WalletProviders({ children }: { children: ReactNode }) {
  return <AppKitProvider>{children}</AppKitProvider>;
}
