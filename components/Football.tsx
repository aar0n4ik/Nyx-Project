"use client";
import "flag-icons/css/flag-icons.min.css";

export type TeamInfo = { iso: string; colors: [string, string] };

export const TEAMS: Record<string, TeamInfo> = {
  Argentina: { iso: "ar", colors: ["#75aadb", "#ffffff"] },
  Austria: { iso: "at", colors: ["#ed2939", "#ffffff"] },
  Ecuador: { iso: "ec", colors: ["#ffd100", "#0072ce"] },
  Germany: { iso: "de", colors: ["#111827", "#dd0000"] },
  France: { iso: "fr", colors: ["#0055a4", "#ffffff"] },
  Iraq: { iso: "iq", colors: ["#007a3d", "#ffffff"] },
  Spain: { iso: "es", colors: ["#aa151b", "#f1bf00"] },
  "Saudi Arabia": { iso: "sa", colors: ["#006c35", "#ffffff"] },
  Switzerland: { iso: "ch", colors: ["#d52b1e", "#ffffff"] },
  Canada: { iso: "ca", colors: ["#ff0000", "#ffffff"] },
  Belgium: { iso: "be", colors: ["#111827", "#fdda24"] },
  Iran: { iso: "ir", colors: ["#239f40", "#ffffff"] },
};

export function Flag({ name, className }: { name: string; className?: string }) {
  const iso = TEAMS[name]?.iso ?? "un";
  return <span className={"fi fi-" + iso + " nyx-flag " + (className || "")} role="img" aria-label={name} />;
}

export function Ball({ size = 20, spin = true }: { size?: number; spin?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={spin ? "nyx-ball shrink-0" : "shrink-0"} aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#ffffff" stroke="#0b1220" strokeWidth="2.5" />
      <polygon points="32,20 41,27 37,38 27,38 23,27" fill="#0b1220" />
      <line x1="32" y1="20" x2="32" y2="5" stroke="#0b1220" strokeWidth="2.5" />
      <line x1="41" y1="27" x2="55" y2="22" stroke="#0b1220" strokeWidth="2.5" />
      <line x1="37" y1="38" x2="46" y2="51" stroke="#0b1220" strokeWidth="2.5" />
      <line x1="27" y1="38" x2="18" y2="51" stroke="#0b1220" strokeWidth="2.5" />
      <line x1="23" y1="27" x2="9" y2="22" stroke="#0b1220" strokeWidth="2.5" />
    </svg>
  );
}
