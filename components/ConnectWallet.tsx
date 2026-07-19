"use client";
import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useLang, pick } from "@/lib/i18n";

function shorten(a: string) {
  return a.slice(0, 4) + "…" + a.slice(-4);
}

export default function ConnectWallet() {
  const lang = useLang();
  const { publicKey, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const addr = useMemo(() => (publicKey ? shorten(publicKey.toBase58()) : null), [publicKey]);

  const label = connecting
    ? pick(lang, { en: "Connecting…", ru: "Подключение…", es: "Conectando…", pt: "Conectando…", fr: "Connexion…", de: "Verbinde…", zh: "连接中…" })
    : addr
    ? addr
    : pick(lang, { en: "Connect wallet", ru: "Подключить кошелёк", es: "Conectar wallet", pt: "Conectar carteira", fr: "Connecter le wallet", de: "Wallet verbinden", zh: "连接钱包" });

  const onClick = () => { if (addr) disconnect(); else setVisible(true); };

  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-nyx to-solana px-4 text-sm font-semibold text-white shadow-lg shadow-nyx/25 transition hover:brightness-110"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {label}
    </button>
  );
}
