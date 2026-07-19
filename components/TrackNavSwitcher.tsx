"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useLang, pick } from "@/lib/i18n";
import { TRACK_META, TRACK_ORDER } from "@/lib/tracks";
import TrackIcon from "@/components/TrackIcon";

const menuVariants = { hidden: { opacity: 0, y: -6, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1 } };
const menuTrans = { duration: 0.16, ease: "easeOut" } as const;

export default function TrackNavSwitcher() {
  const lang = useLang();
  const [track, setTrack] = useTrack();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = track ? TRACK_META[track] : null;
  const choose = (id: TrackId) => {
    setTrack(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg border border-hairline px-2.5 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/5" aria-haspopup="true" aria-expanded={open}>
        <span className="text-muted">{current ? <TrackIcon id={current.id} className="h-4 w-4" /> : null}</span>
        <span className="hidden max-w-[14rem] truncate sm:inline">
          {current ? pick(lang, current.name) : pick(lang, { en: "Track", ru: "Трек", es: "Track", pt: "Track", fr: "Track", de: "Track", zh: "赛道" })}
        </span>
        <span className="text-muted">▾</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul variants={menuVariants} initial="hidden" animate="visible" exit="hidden" transition={menuTrans} className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-hairline bg-subtle p-1 shadow-xl">
            {TRACK_ORDER.map((id) => {
              const o = TRACK_META[id];
              const isOn = id === track;
              return (
                <li key={id}>
                  <button type="button" onClick={() => choose(id)} className={"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-ink/5 " + (isOn ? "bg-ink/5" : "")}>
                    <span className={isOn ? "text-nyx" : "text-muted"}><TrackIcon id={id} className="h-4 w-4" /></span>
                    <span className="flex-1 text-sm font-medium text-ink">{pick(lang, o.name)}</span>
                    {isOn ? <span className="text-nyx"></span> : null}
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
