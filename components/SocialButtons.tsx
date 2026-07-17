"use client";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

type Social = { label: string; href: string; color: string; path: string };

const GH = "https://github" + ".com/aar0n4ik";
const XX = "https://x" + ".com/YOUR_HANDLE";
const DC = "https://discord" + ".gg/YOUR_INVITE";

const HOVER = { scale: 1.08, y: -2 };
const TAP = { scale: 0.96 };

const SOCIALS: Social[] = [
  { label: "GitHub", href: GH, color: "#181717", path: "M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0023.5 12C23.5 5.7 18.3.5 12 .5z" },
  { label: "X", href: XX, color: "#000000", path: "M18.9 1.2h3.7l-8 9.1L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9zm-1.3 19.4h2L6.5 3.3h-2.2l13.3 17.3z" },
  { label: "Discord", href: DC, color: "#5865F2", path: "M20.3 4.4A19.8 19.8 0 0015.4 3l-.2.5c1.7.4 2.5.9 3.4 1.5a13.3 13.3 0 00-10.5 0c.9-.6 1.9-1.1 3.4-1.5L11.3 3a19.8 19.8 0 00-4.9 1.4C2.5 8.6 1.7 12.7 2.1 16.7a19.9 19.9 0 006 3l.5-.7c-1-.4-1.9-.9-2.7-1.5l.6-.4a14.2 14.2 0 0012.2 0l.6.4c-.8.6-1.7 1.1-2.7 1.5l.5.7a19.9 19.9 0 006-3c.5-4.7-.8-8.8-3.4-12.3zM8.9 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" },
];

export default function SocialButtons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {SOCIALS.map((s) => {
        const brandStyle = { ["--brand" as any]: s.color } as CSSProperties;
        const wrap = "group flex h-11 w-11 items-center justify-center rounded-xl border transition-colors " + (dark ? "border-white/15 bg-white/5 hover:bg-[var(--brand)] hover:border-transparent" : "border-hairline bg-white hover:bg-[var(--brand)] hover:border-transparent");
        const icon = "h-5 w-5 transition-colors " + (dark ? "fill-white/70 group-hover:fill-white" : "fill-ink group-hover:fill-white");
        return (
          <motion.a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} whileHover={HOVER} whileTap={TAP} style={brandStyle} className={wrap}>
            <svg viewBox="0 0 24 24" className={icon}>
              <path d={s.path} />
            </svg>
          </motion.a>
        );
      })}
    </div>
  );
}
