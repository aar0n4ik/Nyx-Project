import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Nyx — App",
  description: "Zero-custody prediction markets settled on Solana.",
};

export default function AppPage() {
  return <AppShell />;
}
