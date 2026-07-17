import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nyx — Bets you don't have to trust",
    short_name: "Nyx",
    description:
      "Zero-custody prediction markets settled on Solana with no admin key.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07070C",
    theme_color: "#07070C",
    orientation: "portrait",
    icons: [
      { src: "/nyx-mark.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/nyx-mark.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/nyx-mark.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
