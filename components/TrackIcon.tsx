import type { TrackId } from "@/components/useTrack";

export default function TrackIcon({ id, className }: { id: TrackId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (id === "settlement") {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (id === "agents") {
    return (
      <svg {...common}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.8 7.8a6 6 0 000 8.4M16.2 16.2a6 6 0 000-8.4" />
      <path d="M5 5a10 10 0 000 14M19 19a10 10 0 000-14" />
    </svg>
  );
}
