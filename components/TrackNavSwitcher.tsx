"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const OPTIONS: { id: TrackId; emoji: string; label: string; sub: L }[] = [
  {
    id: "settlement",
    emoji: "🏁",
    label: "Settlement",
    sub: { en: "No admin key decides your bet.", ru: "Никакой админ-ключ не решает ставку.", es: "Ninguna clave decide tu apuesta.", pt: "Nenhuma chave decide sua aposta.", fr: "Aucune clé ne décide de votre pari.", de: "Kein Admin-Key entscheidet.", zh: "无管理员密钥决定结果。" },
  },
  {
    id: "agents",
    emoji: "🤖",
    label: "Agents",
    sub: { en: "An agent bets, never holds funds.", ru: "Агент ставит, но не держит средства.", es: "Un agente apuesta, no retiene fondos.", pt: "Um agente aposta, não guarda fundos.", fr: "Un agent parie, ne détient rien.", de: "Ein Agent wettet, hält nichts.", zh: "智能体下注，不碰资金。" },
  },
  {
    id: "fan",
    emoji: "🎉",
    label: "Fan",
    sub: { en: "Bet from any post.", ru: "Ставка из любого поста.", es: "Apuesta desde cualquier post.", pt: "Aposte de qualquer post.", fr: "Pariez depuis un post.", de: "Wette aus jedem Post.", zh: "从任意帖子下注。" },
  },
];

const menuVariants = { hidden: { opacity: 0, y: -6, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1 } };
const menuTrans = { duration: 0.16, ease: "easeOut" } as const;

export default function TrackNavSwitcher() {
  const lang = useLang();
  const [track, setTrack] = useTrack();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = OPTIONS.find((o) => o.id === track) || null;
  const choose = (id: TrackId) => {
    setTrack(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span>{current ? current.emoji : "🎯"}</span>
        <span className="hidden text-[13px] lg:inline">
          {current ? current.label : pick(lang, { en: "Track", ru: "Трек", es: "Recorrido", pt: "Trilha", fr: "Parcours", de: "Track", zh: "路线" })}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={"opacity-60 transition-transform " + (open ? "rotate-180" : "")}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={menuTrans}
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-hairline bg-subtle p-1 shadow-xl"
          >
            {OPTIONS.map((o) => {
              const isOn = o.id === track;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => choose(o.id)}
                    className={
                      "flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-ink/5 " +
                      (isOn ? "bg-ink/5" : "")
                    }
                  >
                    <span className="mt-0.5 text-lg">{o.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{o.label}</span>
                      <span className="block text-xs text-muted">{pick(lang, o.sub)}</span>
                    </span>
                    {isOn ? <span className="ml-auto text-nyx">✓</span> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
