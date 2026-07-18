"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import TrackNavSwitcher from "@/components/TrackNavSwitcher";
import { useT, useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;

const LINKS: { label: L; href: string }[] = [
  { href: "#why", label: { en: "Why Nyx", ru: "Почему Nyx", es: "Por qué Nyx", pt: "Por que Nyx", fr: "Pourquoi Nyx", de: "Warum Nyx", zh: "为什么选 Nyx" } },
  { href: "#markets", label: { en: "Markets", ru: "Рынки", es: "Mercados", pt: "Mercados", fr: "Marchés", de: "Märkte", zh: "市场" } },
  { href: "#verify", label: { en: "Proof", ru: "Доказательство", es: "Prueba", pt: "Prova", fr: "Preuve", de: "Nachweis", zh: "验证" } },
  { href: "#faq", label: { en: "FAQ", ru: "FAQ", es: "FAQ", pt: "FAQ", fr: "FAQ", de: "FAQ", zh: "常见问题" } },
];

export default function Navbar() {
  const { t } = useT();
  const lang = useLang();
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
              {pick(lang, l.label)}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <TrackNavSwitcher />
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href="/app"
            className="rounded-lg bg-gradient-to-r from-nyx to-verify px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {t("cta.app")}
          </a>
        </div>
      </nav>
    </header>
  );
}
