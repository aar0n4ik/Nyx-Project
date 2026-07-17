"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

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

  const shell =
    "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 " +
    (scrolled ? "border-hairline bg-base/80 backdrop-blur-md" : "border-transparent bg-base/40 backdrop-blur");

  return (
    <header className={shell}>
      <nav className="mx-auto flex max-w-content items-center justify-between px-6 py-3">
        <a href="/" className="shrink-0">
          <Logo />
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted transition hover:text-ink">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href="/app"
            className="rounded-lg bg-gradient-to-r from-nyx to-verify px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Launch app
          </a>
        </div>
      </nav>
    </header>
  );
}
