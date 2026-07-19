"use client";
import { ShieldCheck, KeyRound, Cpu, Coins } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";

const CARDS = [
  {
    icon: ShieldCheck,
    tint: "text-nyx",
    title: { en: "Zero custody", ru: "Без хранения средств", es: "Sin custodia", pt: "Sem custódia", fr: "Aucune garde de fonds", de: "Keine Verwahrung", zh: "零托管" },
    desc: { en: "place_bet_for moves funds under a capped, expiring allowance. Your money never sits in our wallet.", ru: "place_bet_for переводит средства по ограниченному разрешению с истечением. Твои деньги никогда не лежат в нашем кошельке.", es: "place_bet_for mueve los fondos con una autorización limitada y con caducidad. Tu dinero nunca está en nuestra cartera.", pt: "place_bet_for move os fundos sob uma permissão limitada e expirável. Seu dinheiro nunca fica na nossa carteira.", fr: "place_bet_for déplace les fonds via une autorisation plafonnée et expirable. Votre argent ne reste jamais dans notre portefeuille.", de: "place_bet_for bewegt Gelder unter einer begrenzten, ablaufenden Freigabe. Dein Geld liegt nie in unserer Wallet.", zh: "place_bet_for 在有上限且会过期的授权下转移资金。你的钱从不停留在我们的钱包里。" },
  },
  {
    icon: KeyRound,
    tint: "text-verify",
    title: { en: "No admin key", ru: "Нет админ-ключа", es: "Sin clave de administrador", pt: "Sem chave de admin", fr: "Pas de clé admin", de: "Kein Admin-Schlüssel", zh: "无管理员密钥" },
    desc: { en: "resolve() settles from on-chain oracle state. No human can flip an outcome after the fact.", ru: "resolve() рассчитывает по ончейн-состоянию оракула. Ни один человек не может изменить исход задним числом.", es: "resolve() liquida según el estado del oráculo on-chain. Ningún humano puede cambiar un resultado después.", pt: "resolve() liquida a partir do estado do oráculo on-chain. Nenhum humano pode mudar um resultado depois.", fr: "resolve() règle à partir de l'état de l'oracle on-chain. Aucun humain ne peut modifier un résultat après coup.", de: "resolve() rechnet aus dem On-Chain-Orakelzustand ab. Kein Mensch kann ein Ergebnis nachträglich ändern.", zh: "resolve() 依据链上预言机状态结算。任何人都无法事后更改结果。" },
  },
  {
    icon: Cpu,
    tint: "text-solana",
    title: { en: "Verifiable inference", ru: "Проверяемый инференс", es: "Inferencia verificable", pt: "Inferência verificável", fr: "Inférence vérifiable", de: "Überprüfbare Inferenz", zh: "可验证推理" },
    desc: { en: "Qwen3-4B runs in the Nyx agent runtime; every prediction ships an ed25519 receipt on Solana Memo.", ru: "Qwen3-4B работает в the Nyx agent runtime; каждый прогноз сопровождается ed25519-квитанцией в Solana Memo.", es: "Qwen3-4B se ejecuta en the Nyx agent runtime; cada predicción incluye un recibo ed25519 en Solana Memo.", pt: "Qwen3-4B roda no the Nyx agent runtime; cada previsão inclui um recibo ed25519 no Solana Memo.", fr: "Qwen3-4B tourne dans the Nyx agent runtime ; chaque prédiction fournit un reçu ed25519 dans un Solana Memo.", de: "Qwen3-4B läuft in the Nyx agent runtime; jede Vorhersage liefert eine ed25519-Quittung im Solana Memo.", zh: "Qwen3-4B 在 the Nyx agent runtime 中运行；每次预测都会在 Solana Memo 上附带一份 ed25519 回执。" },
  },
  {
    icon: Coins,
    tint: "text-payout",
    title: { en: "Recentred LMSR", ru: "Перецентрированный LMSR", es: "LMSR recentrado", pt: "LMSR recentralizado", fr: "LMSR recentré", de: "Rezentrierter LMSR", zh: "重心化 LMSR" },
    desc: { en: "nyx_pamm bounds LP loss to b·ln(n). Deterministic pricing, no oracle front-running.", ru: "nyx_pamm ограничивает убыток LP величиной b·ln(n). Детерминированное ценообразование, без фронтраннинга оракула.", es: "nyx_pamm limita la pérdida del LP a b·ln(n). Precios deterministas, sin front-running del oráculo.", pt: "nyx_pamm limita a perda do LP a b·ln(n). Precificação determinística, sem front-running de oráculo.", fr: "nyx_pamm borne la perte du LP à b·ln(n). Tarification déterministe, sans front-running d'oracle.", de: "nyx_pamm begrenzt den LP-Verlust auf b·ln(n). Deterministische Preise, kein Orakel-Frontrunning.", zh: "nyx_pamm 将做市商损失限制在 b·ln(n)。定价确定，无预言机抢跑。" },
  },
];

const EYEBROW = { en: "Why Nyx is different", ru: "Чем Nyx отличается", es: "Por qué Nyx es diferente", pt: "Por que a Nyx é diferente", fr: "Pourquoi Nyx est différent", de: "Warum Nyx anders ist", zh: "Nyx 有何不同" };
const HEADING = { en: "Four guarantees, all on-chain", ru: "Четыре гарантии — все ончейн", es: "Cuatro garantías, todas on-chain", pt: "Quatro garantias, todas on-chain", fr: "Quatre garanties, toutes on-chain", de: "Vier Garantien, alle on-chain", zh: "四项保证，全部在链上" };

export default function WhyDifferent() {
  const lang = useLang();
  return (
    <section id="why" className="mx-auto max-w-content px-6 py-24">
      <Reveal>
        <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">
          {pick(lang, EYEBROW)}
        </div>
        <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">
          {pick(lang, HEADING)}
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div className="group h-full rounded-2xl border border-hairline bg-base p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-nyx/5">
              <div className="mb-4 inline-flex rounded-xl bg-subtle p-3">
                <c.icon className={"h-6 w-6 " + c.tint} />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">{pick(lang, c.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{pick(lang, c.desc)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
