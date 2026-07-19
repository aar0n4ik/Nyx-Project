"use client";
import InlineBlink from "@/components/InlineBlink";
import { useLang, pick } from "@/lib/i18n";

const BLINK_URL = "https://nyx-project-roan.vercel.app/api/actions/bet?match=88008802&market=h&odds=2.00";

export default function LiveBlink() {
  const lang = useLang();
  return (
    <section id="blink" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-nyx">Solana Blink · devnet</div>
        <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
          {pick(lang, { en: "Bet in one tap — a real Solana Blink", ru: "Ставка в один тап — настоящий Solana Blink", es: "Apuesta en un toque — un Solana Blink real", pt: "Aposte em um toque — um Solana Blink real", fr: "Pariez en un tap — un vrai Solana Blink", de: "Wette mit einem Tap — ein echter Solana Blink", zh: "一键下注——真正的 Solana Blink" })}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          {pick(lang, { en: "This card is rendered from our on-chain Solana Action. Connect a devnet wallet and sign — the same endpoint unfurls in any Blink client.", ru: "Карточка построена из нашего ончейн Solana Action. Подключи devnet-кошелёк и подпиши — тот же эндпоинт разворачивается в любом Blink-клиенте.", es: "Esta tarjeta se genera desde nuestra Solana Action on-chain. Conecta una billetera devnet y firma.", pt: "Este cartão e gerado a partir da nossa Solana Action on-chain. Conecte uma carteira devnet e assine.", fr: "Cette carte est generee depuis notre Solana Action on-chain. Connectez un portefeuille devnet et signez.", de: "Diese Karte wird aus unserer On-Chain-Solana-Action erzeugt. Verbinde eine Devnet-Wallet und signiere.", zh: "此卡片由我们的链上 Solana Action 生成。连接 devnet 钱包并签名即可。" })}
        </p>
      </div>
      <div className="mx-auto mt-8 max-w-md">
        <InlineBlink url={BLINK_URL} />
      </div>
    </section>
  );
}
