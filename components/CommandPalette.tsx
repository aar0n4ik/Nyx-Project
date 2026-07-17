"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useTrack } from "@/components/useTrack";

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);
const GITHUB_URL = "https://github.com/aar0n4ik/Nyx-Project";
const LIVE_URL = "https://nyx-project-roan.vercel.app";

type Cmd = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords: string;
  run: () => void;
};

const overlayHidden = { opacity: 0 } as const;
const overlayShown = { opacity: 1 } as const;
const overlayTrans = { duration: 0.15, ease: "easeOut" } as const;
const panelHidden = { opacity: 0, y: 12, scale: 0.98 } as const;
const panelShown = { opacity: 1, y: 0, scale: 1 } as const;
const panelTrans = { duration: 0.18, ease: "easeOut" } as const;

function goTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [, setTrack] = useTrack();

  const cmds = useMemo<Cmd[]>(() => {
    const close = () => setOpen(false);
    const nav = (id: string) => () => {
      close();
      goTo(id);
    };
    const ext = (url: string) => () => {
      close();
      window.open(url, "_blank", "noopener,noreferrer");
    };
    return [
      { id: "bet", label: "Place a bet", group: "Actions", hint: "Blink", keywords: "bet stake wager blink solana", run: ext(BLINK_URL) },
      { id: "app", label: "Open the app", group: "Actions", keywords: "app dashboard launch", run: () => { setOpen(false); window.location.href = "/app"; } },
      { id: "github", label: "View source on GitHub", group: "Actions", keywords: "github code repo source", run: ext(GITHUB_URL) },
      { id: "live", label: "Open live site", group: "Actions", keywords: "live production vercel", run: ext(LIVE_URL) },
      { id: "nav-tracks", label: "Tracks", group: "Navigate", keywords: "tracks settlement agents fan", run: nav("tracks") },
      { id: "nav-roadmap", label: "Roadmap", group: "Navigate", keywords: "roadmap plan phases", run: nav("roadmap") },
      { id: "nav-markets", label: "Markets", group: "Navigate", keywords: "markets odds bets", run: nav("markets") },
      { id: "nav-live", label: "Live constellation", group: "Navigate", keywords: "live constellation activity", run: nav("live") },
      { id: "nav-feed", label: "Transaction feed", group: "Navigate", keywords: "feed transactions stream", run: nav("feed") },
      { id: "nav-proof", label: "Verify on-chain", group: "Navigate", keywords: "proof verify chain inference", run: nav("proof") },
      { id: "nav-faq", label: "FAQ", group: "Navigate", keywords: "faq questions help", run: nav("faq") },
      { id: "nav-founder", label: "About the founder", group: "Navigate", keywords: "founder about aaron", run: nav("founder") },
      { id: "track-settlement", label: "Focus: Settlement track", group: "Tracks", keywords: "settlement no admin key", run: () => { setTrack("settlement"); setOpen(false); } },
      { id: "track-agents", label: "Focus: Agents track", group: "Tracks", keywords: "agents trading bot", run: () => { setTrack("agents"); setOpen(false); } },
      { id: "track-fan", label: "Focus: Fan track", group: "Tracks", keywords: "fan consumer social", run: () => { setTrack("fan"); setOpen(false); } },
    ];
  }, [setTrack]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cmds;
    return cmds.filter(
      (c) =>
        c.label.toLowerCase().indexOf(q) >= 0 ||
        c.keywords.indexOf(q) >= 0 ||
        c.group.toLowerCase().indexOf(q) >= 0
    );
  }, [query, cmds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[active];
      if (cmd) cmd.run();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={overlayHidden}
          animate={overlayShown}
          exit={overlayHidden}
          transition={overlayTrans}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
        >
          <motion.div
            initial={panelHidden}
            animate={panelShown}
            exit={panelHidden}
            transition={panelTrans}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onPanelKey}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-base shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nyx — jump, bet, verify…"
                className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  No matches
                </div>
              ) : (
                filtered.map((c, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => c.run()}
                      className={
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm " +
                        (isActive ? "bg-subtle text-ink" : "text-muted")
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide " +
                            (isActive ? "text-nyx" : "text-muted")
                          }
                        >
                          {c.group}
                        </span>
                        <span className={isActive ? "text-ink" : "text-ink/80"}>
                          {c.label}
                        </span>
                      </span>
                      {c.hint ? (
                        <span className="text-[11px] text-muted">{c.hint}</span>
                      ) : isActive ? (
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                select
              </span>
              <span className="ml-auto">Nyx</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
