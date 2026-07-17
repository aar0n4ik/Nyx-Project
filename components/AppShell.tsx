"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, LineChart, Zap, Sparkles, ExternalLink } from "lucide-react";
import { useTrack, type TrackId } from "@/components/useTrack";

const BLINK_ACTION = "https://nyx-project-roan.vercel.app/api/actions/bet";
const BLINK_URL =
  "https://dial.to/?action=solana-action:" + encodeURIComponent(BLINK_ACTION);

type TabId = "live" | "markets" | "bet" | "edge";

const TABS = [
  { id: "live", label: "Live", Icon: Activity },
  { id: "markets", label: "Markets", Icon: LineChart },
  { id: "bet", label: "Bet", Icon: Zap },
  { id: "edge", label: "Edge", Icon: Sparkles },
] as const;

const TRACK_COPY: Record<TrackId, { title: string; sub: string }> = {
  settlement: { title: "Settlement", sub: "No admin key can decide your bet." },
  agents: { title: "Agents", sub: "An agent bets for you — it never holds your funds." },
  fan: { title: "Fan", sub: "Bet from any post. Creators earn automatically." },
};

const MARKETS = [
  { q: "Brazil to win the World Cup?", yes: 0.41, vol: "128.4K" },
  { q: "Over 2.5 goals — Final?", yes: 0.57, vol: "84.9K" },
  { q: "Penalty shootout in the Final?", yes: 0.23, vol: "31.2K" },
];

const SETTLEMENTS = [
  { label: "Auto-settled payout", sig: "5fxcHPgZiQqyT2vzhdswa7NpDUQSFTLgM2jpz1FpdYVJkiGS6mxkanGQ29nWzSmwGzuu81Wiw9hbquthQAVjsbVy" },
  { label: "Trustless resolve", sig: "3DqcdD5T5LW7SSjar5jarNJ72cjqtxHdGi7TBB8pfahMQmyZa5VARGS8xY1jgivBw3zez8kEH3vnhpun1emGMaev" },
  { label: "Dispute resolved", sig: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ" },
];

const panelTrans = { duration: 0.24, ease: "easeOut" } as const;
const tabSpring = { type: "spring", stiffness: 420, damping: 34 } as const;
const enterV = { opacity: 0, y: 10 } as const;
const centerV = { opacity: 1, y: 0 } as const;
const exitV = { opacity: 0, y: -10 } as const;

function explorer(sig: string) {
  return "https://explorer.solana.com/tx/" + sig + "?cluster=devnet";
}

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 w-full animate-pulse rounded-2xl bg-subtle" />
      <div className="h-16 w-full animate-pulse rounded-2xl bg-subtle" />
      <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-subtle" />
    </div>
  );
}

function LivePanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-hairline bg-subtle p-4">
          <div className="text-2xl font-semibold text-ink">$1.24M</div>
          <div className="text-xs text-muted">Settled on-chain</div>
        </div>
        <div className="rounded-2xl border border-hairline bg-subtle p-4">
          <div className="text-2xl font-semibold text-ink">0</div>
          <div className="text-xs text-muted">Admin keys</div>
        </div>
      </div>
      <div className="rounded-2xl border border-hairline p-4">
        <div className="mb-3 text-sm font-medium text-ink">Recent settlements</div>
        <div className="space-y-2">
          {SETTLEMENTS.map((s) => (
            <a
              key={s.sig}
              href={explorer(s.sig)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-subtle px-3 py-2 text-sm text-ink transition hover:opacity-80"
            >
              <span>{s.label}</span>
              <ExternalLink className="h-4 w-4 text-muted" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketsPanel() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">Devnet demo · test USD₮</div>
      {MARKETS.map((m) => (
        <div key={m.q} className="rounded-2xl border border-hairline p-4">
          <div className="mb-3 text-sm font-medium text-ink">{m.q}</div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">Vol {m.vol} USD₮</div>
            <a
              href={BLINK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-nyx px-4 py-1.5 text-sm font-medium text-white"
            >
              Yes {Math.round(m.yes * 100)}¢
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function BetPanel({ track }: { track: TrackId }) {
  const copy = TRACK_COPY[track];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline p-5">
        <div className="text-lg font-semibold text-ink">{copy.title}</div>
        <div className="mt-1 text-sm text-muted">{copy.sub}</div>
        <a
          href={BLINK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={haptic}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-nyx px-5 py-3 text-base font-semibold text-white"
        >
          <Zap className="h-5 w-5" />
          Place a bet
        </a>
      </div>
      <div className="rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
        Devnet · you sign in your wallet · Nyx never holds your funds.
      </div>
    </div>
  );
}

function EdgePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Sparkles className="h-5 w-5 text-nyx" />
          Nyx Edge
        </div>
        <p className="mt-2 text-sm text-muted">
          On-device AI agent powered by QVAC. Runs locally and privately, works
          offline, and delegates heavy inference to your own desktop over P2P —
          the model never blocks startup.
        </p>
        <button
          onClick={() => {
            haptic();
            setOpen((v) => !v);
          }}
          className="mt-4 w-full rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink transition hover:bg-subtle"
        >
          {open ? "Hide details" : "How it will work"}
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.ul
              initial={enterV}
              animate={centerV}
              exit={exitV}
              transition={panelTrans}
              className="mt-4 space-y-2 text-sm text-muted"
            >
              <li>· Local Qwen3 agent — private, no data leaves the phone.</li>
              <li>· Delegated inference — your PC does the heavy lifting.</li>
              <li>· P2P mesh — markets and receipts spread phone-to-phone offline.</li>
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="rounded-xl bg-subtle px-4 py-3 text-xs text-muted">
        Ships in the native Nyx Edge companion — not yet enabled in this web build.
      </div>
    </div>
  );
}

export default function AppShell() {
  const [trackId] = useTrack();
  const track: TrackId = trackId ?? "settlement";
  const [tab, setTab] = useState<TabId>("live");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 520);
    return () => clearTimeout(t);
  }, []);

  const selectTab = (id: TabId) => {
    haptic();
    setTab(id);
  };

  const renderPanel = () => {
    if (!ready) return <Skeleton />;
    if (tab === "live") return <LivePanel />;
    if (tab === "markets") return <MarketsPanel />;
    if (tab === "bet") return <BetPanel track={track} />;
    return <EdgePanel />;
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-base text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-base/80 px-5 py-4 backdrop-blur">
        <span className="text-lg font-semibold tracking-tight">Nyx</span>
        <span className="rounded-full border border-hairline px-2.5 py-1 text-xs text-muted">
          Devnet
        </span>
      </header>

      <main className="flex-1 px-5 py-5 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + String(ready)}
            initial={enterV}
            animate={centerV}
            exit={exitV}
            transition={panelTrans}
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around border-t border-hairline bg-base/90 px-2 py-2 backdrop-blur">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.Icon;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2"
            >
              {active ? (
                <motion.span
                  layoutId="nyx-app-tab"
                  transition={tabSpring}
                  className="absolute inset-0 rounded-xl bg-subtle"
                />
              ) : null}
              <Icon
                className={
                  "relative h-5 w-5 " + (active ? "text-nyx" : "text-muted")
                }
              />
              <span
                className={
                  "relative text-[11px] " + (active ? "text-ink" : "text-muted")
                }
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
