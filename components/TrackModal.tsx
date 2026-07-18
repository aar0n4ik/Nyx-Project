"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrack, isTrackId, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import { TRACK_META, TRACK_ORDER } from "@/lib/tracks";
import TrackIcon from "@/components/TrackIcon";

const overlayInit = { opacity: 0 } as const;
const overlayAnim = { opacity: 1 } as const;
const panelInit = { opacity: 0, y: 24, scale: 0.98 } as const;
const panelAnim = { opacity: 1, y: 0, scale: 1 } as const;
const panelExit = { opacity: 0, y: 16, scale: 0.98 } as const;
const panelTrans = { duration: 0.28, ease: "easeOut" } as const;

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
        <motion.div initial={overlayInit} animate={overlayAnim} exit={overlayInit} className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <motion.div initial={panelInit} animate={panelAnim} exit={panelExit} transition={panelTrans} className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-hairline bg-base p-6 shadow-2xl sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-nyx/10 blur-3xl" />
            <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              {pick(lang, { en: "Welcome to Nyx", ru: "Добро пожаловать в Nyx", es: "Bienvenido a Nyx", pt: "Bem-vindo à Nyx", fr: "Bienvenue sur Nyx", de: "Willkommen bei Nyx", zh: "欢迎来到 Nyx" })}
            </p>
            <h2 className="relative mt-3 text-2xl font-semibold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              {pick(lang, { en: "Choose your track", ru: "Выберите свой трек", es: "Elige tu track", pt: "Escolha seu track", fr: "Choisissez votre track", de: "Wähle deinen Track", zh: "选择你的赛道" })}
            </h2>

            <div className="relative mt-6 flex flex-col gap-3">
              {TRACK_ORDER.map((id, i) => {
                const o = TRACK_META[id];
                return (
                  <motion.button key={id} type="button" onClick={() => choose(id)} aria-label={"Choose the " + o.name.en + " track"} initial={panelInit} animate={panelAnim} transition={{ duration: 0.3, delay: 0.06 * i, ease: "easeOut" }} className="group flex w-full items-center gap-4 rounded-2xl border border-hairline bg-subtle p-4 text-left transition hover:border-nyx/50 hover:bg-base">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hairline bg-base text-ink transition group-hover:border-nyx/50 group-hover:text-nyx">
                      <TrackIcon id={id} className="h-5 w-5" />
                    </span>
                    <span className="flex-1 font-medium text-ink">{pick(lang, o.name)}</span>
                    <span className="font-mono text-xs text-muted">0{i + 1}</span>
                    <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-nyx">→</span>
                  </motion.button>
                );
              })}
            </div>

            <p className="relative mt-6 text-center text-xs text-muted">
              {pick(lang, { en: "Switch anytime from the navigation.", ru: "Переключиться можно в любой момент в навигации.", es: "Cambia cuando quieras desde la navegación.", pt: "Troque quando quiser pela navegação.", fr: "Changez à tout moment depuis la navigation.", de: "Jederzeit über die Navigation wechselbar.", zh: "随时可在导航中切换。" })}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
