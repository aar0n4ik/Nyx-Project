"use client";
import { useEffect, useState } from "react";

const LINKS = [
  { label: "Why Nyx", href: "#why" },
  { label: "Markets", href: "#markets" },
  { label: "Proof", href: "#verify" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-all " +
        (scrolled ? "border-b border-hairline bg-white/80 backdrop-blur" : "bg-transparent")
      }
    >
      <nav className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
        <a href="#" className={"font-display text-lg font-bold " + (scrolled ? "text-ink" : "text-white")}>
          Nyx
        </a>
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={
                "text-sm font-medium transition-colors " +
                (scrolled ? "text-muted hover:text-ink" : "text-white/70 hover:text-white")
              }
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#markets"
          className={
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
            (scrolled ? "bg-ink text-white hover:opacity-90" : "bg-white text-ink hover:bg-white/90")
          }
        >
          Launch app
        </a>
      </nav>
    </header>
  );
}
