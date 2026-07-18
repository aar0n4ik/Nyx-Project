"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const faqInit = { height: 0, opacity: 0 } as const;
const faqAnim = { height: "auto", opacity: 1 } as const;
const faqExit = { height: 0, opacity: 0 } as const;
const faqTrans = { duration: 0.3 } as const;

type QA = { q: Record<Lang, string>; a: Record<Lang, string> };

const FAQS: QA[] = [
  {
    q: { en: "How is Nyx zero-custody?", ru: "Как Nyx работает без кастодиала?", es: "¿Cómo es Nyx sin custodia?", pt: "Como a Nyx é sem custódia?", fr: "Comment Nyx est-il sans dépôt ?", de: "Wie ist Nyx ohne Verwahrung?", zh: "Nyx 如何做到零托管？" },
    a: { en: "Funds move via place_bet_for under a capped, expiring allowance signed by you. Nyx never holds your balance — the contract pulls only the exact stake and reverts on AmountExceedsLimit.", ru: "Средства двигаются через place_bet_for по подписанному тобой ограниченному разрешению с истечением. Nyx никогда не держит твой баланс — контракт списывает только точную ставку и откатывается при AmountExceedsLimit.", es: "Los fondos se mueven vía place_bet_for bajo una autorización limitada y con caducidad firmada por ti. Nyx nunca guarda tu saldo: el contrato retira solo la apuesta exacta y se revierte con AmountExceedsLimit.", pt: "Os fundos se movem via place_bet_for sob uma permissão limitada e expirável assinada por você. A Nyx nunca guarda seu saldo — o contrato puxa apenas a aposta exata e reverte em AmountExceedsLimit.", fr: "Les fonds circulent via place_bet_for sous une autorisation plafonnée et expirable que vous signez. Nyx ne détient jamais votre solde — le contrat prélève uniquement la mise exacte et s'annule en cas d'AmountExceedsLimit.", de: "Gelder bewegen sich über place_bet_for unter einer von dir signierten, begrenzten und ablaufenden Freigabe. Nyx hält nie dein Guthaben — der Vertrag zieht nur den exakten Einsatz und bricht bei AmountExceedsLimit ab.", zh: "资金通过 place_bet_for 在你签名的、有上限且会过期的授权下转移。Nyx 从不持有你的余额——合约只扣取确切的下注额，并在 AmountExceedsLimit 时回滚。" },
  },
  {
    q: { en: "Who resolves a market?", ru: "Кто рассчитывает рынок?", es: "¿Quién resuelve un mercado?", pt: "Quem resolve um mercado?", fr: "Qui résout un marché ?", de: "Wer löst einen Markt auf?", zh: "谁来结算市场？" },
    a: { en: "No one with an admin key. resolve() reads on-chain oracle state; proof-gated markets settle through a verifier CPI, disputed ones run a bonded dispute game with slashing.", ru: "Никто с админ-ключом. resolve() читает ончейн-состояние оракула; рынки по пруфу рассчитываются через verifier CPI, спорные проходят залоговую игру споров со слэшингом.", es: "Nadie con una clave de admin. resolve() lee el estado del oráculo on-chain; los mercados con prueba se liquidan mediante un CPI del verificador, los disputados corren un juego de disputa con fianza y slashing.", pt: "Ninguém com uma chave de admin. resolve() lê o estado do oráculo on-chain; mercados com prova liquidam via CPI do verificador, os disputados rodam um jogo de disputa com garantia e slashing.", fr: "Personne avec une clé admin. resolve() lit l'état de l'oracle on-chain ; les marchés sur preuve se règlent via un CPI de vérificateur, les marchés contestés lancent un jeu de litige avec caution et slashing.", de: "Niemand mit einem Admin-Schlüssel. resolve() liest den On-Chain-Orakelzustand; proof-gesteuerte Märkte werden über einen Verifier-CPI abgewickelt, umstrittene laufen ein besichertes Dispute-Spiel mit Slashing.", zh: "没有任何持有管理员密钥的人。resolve() 读取链上预言机状态；凭证驱动的市场通过验证器 CPI 结算，有争议的则运行带保证金与罚没的争议博弈。" },
  },
  {
    q: { en: "What makes the AI verifiable?", ru: "Что делает ИИ проверяемым?", es: "¿Qué hace verificable la IA?", pt: "O que torna a IA verificável?", fr: "Qu'est-ce qui rend l'IA vérifiable ?", de: "Was macht die KI überprüfbar?", zh: "是什么让 AI 可验证？" },
    a: { en: "Every inference runs in Tether QVAC and emits an ed25519-signed digest to a Solana Memo. Anyone can recompute the digest and match it byte-for-byte.", ru: "Каждый инференс выполняется в Tether QVAC и отправляет подписанный ed25519 дайджест в Solana Memo. Любой может пересчитать дайджест и сверить его байт в байт.", es: "Cada inferencia se ejecuta en Tether QVAC y emite un digest firmado con ed25519 a un Solana Memo. Cualquiera puede recomputar el digest y compararlo byte por byte.", pt: "Cada inferência roda no Tether QVAC e emite um digest assinado com ed25519 em um Solana Memo. Qualquer um pode recalcular o digest e compará-lo byte a byte.", fr: "Chaque inférence tourne dans Tether QVAC et émet un digest signé en ed25519 dans un Solana Memo. N'importe qui peut recalculer le digest et le comparer octet par octet.", de: "Jede Inferenz läuft in Tether QVAC und sendet einen ed25519-signierten Digest an ein Solana Memo. Jeder kann den Digest neu berechnen und Byte für Byte abgleichen.", zh: "每次推理都在 Tether QVAC 中运行，并向 Solana Memo 发出一份 ed25519 签名摘要。任何人都可以重新计算该摘要并逐字节比对。" },
  },
  {
    q: { en: "How are odds priced?", ru: "Как формируются коэффициенты?", es: "¿Cómo se fijan las cuotas?", pt: "Como as odds são precificadas?", fr: "Comment les cotes sont-elles fixées ?", de: "Wie werden die Quoten bepreist?", zh: "赔率如何定价？" },
    a: { en: "A recentred LMSR curve in nyx_pamm. LP loss is bounded to b·ln(n), so pricing is deterministic and resistant to oracle front-running.", ru: "Перецентрированная кривая LMSR в nyx_pamm. Убыток LP ограничен b·ln(n), поэтому ценообразование детерминировано и устойчиво к фронтраннингу оракула.", es: "Una curva LMSR recentrada en nyx_pamm. La pérdida del LP está acotada a b·ln(n), así que el precio es determinista y resistente al front-running del oráculo.", pt: "Uma curva LMSR recentralizada em nyx_pamm. A perda do LP é limitada a b·ln(n), então a precificação é determinística e resistente ao front-running de oráculo.", fr: "Une courbe LMSR recentrée dans nyx_pamm. La perte du LP est bornée à b·ln(n), donc la tarification est déterministe et résistante au front-running d'oracle.", de: "Eine rezentrierte LMSR-Kurve in nyx_pamm. Der LP-Verlust ist auf b·ln(n) begrenzt, daher ist die Preisbildung deterministisch und resistent gegen Orakel-Frontrunning.", zh: "nyx_pamm 中的重心化 LMSR 曲线。做市商损失被限制在 b·ln(n)，因此定价是确定的，并能抵御预言机抢跑。" },
  },
  {
    q: { en: "Can I verify past payouts?", ru: "Могу ли я проверить прошлые выплаты?", es: "¿Puedo verificar pagos anteriores?", pt: "Posso verificar pagamentos anteriores?", fr: "Puis-je vérifier les paiements passés ?", de: "Kann ich frühere Auszahlungen prüfen?", zh: "我能验证过去的赔付吗？" },
    a: { en: "Yes — every settlement, dispute and payout links to a real Solana transaction in the Verify section above.", ru: "Да — каждый расчёт, спор и выплата ссылается на реальную транзакцию Solana в разделе Verify выше.", es: "Sí: cada liquidación, disputa y pago enlaza a una transacción real de Solana en la sección Verify de arriba.", pt: "Sim — cada liquidação, disputa e pagamento leva a uma transação real da Solana na seção Verify acima.", fr: "Oui — chaque règlement, litige et paiement renvoie à une vraie transaction Solana dans la section Verify ci-dessus.", de: "Ja — jede Abwicklung, jeder Dispute und jede Auszahlung verlinkt auf eine echte Solana-Transaktion im Verify-Abschnitt oben.", zh: "可以——每一次结算、争议和赔付都在上方 Verify 部分链接到一笔真实的 Solana 交易。" },
  },
];

const HEADING = { en: "Questions, answered on-chain", ru: "Вопросы — ответы в сети", es: "Preguntas, respondidas on-chain", pt: "Perguntas, respondidas on-chain", fr: "Questions, répondues on-chain", de: "Fragen, on-chain beantwortet", zh: "问题，链上解答" };

export default function FAQ() {
  const lang = useLang();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-subtle py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, HEADING)}</h2>
        </Reveal>
        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border border-hairline bg-base">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left">
                  <span className="font-display text-lg font-semibold text-ink">{pick(lang, f.q)}</span>
                  <Plus className={"h-5 w-5 shrink-0 text-nyx transition-transform " + (isOpen ? "rotate-45" : "")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={faqInit} animate={faqAnim} exit={faqExit} transition={faqTrans}>
                      <p className="px-6 pb-6 leading-relaxed text-muted">{pick(lang, f.a)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
