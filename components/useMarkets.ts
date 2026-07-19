"use client";
import { useEffect, useState } from "react";

export type Odds = { h: number; d: number; a: number };
export type Market = {
  match: string; home: string; away: string; competition: string;
  odds: Odds; vol: string;
  live: boolean; minute: number | null; score: string | null; status: string;
};
export type Pick = { market: "h" | "d" | "a"; odds: number; label: string };

export const FALLBACK_MARKETS: Market[] = [
  { match: "17588389", home: "Argentina", away: "Austria", competition: "World Cup · Group C", odds: { h: 1.72, d: 3.8, a: 4.5 }, vol: "128.4K", live: false, minute: null, score: null, status: "open" },
  { match: "17588302", home: "Ecuador", away: "Germany", competition: "World Cup · Group A", odds: { h: 5.2, d: 3.9, a: 1.62 }, vol: "96.1K", live: false, minute: null, score: null, status: "open" },
  { match: "17926647", home: "France", away: "Iraq", competition: "World Cup · Group F", odds: { h: 1.25, d: 5.5, a: 9.0 }, vol: "84.9K", live: false, minute: null, score: null, status: "open" },
  { match: "17588232", home: "Spain", away: "Saudi Arabia", competition: "World Cup · Group B", odds: { h: 1.3, d: 5.0, a: 8.5 }, vol: "41.7K", live: false, minute: null, score: null, status: "open" },
  { match: "17588303", home: "Switzerland", away: "Canada", competition: "World Cup · Group E", odds: { h: 2.35, d: 3.25, a: 3.1 }, vol: "22.8K", live: false, minute: null, score: null, status: "open" },
  { match: "17588390", home: "Belgium", away: "Iran", competition: "World Cup · Group D", odds: { h: 1.55, d: 3.9, a: 6.0 }, vol: "37.2K", live: false, minute: null, score: null, status: "open" },
];

export function useMarkets(pollMs = 12000) {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK_MARKETS);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/markets", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (alive && Array.isArray(j.markets) && j.markets.length) setMarkets(j.markets);
      } catch {}
    };
    load();
    const id = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);
  return { markets };
}
