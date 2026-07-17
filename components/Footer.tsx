import SocialButtons from "@/components/SocialButtons";

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-white">
      <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-6 py-12 sm:flex-row sm:justify-between">
        <div>
          <div className="font-display text-lg font-bold text-ink">Nyx</div>
          <p className="mt-1 text-sm text-muted">Trustless prediction markets on Solana.</p>
        </div>
        <SocialButtons />
      </div>
      <div className="border-t border-hairline py-4 text-center text-xs text-muted">
        © 2026 Nyx · Verifiable by design · Not financial advice
      </div>
    </footer>
  );
}
