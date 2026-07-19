"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;
type QA = { q: L; a: L };

const TITLES: Record<TrackId, L> = {
  settlement: { en: "Settlement — trust nothing, verify everything", ru: "Расчёты — не верь ничему, проверяй всё", es: "Liquidación — no confíes en nada, verifica todo", pt: "Liquidação — não confie em nada, verifique tudo", fr: "Règlement — ne faites confiance à rien, vérifiez tout", de: "Settlement — vertraue nichts, überprüfe alles", zh: "结算——什么都别信，一切自行验证" },
  agents: { en: "Agents — they bet, they never hold", ru: "Агенты — они ставят, но не держат средства", es: "Agentes — apuestan, nunca custodian", pt: "Agentes — apostam, nunca custodiam", fr: "Agents — ils parient, sans jamais détenir vos fonds", de: "Agenten — sie wetten, halten aber nie dein Geld", zh: "智能体——只下注，绝不托管资金" },
  fan: { en: "Fan — bet from any post", ru: "Фан — ставь из любого поста", es: "Fan — apuesta desde cualquier publicación", pt: "Fã — aposte a partir de qualquer post", fr: "Fan — pariez depuis n'importe quel post", de: "Fan — wette aus jedem Post", zh: "粉丝——从任意帖子下注" },
};

const FAQS: Record<TrackId, QA[]> = {
  settlement: [
    { q: { en: "How do I know a bet can't be rigged?", ru: "Как убедиться, что ставку нельзя подтасовать?", es: "¿Cómo sé que una apuesta no puede amañarse?", pt: "Como sei que uma aposta não pode ser fraudada?", fr: "Comment savoir qu'un pari ne peut pas être truqué ?", de: "Woher weiß ich, dass eine Wette nicht manipuliert werden kann?", zh: "我怎么知道一场下注无法被操纵？" }, a: { en: "resolve() has no admin key. The outcome is pulled from an on-chain oracle stat via CPI and validated on-chain. Anyone can re-check the settlement transaction in an explorer.", ru: "У resolve() нет админ-ключа. Исход берётся из ончейн-статистики оракула через CPI и проверяется ончейн. Любой может перепроверить транзакцию расчёта в эксплорере.", es: "resolve() no tiene clave de administrador. El resultado se toma de una estadística de oráculo on-chain vía CPI y se valida on-chain. Cualquiera puede volver a comprobar la transacción de liquidación en un explorador.", pt: "resolve() não tem chave de administrador. O resultado é obtido de uma estatística de oráculo on-chain via CPI e validado on-chain. Qualquer um pode reverificar a transação de liquidação em um explorador.", fr: "resolve() n'a pas de clé admin. Le résultat provient d'une statistique d'oracle on-chain via CPI et est validé on-chain. N'importe qui peut revérifier la transaction de règlement dans un explorateur.", de: "resolve() hat keinen Admin-Key. Das Ergebnis wird per CPI aus einer On-Chain-Oracle-Statistik bezogen und on-chain validiert. Jeder kann die Settlement-Transaktion in einem Explorer nachprüfen.", zh: "resolve() 没有管理员密钥。结果通过 CPI 从链上预言机数据获取并在链上校验。任何人都能在浏览器中复核该结算交易。" } },
    { q: { en: "What if the data feed is wrong?", ru: "А если данные фида неверны?", es: "¿Y si el feed de datos está mal?", pt: "E se o feed de dados estiver errado?", fr: "Et si le flux de données est erroné ?", de: "Was, wenn der Daten-Feed falsch ist?", zh: "如果数据源出错怎么办？" }, a: { en: "There is a full dispute path: propose, dispute, arbitrate, slash. A malicious reporter loses their stake, and the oracle bridge PDA finalizes the corrected result back into settlement.", ru: "Есть полный путь споров: propose, dispute, arbitrate, slash. Недобросовестный репортёр теряет стейк, а PDA оракул-моста финализирует исправленный результат обратно в расчёт.", es: "Hay una ruta de disputa completa: propose, dispute, arbitrate, slash. Un reportero malicioso pierde su stake, y el PDA del puente de oráculo finaliza el resultado corregido de vuelta en la liquidación.", pt: "Há um caminho de disputa completo: propose, dispute, arbitrate, slash. Um relator malicioso perde seu stake, e o PDA da ponte de oráculo finaliza o resultado corrigido de volta na liquidação.", fr: "Il existe un parcours de litige complet : propose, dispute, arbitrate, slash. Un rapporteur malveillant perd sa mise, et le PDA du pont oracle finalise le résultat corrigé dans le règlement.", de: "Es gibt einen vollständigen Streitpfad: propose, dispute, arbitrate, slash. Ein böswilliger Reporter verliert seinen Stake, und die PDA der Oracle-Bridge finalisiert das korrigierte Ergebnis zurück ins Settlement.", zh: "存在完整的争议流程：propose、dispute、arbitrate、slash。恶意上报者会被罚没质押，预言机桥 PDA 会把更正后的结果最终写回结算。" } },
    { q: { en: "Where is my money held?", ru: "Где хранятся мои деньги?", es: "¿Dónde se guarda mi dinero?", pt: "Onde meu dinheiro fica guardado?", fr: "Où est conservé mon argent ?", de: "Wo wird mein Geld verwahrt?", zh: "我的资金存放在哪里？" }, a: { en: "Nowhere custodial. Bets use a capped, expiring allowance — funds never sit with an admin or a company wallet.", ru: "Нигде под кастодиальным контролем. Ставки используют ограниченное, истекающее разрешение — средства никогда не лежат у админа или в кошельке компании.", es: "En ningún custodio. Las apuestas usan una autorización limitada y con caducidad: los fondos nunca quedan en manos de un administrador ni de una billetera de empresa.", pt: "Em nenhum custodiante. As apostas usam uma autorização limitada e com expiração — os fundos nunca ficam com um admin ou uma carteira da empresa.", fr: "Nulle part en dépôt. Les paris utilisent une autorisation plafonnée et expirante — les fonds ne restent jamais chez un admin ou un portefeuille d'entreprise.", de: "Nirgends verwahrt. Wetten nutzen eine gedeckelte, ablaufende Erlaubnis — Gelder liegen nie bei einem Admin oder einer Firmen-Wallet.", zh: "不经任何托管。下注使用有上限、会过期的授权额度——资金绝不停留在管理员或公司钱包中。" } },
    { q: { en: "Is this live or a mockup?", ru: "Это вживую или макет?", es: "¿Esto es real o una maqueta?", pt: "Isto é real ou uma simulação?", fr: "Est-ce réel ou une maquette ?", de: "Ist das live oder ein Mockup?", zh: "这是真实运行还是演示样机？" }, a: { en: "Live on Solana devnet. Every settlement, dispute and payout is a real transaction you can open in Solana Explorer.", ru: "Вживую на Solana devnet. Каждый расчёт, спор и выплата — реальная транзакция, которую можно открыть в Solana Explorer.", es: "Real en Solana devnet. Cada liquidación, disputa y pago es una transacción real que puedes abrir en Solana Explorer.", pt: "Real na Solana devnet. Cada liquidação, disputa e pagamento é uma transação real que você pode abrir no Solana Explorer.", fr: "Réel sur Solana devnet. Chaque règlement, litige et paiement est une transaction réelle que vous pouvez ouvrir dans Solana Explorer.", de: "Live auf Solana devnet. Jedes Settlement, jeder Dispute und jede Auszahlung ist eine echte Transaktion, die du im Solana Explorer öffnen kannst.", zh: "在 Solana devnet 上真实运行。每一次结算、争议和赔付都是可在 Solana Explorer 中打开的真实交易。" } },
  ],
  agents: [
    { q: { en: "Can an agent drain my funds?", ru: "Может ли агент увести мои средства?", es: "¿Puede un agente vaciar mis fondos?", pt: "Um agente pode drenar meus fundos?", fr: "Un agent peut-il vider mes fonds ?", de: "Kann ein Agent mein Guthaben leerräumen?", zh: "智能体会掏空我的资金吗？" }, a: { en: "No. It runs on a capped, expiring allowance and reverts with AmountExceedsLimit past the cap. An agent can place bets, but it can never withdraw or move your balance.", ru: "Нет. Он работает на ограниченном, истекающем разрешении и откатывается с AmountExceedsLimit при превышении лимита. Агент может ставить, но никогда не выведет и не переместит твой баланс.", es: "No. Funciona con una autorización limitada y con caducidad, y revierte con AmountExceedsLimit al superar el límite. Un agente puede apostar, pero nunca puede retirar ni mover tu saldo.", pt: "Não. Ele opera com uma autorização limitada e com expiração e reverte com AmountExceedsLimit ao passar do limite. Um agente pode apostar, mas nunca pode sacar ou mover seu saldo.", fr: "Non. Il fonctionne avec une autorisation plafonnée et expirante et échoue avec AmountExceedsLimit au-delà du plafond. Un agent peut parier, mais ne peut jamais retirer ni déplacer votre solde.", de: "Nein. Er läuft mit einer gedeckelten, ablaufenden Erlaubnis und bricht mit AmountExceedsLimit ab, sobald das Limit überschritten wird. Ein Agent kann wetten, aber niemals dein Guthaben abheben oder bewegen.", zh: "不会。它运行在有上限、会过期的授权额度上，超限即以 AmountExceedsLimit 回滚。智能体可以下注，但绝不能提取或转移你的余额。" } },
    { q: { en: "How does the agent decide?", ru: "Как агент принимает решения?", es: "¿Cómo decide el agente?", pt: "Como o agente decide?", fr: "Comment l'agent décide-t-il ?", de: "Wie entscheidet der Agent?", zh: "智能体如何做决策？" }, a: { en: "It runs model inference, and every decision is anchored as a Proof-of-Inference receipt — an ed25519 signature written into a Solana Memo.", ru: "Он запускает инференс модели, и каждое решение фиксируется как чек Proof-of-Inference — подпись ed25519, записанная в Solana Memo.", es: "Ejecuta inferencia del modelo, y cada decisión se ancla como un recibo Proof-of-Inference: una firma ed25519 escrita en un Solana Memo.", pt: "Ele executa inferência do modelo, e cada decisão é ancorada como um recibo Proof-of-Inference — uma assinatura ed25519 gravada em um Solana Memo.", fr: "Il exécute l'inférence du modèle, et chaque décision est ancrée sous forme de reçu Proof-of-Inference — une signature ed25519 inscrite dans un Solana Memo.", de: "Er führt Modell-Inferenz aus, und jede Entscheidung wird als Proof-of-Inference-Beleg verankert — eine ed25519-Signatur, geschrieben in ein Solana Memo.", zh: "它执行模型推理，每个决策都以 Proof-of-Inference 凭据锚定——一条写入 Solana Memo 的 ed25519 签名。" } },
    { q: { en: "Can I stop it whenever I want?", ru: "Могу ли я остановить его в любой момент?", es: "¿Puedo detenerlo cuando quiera?", pt: "Posso pará-lo quando quiser?", fr: "Puis-je l'arrêter quand je veux ?", de: "Kann ich ihn jederzeit stoppen?", zh: "我能随时停止它吗？" }, a: { en: "Yes. The allowance expires on its own, and you can revoke it on-chain at any moment.", ru: "Да. Разрешение истекает само, и ты можешь отозвать его ончейн в любой момент.", es: "Sí. La autorización caduca por sí sola y puedes revocarla on-chain en cualquier momento.", pt: "Sim. A autorização expira sozinha e você pode revogá-la on-chain a qualquer momento.", fr: "Oui. L'autorisation expire d'elle-même, et vous pouvez la révoquer on-chain à tout moment.", de: "Ja. Die Erlaubnis läuft von selbst ab, und du kannst sie jederzeit on-chain widerrufen.", zh: "可以。授权额度会自行过期，你也可以随时在链上撤销它。" } },
    { q: { en: "Do I have to trust the model blindly?", ru: "Нужно ли слепо доверять модели?", es: "¿Tengo que confiar en el modelo a ciegas?", pt: "Tenho que confiar cegamente no modelo?", fr: "Dois-je faire aveuglément confiance au modèle ?", de: "Muss ich dem Modell blind vertrauen?", zh: "我必须盲目相信模型吗？" }, a: { en: "No — you can verify the inference digest on-chain yourself in the Verify section above.", ru: "Нет — ты можешь сам проверить дайджест инференса ончейн в разделе Verify выше.", es: "No: puedes verificar tú mismo el digest de la inferencia on-chain en la sección Verify de arriba.", pt: "Não — você mesmo pode verificar o digest da inferência on-chain na seção Verify acima.", fr: "Non — vous pouvez vérifier vous-même le digest de l'inférence on-chain dans la section Verify ci-dessus.", de: "Nein — du kannst den Inferenz-Digest oben im Abschnitt Verify selbst on-chain überprüfen.", zh: "不必——你可以在上方的 Verify 部分自行在链上校验推理摘要。" } },
  ],
  fan: [
    { q: { en: "How do I bet from a post?", ru: "Как поставить прямо из поста?", es: "¿Cómo apuesto desde una publicación?", pt: "Como aposto a partir de um post?", fr: "Comment parier depuis un post ?", de: "Wie wette ich aus einem Post?", zh: "我如何从帖子里下注？" }, a: { en: "Through a Solana Blink. You sign the transaction straight from the post surface — no app install, no redirect maze.", ru: "Через Solana Blink. Ты подписываешь транзакцию прямо в посте — без установки приложения и лабиринта редиректов.", es: "A través de un Solana Blink. Firmas la transacción directamente desde el propio post: sin instalar apps, sin laberinto de redirecciones.", pt: "Através de um Solana Blink. Você assina a transação direto no próprio post — sem instalar app, sem labirinto de redirecionamentos.", fr: "Via un Solana Blink. Vous signez la transaction directement depuis le post — sans installation d'appli, sans labyrinthe de redirections.", de: "Über einen Solana Blink. Du signierst die Transaktion direkt im Post — ohne App-Installation, ohne Redirect-Labyrinth.", zh: "通过 Solana Blink。你直接在帖子界面签署交易——无需安装应用，也没有跳转迷宫。" } },
    { q: { en: "How do creators earn?", ru: "Как зарабатывают авторы?", es: "¿Cómo ganan los creadores?", pt: "Como os criadores ganham?", fr: "Comment les créateurs gagnent-ils ?", de: "Wie verdienen Creator?", zh: "创作者如何赚钱？" }, a: { en: "An affiliate split rides on the bet via a ref tag, capped at 5%. Payouts settle automatically on-chain — no invoicing, no manual payouts.", ru: "Партнёрская доля идёт со ставки через ref-тег, максимум 5%. Выплаты проходят автоматически ончейн — без счетов и ручных переводов.", es: "Un reparto de afiliado viaja con la apuesta mediante una etiqueta ref, con un tope del 5%. Los pagos se liquidan automáticamente on-chain: sin facturas, sin pagos manuales.", pt: "Uma divisão de afiliado acompanha a aposta via uma tag ref, limitada a 5%. Os pagamentos são liquidados automaticamente on-chain — sem faturas, sem pagamentos manuais.", fr: "Un partage d'affiliation accompagne le pari via un tag ref, plafonné à 5 %. Les paiements se règlent automatiquement on-chain — sans facture, sans paiement manuel.", de: "Ein Affiliate-Anteil reist über ein ref-Tag mit der Wette, gedeckelt bei 5 %. Auszahlungen erfolgen automatisch on-chain — keine Rechnungen, keine manuellen Zahlungen.", zh: "推广分成通过 ref 标签随下注一起结算，上限 5%。赔付在链上自动完成——无需开票，无需手动付款。" } },
    { q: { en: "Do fans need a special app?", ru: "Нужно ли фанатам особое приложение?", es: "¿Los fans necesitan una app especial?", pt: "Os fãs precisam de um app especial?", fr: "Les fans ont-ils besoin d'une appli spéciale ?", de: "Brauchen Fans eine spezielle App?", zh: "粉丝需要专门的应用吗？" }, a: { en: "Any Solana wallet works. The Blink builds and hands over the transaction for you to sign.", ru: "Подойдёт любой кошелёк Solana. Blink собирает транзакцию и отдаёт её тебе на подпись.", es: "Cualquier billetera de Solana sirve. El Blink construye y te entrega la transacción para que la firmes.", pt: "Qualquer carteira Solana serve. O Blink monta e entrega a transação para você assinar.", fr: "N'importe quel portefeuille Solana convient. Le Blink construit et vous remet la transaction à signer.", de: "Jede Solana-Wallet funktioniert. Der Blink baut die Transaktion und übergibt sie dir zum Signieren.", zh: "任何 Solana 钱包都可以。Blink 会构建并把交易交给你签署。" } },
    { q: { en: "Is the payout automatic?", ru: "Выплата автоматическая?", es: "¿El pago es automático?", pt: "O pagamento é automático?", fr: "Le paiement est-il automatique ?", de: "Erfolgt die Auszahlung automatisch?", zh: "赔付是自动的吗？" }, a: { en: "Yes. When a market settles, the payout transaction fires on-chain — no claim button required.", ru: "Да. Когда рынок рассчитывается, транзакция выплаты срабатывает ончейн — без кнопки claim.", es: "Sí. Cuando un mercado se liquida, la transacción de pago se dispara on-chain: sin botón de reclamo.", pt: "Sim. Quando um mercado é liquidado, a transação de pagamento dispara on-chain — sem botão de resgate.", fr: "Oui. Quand un marché est réglé, la transaction de paiement se déclenche on-chain — sans bouton de réclamation.", de: "Ja. Wenn ein Markt abgerechnet wird, wird die Auszahlungs-Transaktion on-chain ausgelöst — kein Claim-Button nötig.", zh: "是的。当市场结算时，赔付交易会在链上触发——无需点击领取按钮。" } },
  ],
};

const collapsed = { height: 0, opacity: 0 } as const;
const expanded = { height: "auto", opacity: 1 } as const;
const answerTrans = { duration: 0.25, ease: "easeOut" } as const;

export default function PerTrackFaq() {
  const lang = useLang();
  const [trackId] = useTrack();
  const track: TrackId = trackId ?? "settlement";
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    setOpen(null);
  }, [track]);

  const items = FAQS[track];

  return (
    <section id="track-faq" className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-nyx">{pick(lang, { en: "FAQ", ru: "Частые вопросы", es: "FAQ", pt: "FAQ", fr: "FAQ", de: "FAQ", zh: "常见问题" })}</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {pick(lang, TITLES[track])}
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={track + String(i)}
                className="rounded-3xl border border-hairline bg-subtle"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium sm: text-ink">
                    {pick(lang, f.q)}
                  </span>
                  <ChevronDown
                    className={
                      "h-4 w-4 shrink-0 text-muted transition-transform " +
                      (isOpen ? "rotate-180" : "")
                    }
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={collapsed}
                      animate={expanded}
                      exit={collapsed}
                      transition={answerTrans}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                        {pick(lang, f.a)}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
