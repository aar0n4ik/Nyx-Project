"use client";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const DEV = "38d667dd86c40d94f74d0b214cd6bdaf6dc3926eed8657b91fdde54d71e8310c";
const MAIN = "4331d8b7c75bac406fe8e7aa09605db63f6f809e6919fd48b0f042ff9f2664d8";

type Card = { label: L; value: string; tint: string };
const CARDS: Card[] = [
  { label: { en: "Devnet digest", ru: "Дайджест devnet", es: "Digest de devnet", pt: "Digest da devnet", fr: "Digest devnet", de: "Devnet-Digest", zh: "Devnet 摘要" }, value: DEV, tint: "from-nyx to-verify" },
  { label: { en: "Mainnet digest", ru: "Дайджест mainnet", es: "Digest de mainnet", pt: "Digest da mainnet", fr: "Digest mainnet", de: "Mainnet-Digest", zh: "Mainnet 摘要" }, value: MAIN, tint: "from-verify to-payout" },
];

export default function ProofOfInference() {
  const lang = useLang();
  return (
    <section className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-verify">{pick(lang, { en: "Proof of inference", ru: "Пруф инференса", es: "Prueba de inferencia", pt: "Prova de inferência", fr: "Preuve d'inférence", de: "Proof of Inference", zh: "推理证明" })}</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, { en: "The AI can't lie about what it computed", ru: "ИИ не может соврать о том, что он вычислил", es: "La IA no puede mentir sobre lo que calculó", pt: "A IA não pode mentir sobre o que calculou", fr: "L'IA ne peut pas mentir sur ce qu'elle a calculé", de: "Die KI kann nicht lügen, was sie berechnet hat", zh: "AI 无法谎报它到底算了什么" })}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted">{pick(lang, { en: "Every model run happens inside Tether QVAC and emits an ed25519-signed digest on-chain. Recompute it yourself — it matches byte-for-byte.", ru: "Каждый запуск модели происходит внутри Tether QVAC и публикует ончейн дайджест, подписанный ed25519. Пересчитай сам — совпадёт байт в байт.", es: "Cada ejecución del modelo ocurre dentro de Tether QVAC y emite on-chain un digest firmado con ed25519. Recalcúlalo tú mismo: coincide byte a byte.", pt: "Cada execução do modelo acontece dentro do Tether QVAC e emite on-chain um digest assinado com ed25519. Recalcule você mesmo — bate byte a byte.", fr: "Chaque exécution du modèle se déroule dans Tether QVAC et émet on-chain un digest signé en ed25519. Recalculez-le vous-même — il correspond octet pour octet.", de: "Jeder Modelllauf erfolgt in Tether QVAC und veröffentlicht on-chain einen ed25519-signierten Digest. Rechne ihn selbst nach — er stimmt Byte für Byte.", zh: "每次模型运行都在 Tether QVAC 内部完成，并在链上发布一条 ed25519 签名的摘要。你可以自己重算——逐字节一致。" })}</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {CARDS.map((c, i) => {
            const badge = "mb-4 inline-block rounded-lg bg-gradient-to-r " + c.tint + " px-3 py-1 text-xs font-semibold text-ink";
            return (
              <Reveal key={i} delay={i * 0.08}>
                <div className="rounded-2xl border border-hairline bg-base p-6">
                  <div className={badge}>{pick(lang, c.label)}</div>
                  <div className="break-all font-mono text-sm leading-relaxed text-ink">{c.value}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
