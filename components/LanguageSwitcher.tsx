"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Lang = { code: string; label: string };

const LANGS: Lang[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
];

const menuVariants = { hidden: { opacity: 0, y: -6, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1 } };
const menuTrans = { duration: 0.16, ease: "easeOut" } as const;

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("nyx-lang") : null;
    if (saved) {
      setLang(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (code: string) => {
    setLang(code);
    setOpen(false);
    document.documentElement.lang = code;
    try { window.localStorage.setItem("nyx-lang", code); } catch {}
    window.dispatchEvent(new CustomEvent("nyx-lang-change", { detail: code }));
  };

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-sm font-medium text-ink transition hover:bg-ink/5"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="text-[13px] uppercase tracking-wide">{current.code}</span>
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
            className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-hairline bg-subtle p-1 shadow-xl"
          >
            {LANGS.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => choose(l.code)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-ink/5"
                >
                  <span>{l.label}</span>
                  <span className="text-xs uppercase text-muted">{l.code}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
