"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import TrackNavSwitcher from "@/components/TrackNavSwitcher";
import { useTrack, type TrackId } from "@/components/useTrack";
import { useT, useLang, pick } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

type L = Record<Lang, string>;
type NavLink = { label: L; href: string };

const MARKETS_L: L = { en: "Markets", ru: "Рынки", es: "Mercados", pt: "Mercados", fr: "Marchés", de: "Märkte", zh: "市场" };
const EDGE_L: L = { en: "Nyx Edge", ru: "Nyx Edge", es: "Nyx Edge", pt: "Nyx Edge", fr: "Nyx Edge", de: "Nyx Edge", zh: "Nyx Edge" };
const PROOF_L: L = { en: "Proof", ru: "Доказательство", es: "Prueba", pt: "Prova", fr: "Preuve", de: "Nachweis", zh: "验证" };
const FAQ_L: L = { en: "FAQ", ru: "FAQ", es: "FAQ", pt: "FAQ", fr: "FAQ", de: "FAQ", zh: "常见问题" };

const LINKS: Record<TrackId, NavLink[]> = {
  settlement: [
    { href: "#markets", label: MARKETS_L },
    { href: "#verify", label: PROOF_L },
    { href: "#faq", label: FAQ_L },
  ],
  agents: [
    { href: "#edge", label: EDGE_L },
    { href: "#verify", label: PROOF_L },
    { href: "#faq", label: FAQ_L },
  ],
  fan: [
    { href: "#markets", label: MARKETS_L },
    { href: "#verify", label: PROOF_L },
    { href: "#faq", label: FAQ_L },
  ],
};

export default function Navbar() {
  const { t } = useT();
  const lang = useLang();
  const [track] = useTrack();
  const links = LINKS[track ?? "settlement"];
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
          {links.map((l) => (
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
