type LogoProps = { size?: number; showWord?: boolean; className?: string };

export default function Logo({ size = 28, showWord = true, className = "" }: LogoProps) {
  const cls = "flex items-center gap-2 " + className;
  return (
    <span className={cls}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="nyxMark" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7C5CFF" />
            <stop offset="0.5" stopColor="#9945FF" />
            <stop offset="1" stopColor="#0BB5D6" />
          </linearGradient>
        </defs>
        <g stroke="url(#nyxMark)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 46 V18" />
          <path d="M45 18 V46" />
          <path d="M19 18 L45 46" />
        </g>
      </svg>
      {showWord ? (
        <span className="font-display text-lg font-bold tracking-tight text-ink">Nyx</span>
      ) : null}
    </span>
  );
}
