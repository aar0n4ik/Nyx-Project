import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Nyx — Trustless prediction markets on Solana",
  description:
    "Zero-custody betting, on-chain settlement and verifiable AI inference. Every bet, every payout, every proof lives on-chain.",
};

const fontVars = [inter.variable, display.variable, mono.variable].join(" ");
const themeInit = {
  __html:
    "try{var t=localStorage.getItem('nyx-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={themeInit} />
      </head>
      <body>{children}</body>
    </html>
  );
}
