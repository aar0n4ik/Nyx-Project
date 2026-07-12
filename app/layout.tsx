import type { Metadata, Viewport } from "next"
export const metadata: Metadata = {
  title: "Nyx — Verifiable Sports Intelligence",
  description: "Nyx is an on-device AI agent for verifiable World Cup markets. Offline-first with Tether QVAC, settled at Solana speed. The invisible Web3 layer for football.",
  applicationName: "Nyx",
  metadataBase: new URL("https://nyx-project-roan.vercel.app"),
  openGraph: { title: "Nyx — Verifiable Sports Intelligence", description: "On-device AI agent for verifiable World Cup markets. Tether QVAC + Solana.", type: "website", images: ["/nyx/icon-512.png"] },
  twitter: { card: "summary_large_image", title: "Nyx — Verifiable Sports Intelligence", description: "On-device AI + Solana settlement for football.", images: ["/nyx/icon-512.png"] },
  icons: { icon: "/nyx/nyx-mark.svg", apple: "/nyx/icon-192.png" },
  manifest: "/nyx/manifest.webmanifest",
}
export const viewport: Viewport = { themeColor: "#2563eb" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>)
}
