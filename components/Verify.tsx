"use client";
import { ExternalLink } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;
type Tx = { label: L; sig: string; net: "devnet" | "mainnet-beta" };

const TXS: Tx[] = [
  { label: { en: "Proof-gated CPI settle", ru: "Расчёт через CPI с проверкой пруфа", es: "Liquidación CPI con prueba", pt: "Liquidação CPI com prova", fr: "Règlement CPI vérifié par preuve", de: "Proof-geprüftes CPI-Settlement", zh: "带证明校验的 CPI 结算" }, sig: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v", net: "devnet" },
  { label: { en: "Dispute resolve PDA", ru: "Разрешение спора через PDA", es: "Resolución de disputa PDA", pt: "Resolução de disputa PDA", fr: "Résolution de litige PDA", de: "Streit-Auflösung per PDA", zh: "PDA 争议裁决" }, sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ", net: "devnet" },
  { label: { en: "Arbitrated & slashed", ru: "Арбитраж и слэшинг", es: "Arbitrado y penalizado", pt: "Arbitrado e penalizado", fr: "Arbitré et pénalisé (slash)", de: "Arbitriert & geslasht", zh: "仲裁并罚没" }, sig: "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm", net: "devnet" },
  { label: { en: "First payout", ru: "Первая выплата", es: "Primer pago", pt: "Primeiro pagamento", fr: "Premier paiement", de: "Erste Auszahlung", zh: "首次赔付" }, sig: "2xXK1VMqU2YtYEQ8zwERgfh8P872B8FTxZffFtxpx1DgnADSc4uAMhmGyfEDTWMkVfEmW2X8axSTQJvY67bBsogA", net: "devnet" },
  { label: { en: "PoI devnet", ru: "PoI в devnet", es: "PoI en devnet", pt: "PoI na devnet", fr: "PoI sur devnet", de: "PoI im devnet", zh: "PoI（devnet）" }, sig: "4cHmiwceMJ4DbNQsHupQVUdyL4EwA5SEv425M3yFkfksVLCT128ieutsVpeChNiRuRuZyfMYhmhinEnm8ESdMUeR", net: "devnet" },
  { label: { en: "PoI mainnet", ru: "PoI в mainnet", es: "PoI en mainnet", pt: "PoI na mainnet", fr: "PoI sur mainnet", de: "PoI im mainnet", zh: "PoI（mainnet）" }, sig: "2SDKgy1AGbosRkXbvDitxLLsyysbDY32RsA7wJsX2Bs4Tcc4iZMkADmqKDzxYGkAzPiWbQmPE3W2zoXD9TaaH7Vn", net: "mainnet-beta" },
  { label: { en: "Affiliate split", ru: "Партнёрская выплата", es: "Reparto de afiliado", pt: "Divisão de afiliado", fr: "Partage d'affiliation", de: "Affiliate-Anteil", zh: "推广分成" }, sig: "29zHMJ9AA4dH1zWMzDAERWCXedG5JurPrtimWfRX37E7SFu9CeTmib2LhisSfPSQc7ro8przE5SYpp9LQrMLNqRS", net: "devnet" },
];

const HOST = "explorer" + ".solana.com";
const link = (tx: Tx) => "https://" + HOST + "/tx/" + tx.sig + "?cluster=" + tx.net;

export default function Verify() {
  const lang = useLang();
  return (
    <section id="verify" className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-verify">{pick(lang, { en: "Don't trust — verify", ru: "Не доверяй — проверяй", es: "No confíes — verifica", pt: "Não confie — verifique", fr: "Ne faites pas confiance — vérifiez", de: "Nicht vertrauen — überprüfen", zh: "不必信任——自行验证" })}</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, { en: "Every claim links to a real transaction", ru: "Каждое утверждение ведёт к реальной транзакции", es: "Cada afirmación enlaza a una transacción real", pt: "Cada afirmação leva a uma transação real", fr: "Chaque affirmation renvoie à une transaction réelle", de: "Jede Aussage verweist auf eine echte Transaktion", zh: "每一项声明都链接到真实的链上交易" })}</h2>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TXS.map((tx, i) => (
            <Reveal key={tx.sig} delay={i * 0.05}>
              <a href={link(tx)} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-xl border border-hairline bg-base px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-verify hover:shadow-lg hover:shadow-verify/10">
                <div>
                  <div className="text-sm font-semibold text-ink">{pick(lang, tx.label)}</div>
                  <div className="font-mono text-xs text-muted">{tx.sig.slice(0, 6)}...{tx.sig.slice(-6)} · {tx.net}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted transition-colors group-hover:text-verify" />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
