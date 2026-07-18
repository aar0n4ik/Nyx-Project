"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useLang, pick } from "@/lib/i18n";

const olInit = { opacity: 0, y: 12 } as const;
const olAnim = { opacity: 1, y: 0 } as const;
const olExit = { opacity: 0, y: -12 } as const;
const olTrans = { duration: 0.3 } as const;
const liInit = { opacity: 0, x: -12 } as const;
const liAnim = { opacity: 1, x: 0 } as const;
const liTrans = (i: number) => ({ delay: i * 0.1 });

const MODES = {
  proof: {
    label: { en: "Proof-gated", ru: "По пруфу", es: "Con prueba", pt: "Com prova", fr: "Sur preuve", de: "Proof-gesteuert", zh: "凭证驱动" },
    tint: "text-nyx",
    steps: [
      { en: "Oracle emits txoracle.validate_stat_v2", ru: "Оракул вызывает txoracle.validate_stat_v2", es: "El oráculo emite txoracle.validate_stat_v2", pt: "O oráculo emite txoracle.validate_stat_v2", fr: "L'oracle émet txoracle.validate_stat_v2", de: "Orakel sendet txoracle.validate_stat_v2", zh: "预言机发出 txoracle.validate_stat_v2" },
      { en: "nyx_verifier checks the signed proof", ru: "nyx_verifier проверяет подписанный пруф", es: "nyx_verifier verifica la prueba firmada", pt: "nyx_verifier verifica a prova assinada", fr: "nyx_verifier vérifie la preuve signée", de: "nyx_verifier prüft den signierten Beweis", zh: "nyx_verifier 校验已签名的证明" },
      { en: "settle_verified CPI fires automatically", ru: "settle_verified CPI срабатывает автоматически", es: "el CPI settle_verified se dispara automáticamente", pt: "o CPI settle_verified dispara automaticamente", fr: "le CPI settle_verified se déclenche automatiquement", de: "settle_verified-CPI wird automatisch ausgelöst", zh: "settle_verified CPI 自动触发" },
      { en: "Payout streamed — no human ever touches it", ru: "Выплата идёт потоком — человек к ней не прикасается", es: "El pago se transmite: ningún humano lo toca", pt: "O pagamento é transmitido — nenhum humano o toca", fr: "Le paiement est diffusé — aucun humain n'y touche", de: "Auszahlung gestreamt — kein Mensch berührt sie", zh: "赔付自动流转——无人经手" },
    ],
  },
  dispute: {
    label: { en: "Dispute game", ru: "Игра споров", es: "Juego de disputa", pt: "Jogo de disputa", fr: "Jeu de litige", de: "Dispute-Spiel", zh: "争议博弈" },
    tint: "text-verify",
    steps: [
      { en: "Proposer posts outcome + bond", ru: "Предлагающий вносит исход и залог", es: "El proponente publica el resultado + fianza", pt: "O proponente publica o resultado + garantia", fr: "Le proposeur publie le résultat + caution", de: "Vorschlagender postet Ergebnis + Pfand", zh: "提议者提交结果 + 保证金" },
      { en: "Challenger disputes inside the window", ru: "Оспаривающий подаёт спор в течение окна", es: "El retador disputa dentro de la ventana", pt: "O contestante disputa dentro da janela", fr: "Le contestataire conteste dans la fenêtre", de: "Herausforderer widerspricht im Zeitfenster", zh: "挑战者在窗口期内提出争议" },
      { en: "Arbiter rules, loser bond is slashed", ru: "Арбитр решает, залог проигравшего сжигается", es: "El árbitro decide, la fianza del perdedor se penaliza", pt: "O árbitro decide, a garantia do perdedor é penalizada", fr: "L'arbitre tranche, la caution du perdant est confisquée", de: "Schiedsrichter entscheidet, Pfand des Verlierers wird geslasht", zh: "仲裁者裁定，败方保证金被罚没" },
      { en: "oracle_bridge PDA → nyx_settlement.resolve", ru: "oracle_bridge PDA → nyx_settlement.resolve", es: "oracle_bridge PDA → nyx_settlement.resolve", pt: "oracle_bridge PDA → nyx_settlement.resolve", fr: "oracle_bridge PDA → nyx_settlement.resolve", de: "oracle_bridge PDA → nyx_settlement.resolve", zh: "oracle_bridge PDA → nyx_settlement.resolve" },
    ],
  },
};

type Key = keyof typeof MODES;

const EYEBROW = { en: "Two paths, one guarantee", ru: "Два пути, одна гарантия", es: "Dos caminos, una garantía", pt: "Dois caminhos, uma garantia", fr: "Deux voies, une garantie", de: "Zwei Wege, eine Garantie", zh: "两条路径，一个保证" };
const HEADING = { en: "Settlement without a referee", ru: "Расчёт без арбитра", es: "Liquidación sin árbitro", pt: "Liquidação sem árbitro", fr: "Règlement sans arbitre", de: "Abwicklung ohne Schiedsrichter", zh: "无需裁判的结算" };

export default function Settlement() {
  const lang = useLang();
  const [mode, setMode] = useState<Key>("proof");
  const active = MODES[mode];
  return (
    <section className="bg-subtle py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal>
          <div className="mb-3 text-center text-xs font-mono uppercase tracking-widest text-nyx">{pick(lang, EYEBROW)}</div>
          <h2 className="text-center font-display text-3xl font-bold text-ink md:text-5xl">{pick(lang, HEADING)}</h2>
        </Reveal>
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-xl border border-hairline bg-base p-1">
            {(Object.keys(MODES) as Key[]).map((k) => (
              <button key={k} onClick={() => setMode(k)} className={"rounded-lg px-5 py-2 text-sm font-semibold transition-colors " + (mode === k ? "bg-ink text-[rgb(var(--base))]" : "text-muted hover:text-ink")}>{pick(lang, MODES[k].label)}</button>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.ol key={mode} initial={olInit} animate={olAnim} exit={olExit} transition={olTrans} className="space-y-3">
              {active.steps.map((s, i) => (
                <motion.li key={i} initial={liInit} animate={liAnim} transition={liTrans(i)} className="flex items-center gap-4 rounded-xl border border-hairline bg-base p-4">
                  <span className={"flex h-8 w-8 items-center justify-center rounded-full bg-subtle font-mono text-sm font-bold " + active.tint}>{i + 1}</span>
                  <span className="text-sm text-ink">{pick(lang, s)}</span>
                  <Check className={"ml-auto h-4 w-4 " + active.tint} />
                </motion.li>
              ))}
            </motion.ol>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
