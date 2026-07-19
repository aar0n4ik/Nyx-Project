"use client";
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solanaDevnet } from "@reown/appkit/networks";
import type { ReactNode } from "react";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

const solanaAdapter = new SolanaAdapter();

if (projectId) {
  createAppKit({
    adapters: [solanaAdapter],
    networks: [solanaDevnet],
    defaultNetwork: solanaDevnet,
    projectId,
    metadata: {
      name: "Nyx",
      description: "Zero-custody betting agent on Solana",
      url: "https://nyx-project-roan.vercel.app",
      icons: ["https://nyx-project-roan.vercel.app/favicon.ico"],
    },
    features: { analytics: false, email: false, socials: [] },
  });
}

export default function AppKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
