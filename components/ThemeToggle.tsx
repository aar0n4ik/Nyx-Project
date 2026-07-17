"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const iconVariants = { initial: { opacity: 0, rotate: -90, scale: 0.5 }, animate: { opacity: 1, rotate: 0, scale: 1 }, exit: { opacity: 0, rotate: 90, scale: 0.5 } };
const iconTrans = { duration: 0.2, ease: "easeOut" } as const;

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) root.classList.add("dark");
    else root.classList.remove("dark");
    try { window.localStorage.setItem("nyx-theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-hairline text-ink transition hover:bg-ink/5"
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark ? (
          <motion.svg key="moon" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTrans} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        ) : (
          <motion.svg key="sun" variants={iconVariants} initial="initial" animate="animate" exit="exit" transition={iconTrans} width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}
