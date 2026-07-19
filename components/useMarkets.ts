import { useEffect, useState } from "react";

export type Odds = { h: number; d: number; a: number };
export type MatchStatus = "upcoming" | "live" | "finished";
export type Market = {
  match: string;
  home: string;
  away: string;
  competition: string;
  odds: Odds;
  vol: number;
  live: boolean;
  minute: number | null;
  score: string | null;
  status: MatchStatus;
  result?: "h" | "d" | "a";
  kickoff?: string;
  demo?: boolean;
};
export type Pick = { market: "h" | "d" | "a"; odds: number; label: string };

export const FALLBACK_MARKETS: Market[] = [
  { match: "88008801", home: "Nyx", away: "Demo", competition: "Exhibition", odds: { h: 2.0, d: 3.0, a: 3.5 }, vol: 0, live: false, minute: null, score: null, status: "upcoming", demo: true },
  { match: "88008802", home: "Spain", away: "Argentina", competition: "World Cup · Final", odds: { h: 2.35, d: 3.2, a: 3.05 }, vol: 4820000, live: false, minute: null, score: null, status: "upcoming", kickoff: "2026-07-19T19:00:00Z" },
  { match: "17588302", home: "England", away: "France", competition: "World Cup · Third place", odds: { h: 2.2, d: 3.6, a: 3.1 }, vol: 1650000, live: false, minute: null, score: "6 - 4", status: "finished", result: "h" },
  { match: "17588389", home: "Spain", away: "France", competition: "World Cup · Semi-final", odds: { h: 2.05, d: 3.3, a: 3.7 }, vol: 2740000, live: false, minute: null, score: "2 - 0", status: "finished", result: "h" },
  { match: "17926647", home: "Argentina", away: "England", competition: "World Cup · Semi-final", odds: { h: 2.1, d: 3.25, a: 3.5 }, vol: 2610000, live: false, minute: null, score: "2 - 1", status: "finished", result: "h" },
  { match: "17588390", home: "Argentina", away: "Switzerland", competition: "World Cup · Quarter-final", odds: { h: 1.45, d: 4.2, a: 6.5 }, vol: 1180000, live: false, minute: null, score: "3 - 1", status: "finished", result: "h" },
  { match: "17588303", home: "France", away: "Morocco", competition: "World Cup · Quarter-final", odds: { h: 1.6, d: 3.8, a: 5.4 }, vol: 1090000, live: false, minute: null, score: "2 - 0", status: "finished", result: "h" },
];

export function useMarkets(pollMs = 15000) {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK_MARKETS);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.markets) && data.markets.length) setMarkets(data.markets);
      } catch (e) { void e; }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);
  return markets;
}
