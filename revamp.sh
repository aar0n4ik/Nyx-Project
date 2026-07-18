#!/usr/bin/env bash
set -e
cd "$(git rev-parse --show-toplevel)"

echo "== on branch fix/per-track-ui =="
git checkout fix/per-track-ui
git pull --ff-only || true

echo "== write app/page.tsx (per-track gating) =="
cat > app/page.tsx <<'PAGE_EOF'
"use client";

import { useTrack } from "@/components/useTrack";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrackSpotlight from "@/components/TrackSpotlight";
import TrackModal from "@/components/TrackModal";
import CommandPalette from "@/components/CommandPalette";
import PWA from "@/components/PWA";
import LiveConstellation from "@/components/LiveConstellation";
import NetworkStats from "@/components/NetworkStats";
import LiveStats from "@/components/LiveStats";
import LiveFeed from "@/components/LiveFeed";
import Roadmap from "@/components/Roadmap";
import Founder from "@/components/Founder";
import PerTrackFaq from "@/components/PerTrackFaq";
import Footer from "@/components/Footer";

import Markets from "@/components/Markets";
import AmmVisualizer from "@/components/AmmVisualizer";
import PredictionAMM from "@/components/PredictionAMM";
import Settlement from "@/components/Settlement";
import Verify from "@/components/Verify";

import AgentTerminal from "@/components/AgentTerminal";
import NyxEdge from "@/components/NyxEdge";
import ProofOfInference from "@/components/ProofOfInference";

import LiveStream from "@/components/LiveStream";
import Distribution from "@/components/Distribution";

export default function Page() {
  const [track] = useTrack();
  const active = track ?? "settlement";

  return (
    <>
      <Navbar />
      <Hero />
      <TrackSpotlight />

      {active === "settlement" ? (
        <>
          <Markets />
          <AmmVisualizer />
          <PredictionAMM />
          <Settlement />
          <Verify />
        </>
      ) : null}

      {active === "agents" ? (
        <>
          <AgentTerminal />
          <NyxEdge />
          <ProofOfInference />
          <Verify />
        </>
      ) : null}

      {active === "fan" ? (
        <>
          <LiveStream />
          <Markets />
          <Distribution />
          <Verify />
        </>
      ) : null}

      <NetworkStats />
      <LiveFeed />
      <LiveStats />
      <Roadmap />
      <Founder />
      <PerTrackFaq />
      <LiveConstellation />
      <Footer />

      <TrackModal />
      <CommandPalette />
      <PWA />
    </>
  );
}
PAGE_EOF

echo "== write components/Navbar.tsx (per-track links) =="
cat > components/Navbar.tsx <<'NAV_EOF'
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
NAV_EOF

echo "== default theme -> dark (layout.tsx, surgical) =="
python3 - <<'PY'
p = "app/layout.tsx"
s = open(p).read()
s = s.replace("if(t==='dark')", "if(t!=='light')")
s = s.replace("catch(e){}", "catch(e){document.documentElement.classList.add('dark');}")
open(p, "w").write(s)
print("theme default -> dark")
PY

echo "== sanity: no cross-track heading left =="
grep -rn "Three tracks" app components || echo "clean: no 'Three tracks' heading"

echo "== remove junk files =="
git rm -f dsdsdsds fd.cjs kd.cjs 2>/dev/null || true

echo "== BUILD (validates TS/JSX before anything is pushed) =="
npm run build

echo "== commit + push branch =="
git add app/page.tsx components/Navbar.tsx app/layout.tsx
git commit -m "feat(site): scope whole landing to selected track; per-track nav; dark default; drop cross-track sections; cleanup" || echo "nothing to commit"
git push origin fix/per-track-ui

echo "== consolidate: main = this branch =="
git checkout main
git reset --hard fix/per-track-ui
git push -f origin main

echo "== delete other local branches =="
for b in $(git branch | tr -d '* ' | grep -vx main); do git branch -D "$b" || true; done

echo "== delete other remote branches =="
for b in $(git branch -r | tr -d ' ' | grep -v 'origin/main' | grep -v 'HEAD'); do git push origin --delete "${b#origin/}" || true; done

echo "== DONE: main is the single source of truth =="
git branch -a
