"use client";
import SocialButtons from "@/components/SocialButtons";
import { useLang, pick } from "@/lib/i18n";

const TAGLINE = { en: "Trustless prediction markets on Solana.", ru: "Бездоверительные прогнозные рынки на Solana.", es: "Mercados de predicción sin confianza en Solana.", pt: "Mercados de previsão sem confiança na Solana.", fr: "Marchés de prédiction sans confiance sur Solana.", de: "Vertrauensfreie Prognosemärkte auf Solana.", zh: "Solana 上的无信任预测市场。" };
const LEGAL = { en: "© 2026 Nyx · Verifiable by design · Not financial advice", ru: "© 2026 Nyx · Проверяемо по замыслу · Не финансовый совет", es: "© 2026 Nyx · Verificable por diseño · No es asesoramiento financiero", pt: "© 2026 Nyx · Verificável por design · Não é aconselhamento financeiro", fr: "© 2026 Nyx · Vérifiable par conception · Pas un conseil financier", de: "© 2026 Nyx · Verifizierbar by design · Keine Finanzberatung", zh: "© 2026 Nyx · 设计即可验证 · 非投资建议" };

export default function Footer() {
  const lang = useLang();
  return (
    <footer className="border-t border-hairline bg-subtle">
      <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
        <div>
          <div className="font-display text-lg font-bold text-ink">Nyx</div>
          <p className="mt-1 text-sm text-muted">{pick(lang, TAGLINE)}</p>
        </div>
        <SocialButtons />
      </div>
      <div className="border-t border-hairline py-4 text-center text-xs text-muted">
        {pick(lang, LEGAL)}
      </div>
    </footer>
  );
}
