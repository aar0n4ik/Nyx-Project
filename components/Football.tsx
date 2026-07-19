import "flag-icons/css/flag-icons.min.css";

export type TeamInfo = { iso: string; colors: [string, string] };

export const TEAMS: Record<string, TeamInfo> = {
  Spain: { iso: "es", colors: ["#c60b1e", "#f1bf00"] },
  Argentina: { iso: "ar", colors: ["#6cace4", "#ffffff"] },
  England: { iso: "gb-eng", colors: ["#ffffff", "#cf142b"] },
  France: { iso: "fr", colors: ["#0055a4", "#ef4135"] },
  Morocco: { iso: "ma", colors: ["#c1272d", "#006233"] },
  Belgium: { iso: "be", colors: ["#e30613", "#111111"] },
  Norway: { iso: "no", colors: ["#ba0c2f", "#00205b"] },
  Switzerland: { iso: "ch", colors: ["#d52b1e", "#ffffff"] },
};

export function Flag({ name, className }: { name: string; className?: string }) {
  const info = TEAMS[name];
  const iso = info ? info.iso : "eu";
  return <span className={"fi fi-" + iso + " nyx-flag " + (className || "")} aria-hidden />;
}

export function Ball({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="nyx-ball" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#ffffff" stroke="#111111" strokeWidth="2" />
      <path d="M24 12 L31 17 L28 26 L20 26 L17 17 Z" fill="#111111" />
      <path d="M24 12 L24 4 M31 17 L39 15 M28 26 L33 33 M20 26 L15 33 M17 17 L9 15" stroke="#111111" strokeWidth="2" />
    </svg>
  );
}
