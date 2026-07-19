"use client";

import { motion } from "framer-motion";
import { useTrack, type TrackId } from "@/components/useTrack";

const OPTIONS: { id: TrackId; emoji: string; label: string }[] = [
  { id: "settlement", emoji: "", label: "Settle" },
  { id: "agents", emoji: "", label: "Agents" },
  { id: "fan", emoji: "", label: "Fan" },
];

const spring = { type: "spring", stiffness: 380, damping: 30 } as const;

export default function TrackSwitcher() {
  const [track, setTrack] = useTrack();

  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full border border-hairline bg-base/80 p-1 shadow-lg backdrop-blur-md">
        {OPTIONS.map((o) => {
          const isOn = o.id === track;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setTrack(o.id)}
              aria-label={"Switch to " + o.label + " track"}
              className={
                "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                (isOn ? "text-white" : "text-muted hover:text-ink")
              }
            >
              {isOn ? (
                <motion.span
                  layoutId="nyx-track-pill"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-nyx to-solana"
                />
              ) : null}
              <span className="relative">{o.emoji}</span>
              <span className="relative">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
