"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrack, isTrackId, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const OPTIONS: { id: TrackId; emoji: string; title: string; sub: L }[] = [
  {
    id: "settlement",
    emoji: "🏁",
    title: "Settlement",
    sub: { en: "No admin key can decide your bet.", ru: "Ни один админ-ключ не решает исход твоей ставки.", es: "Ninguna clave de administrador puede decidir tu apuesta.", pt: "Nenhuma chave de administrador pode decidir sua aposta.", fr: "Aucune clé admin ne peut décider de votre pari.", de: "Kein Admin-Key kann über deine Wette entscheiden.", zh: "没有任何管理员密钥能决定你的下注结果。" },
  },
  {
    id: "agents",
    emoji: "🤖",
    title: "Agents",
    sub: { en: "An agent bets for you — it never holds your funds.", ru: "Агент делает ставки за тебя — и никогда не держит твои средства.", es: "Un agente apuesta por ti y nunca retiene tus fondos.", pt: "Um agente aposta por você — e nunca guarda seus fundos.", fr: "Un agent parie pour vous — sans jamais détenir vos fonds.", de: "Ein Agent wettet für dich — und hält nie deine Gelder.", zh: "智能体替你下注——却永远不碰你的资金。" },
  },
  {
    id: "fan",
    emoji: "🎉",
    title: "Fan",
    sub: { en: "Bet from any post. Creators earn automatically.", ru: "Делай ставку из любого поста. Авторы зарабатывают автоматически.", es: "Apuesta desde cualquier publicación. Los creadores ganan automáticamente.", pt: "Aposte a partir de qualquer post. Os criadores ganham automaticamente.", fr: "Pariez depuis n'importe quelle publication. Les créateurs gagnent automatiquement.", de: "Wette aus jedem Post. Creator verdienen automatisch.", zh: "从任意帖子下注。创作者自动获得收益。" },
  },
];

const overlayInit = { opacity: 0 } as const;
const overlayAnim = { opacity: 1 } as const;
const overlayExit = { opacity: 0 } as const;
const panelInit = { opacity: 0, y: 24, scale: 0.98 } as const;
const panelAnim = { opacity: 1, y: 0, scale: 1 } as const;
const panelExit = { opacity: 0, y: 16, scale: 0.98 } as const;
const panelTrans = { duration: 0.28, ease: "easeOut" } as const;
const cardTrans = { duration: 0.3, ease: "easeOut" } as const;

export default function TrackModal() {
  const lang = useLang();
  const [, setTrack] = useTrack();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("nyx-track");
      if (!isTrackId(saved)) setOpen(true);
    } catch (e) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const choose = (id: TrackId) => {
    setTrack(id);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={overlayInit}
          animate={overlayAnim}
          exit={overlayExit}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={panelInit}
            animate={panelAnim}
            exit={panelExit}
            transition={panelTrans}
            className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-hairline bg-base p-6 shadow-2xl sm:p-8"
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-nyx/20 blur-[90px]"
              aria-hidden="true"
            />
            <div className="relative text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                {pick(lang, { en: "Welcome to Nyx", ru: "Добро пожаловать в Nyx", es: "Bienvenido a Nyx", pt: "Bem-vindo à Nyx", fr: "Bienvenue sur Nyx", de: "Willkommen bei Nyx", zh: "欢迎来到 Nyx" })}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {pick(lang, { en: "Choose your track", ru: "Выбери свой трек", es: "Elige tu recorrido", pt: "Escolha sua trilha", fr: "Choisissez votre parcours", de: "Wähle deinen Track", zh: "选择你的路线" })}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                {pick(lang, { en: "Pick how you want to experience Nyx — you can switch anytime.", ru: "Выбери, как хочешь познакомиться с Nyx — переключиться можно в любой момент.", es: "Elige cómo quieres experimentar Nyx: puedes cambiar cuando quieras.", pt: "Escolha como quer experimentar a Nyx — você pode trocar quando quiser.", fr: "Choisissez comment découvrir Nyx — vous pouvez changer à tout moment.", de: "Wähle, wie du Nyx erleben willst — du kannst jederzeit wechseln.", zh: "选择你想如何体验 Nyx——随时都能切换。" })}
              </p>
            </div>

            <div className="relative mt-6 space-y-3">
              {OPTIONS.map((o, i) => (
                <motion.button
                  key={o.id}
                  type="button"
                  onClick={() => choose(o.id)}
                  aria-label={"Choose the " + o.title + " track"}
                  initial={panelInit}
                  animate={panelAnim}
                  transition={{ duration: 0.3, delay: 0.06 * i, ease: "easeOut" }}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-hairline bg-subtle p-4 text-left transition hover:border-nyx/50 hover:bg-base"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-base text-2xl transition group-hover:scale-110">
                    {o.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-ink">{o.title}</span>
                    <span className="block text-sm text-muted">{pick(lang, o.sub)}</span>
                  </span>
                  <span className="ml-auto shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-nyx">
                    →
                  </span>
                </motion.button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => choose("settlement")}
              className="relative mt-5 block w-full text-center text-xs font-medium text-muted transition hover:text-ink"
            >
              {pick(lang, { en: "Explore everything", ru: "Посмотреть всё", es: "Explorar todo", pt: "Explorar tudo", fr: "Tout explorer", de: "Alles erkunden", zh: "浏览全部" })}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
