"use client";
import { useState } from "react";
import Link from "next/link";

type Market = { id: string; q: string; cat: string; prob: number; vol: string };
const MARKETS: Market[] = [
  { id: "btc80", q: "Will BTC close above $80k this month?", cat: "Crypto", prob: 62, vol: "$1.2M" },
  { id: "eth5k", q: "ETH flips $5k before Q4?", cat: "Crypto", prob: 38, vol: "$740k" },
  { id: "fed", q: "Will the Fed cut rates in September?", cat: "Macro", prob: 71, vol: "$980k" },
  { id: "sol100", q: "Solana daily TXs above 100M this week?", cat: "Crypto", prob: 55, vol: "$610k" },
  { id: "gpt5", q: "Top lab ships a GPT-5-class model in 2026?", cat: "AI", prob: 44, vol: "$430k" },
];

type Position = { id: number; q: string; side: "YES" | "NO"; stake: number; payout: number };

export default function AppPage() {
  const [sel, setSel] = useState<Market>(MARKETS[0]);
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [stake, setStake] = useState(100);
  const [placing, setPlacing] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);

  const p = side === "YES" ? sel.prob : 100 - sel.prob;
  const payout = stake / (p / 100);
  const profit = payout - stake;

  const place = () => {
    setPlacing(true);
    setTimeout(() => {
      setPositions((prev) => [{ id: Date.now(), q: sel.q, side, stake, payout }, ...prev].slice(0, 8));
      setPlacing(false);
    }, 900);
  };

  const yesBar = { width: sel.prob + "%" };
  const noBar = { width: 100 - sel.prob + "%" };

  return (
    <main className="min-h-screen bg-base">
      <header className="sticky top-0 z-40 border-b border-hairline bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-bold text-ink">Nyx</Link>
          <span className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1 text-xs font-mono text-muted">
            <span className="h-2 w-2 rounded-full bg-payout" /> Devnet · zero-custody
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-content gap-6 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h1 className="font-display text-2xl font-bold text-ink">Open markets</h1>
          <div className="mt-4 space-y-2">
            {MARKETS.map((m) => {
              const activeCls = m.id === sel.id ? "border-nyx ring-2 ring-nyx/20" : "border-hairline hover:border-muted";
              return (
                <button key={m.id} onClick={() => setSel(m)} className={"w-full rounded-xl border bg-white p-4 text-left transition-all " + activeCls}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-subtle px-2 py-0.5 text-xs font-medium text-muted">{m.cat}</span>
                    <span className="text-xs text-muted">Vol {m.vol}</span>
                  </div>
                  <div className="mt-2 font-display font-semibold text-ink">{m.q}</div>
                  <div className="mt-2 flex gap-2 text-xs font-mono">
                    <span className="text-payout">YES {m.prob}%</span>
                    <span className="text-muted">NO {100 - m.prob}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-hairline bg-white p-5 shadow-sm">
            <div className="text-xs font-mono uppercase tracking-widest text-nyx">Order ticket</div>
            <div className="mt-2 font-display font-semibold leading-snug text-ink">{sel.q}</div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle">
              <div className="h-full bg-gradient-to-r from-payout to-verify" style={yesBar} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setSide("YES")} className={"rounded-xl border py-2.5 text-sm font-semibold transition-colors " + (side === "YES" ? "border-payout bg-payout/10 text-payout" : "border-hairline text-muted")}>YES · {sel.prob}%</button>
              <button onClick={() => setSide("NO")} className={"rounded-xl border py-2.5 text-sm font-semibold transition-colors " + (side === "NO" ? "border-ink bg-ink/5 text-ink" : "border-hairline text-muted")}>NO · {100 - sel.prob}%</button>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm"><span className="text-muted">Stake</span><span className="font-mono font-semibold text-ink">{stake} USD₮</span></div>
              <input type="range" min={10} max={1000} step={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-2 w-full accent-nyx" />
            </div>

            <div className="mt-4 rounded-xl bg-subtle p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Potential payout</span><span className="font-mono font-bold text-payout">{payout.toFixed(2)} USD₮</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Net profit</span><span className="font-mono font-semibold text-ink">+{profit.toFixed(2)} USD₮</span></div>
            </div>

            <button onClick={place} disabled={placing} className="mt-4 w-full rounded-xl bg-ink py-3 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {placing ? "Signing allowance…" : "Sign allowance → place bet"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">Capped, expiring allowance. Funds stay in your wallet.</p>
          </div>

          <div className="mt-4 rounded-2xl border border-hairline bg-white p-5">
            <div className="text-sm font-semibold text-ink">Your positions</div>
            {positions.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No open positions yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {positions.map((pos) => (
                  <div key={pos.id} className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-ink">{pos.q}</div>
                      <div className="font-mono text-xs text-muted">{pos.side} · {pos.stake} USD₮</div>
                    </div>
                    <span className="ml-3 shrink-0 font-mono text-xs font-semibold text-payout">{pos.payout.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
