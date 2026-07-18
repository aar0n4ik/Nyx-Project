"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang, pick } from "@/lib/i18n";
import InlineBlink from "@/components/InlineBlink";

const overlayInit = { opacity: 0 } as const;
const overlayAnim = { opacity: 1 } as const;
const panelInit = { opacity: 0, scale: 0.94, y: 20 } as const;
const panelAnim = { opacity: 1, scale: 1, y: 0 } as const;
const panelTrans = { type: "spring", stiffness: 260, damping: 24 } as const;

export default function BetModal({ open, onClose, question, startProb = 62 }: { open: boolean; onClose: () => void; question?: string; startProb?: number }) {
  const lang = useLang();
  const [stake, setStake] = useState(100);
  const [prob, setProb] = useState(startProb);

  useEffect(() => { if (open) setProb(startProb); }, [open, startProb]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const q = question ?? pick(lang, { en: "Will BTC close above $80k?", ru: "BTC закроется выше $80k?", es: "¿BTC cerrará por encima de $80k?", pt: "O BTC vai fechar acima de $80k?", fr: "Le BTC clôturera-t-il au-dessus de 80k$ ?", de: "Schließt BTC über 80k $?", zh: "BTC 会收在 $80k 以上吗？" });
  const payout = (stake / (prob / 100)).toFixed(2);
  const profit = (Number(payout) - stake).toFixed(2);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={overlayInit} animate={overlayAnim} exit={overlayInit}>
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" initial={panelInit} animate={panelAnim} exit={panelInit} transition={panelTrans} className="relative z-10 w-full max-w-md rounded-2xl border border-hairline bg-base p-6 shadow-2xl">
            <button onClick={onClose} aria-label={pick(lang, { en: "Close", ru: "Закрыть", es: "Cerrar", pt: "Fechar", fr: "Fermer", de: "Schließen", zh: "关闭" })} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-subtle hover:text-ink">×</button>
            <div className="mb-1 text-xs font-mono uppercase tracking-widest text-nyx">{pick(lang, { en: "Zero-custody bet", ru: "Ставка без кастодиана", es: "Apuesta sin custodia", pt: "Aposta sem custódia", fr: "Pari sans garde", de: "Wette ohne Verwahrung", zh: "零托管下注" })}</div>
            <h3 className="font-display text-xl font-bold leading-snug text-ink">{q}</h3>
            <p className="mt-1 text-sm text-muted">{pick(lang, { en: "Funds never leave your wallet. Settlement is on-chain.", ru: "Средства не покидают твой кошелёк. Расчёт — ончейн.", es: "Los fondos nunca salen de tu billetera. La liquidación es on-chain.", pt: "Os fundos nunca saem da sua carteira. A liquidação é on-chain.", fr: "Les fonds ne quittent jamais votre portefeuille. Le règlement est on-chain.", de: "Die Gelder verlassen nie deine Wallet. Die Abrechnung erfolgt on-chain.", zh: "资金从不离开你的钱包。结算在链上完成。" })}</p>
            <div className="mt-5 space-y-5">
              <div>
                <div className="flex justify-between text-sm"><span className="text-muted">{pick(lang, { en: "Stake", ru: "Ставка", es: "Apuesta", pt: "Aposta", fr: "Mise", de: "Einsatz", zh: "本金" })}</span><span className="font-mono font-semibold text-ink">{stake} USD₮</span></div>
                <input type="range" min={10} max={1000} step={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-2 w-full accent-nyx" />
              </div>
              <div>
                <div className="flex justify-between text-sm"><span className="text-muted">{pick(lang, { en: "Implied probability", ru: "Подразумеваемая вероятность", es: "Probabilidad implícita", pt: "Probabilidade implícita", fr: "Probabilité implicite", de: "Implizite Wahrscheinlichkeit", zh: "隐含概率" })}</span><span className="font-mono font-semibold text-ink">{prob}%</span></div>
                <input type="range" min={5} max={95} step={1} value={prob} onChange={(e) => setProb(Number(e.target.value))} className="mt-2 w-full accent-verify" />
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <div className="flex justify-between text-sm"><span className="text-muted">{pick(lang, { en: "Potential payout", ru: "Потенциальная выплата", es: "Pago potencial", pt: "Pagamento potencial", fr: "Gain potentiel", de: "Mögliche Auszahlung", zh: "潜在赔付" })}</span><span className="font-mono font-bold text-payout">{payout} USD₮</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted">{pick(lang, { en: "Net profit", ru: "Чистая прибыль", es: "Ganancia neta", pt: "Lucro líquido", fr: "Profit net", de: "Nettogewinn", zh: "净利润" })}</span><span className="font-mono font-semibold text-ink">+{profit} USD₮</span></div>
              </div>
              <InlineBlink url="https://nyx-project-roan.vercel.app/api/actions/delegate" />
              <p className="text-center text-xs text-muted">{pick(lang, { en: "Capped, expiring allowance. Revert on AmountExceedsLimit.", ru: "Ограниченное, истекающее разрешение. Откат при AmountExceedsLimit.", es: "Autorización limitada y con expiración. Revierte con AmountExceedsLimit.", pt: "Permissão limitada e com expiração. Reverte em AmountExceedsLimit.", fr: "Autorisation plafonnée et expirante. Revert sur AmountExceedsLimit.", de: "Begrenzte, ablaufende Freigabe. Revert bei AmountExceedsLimit.", zh: "有上限、会过期的授权额度。触发 AmountExceedsLimit 时回滚。" })}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
