"use client";
import { useEffect, useState } from "react";

export type Loc = { en: string; ru: string };
export type Market = {
  match: string; home: string; away: string; homeCode: string; awayCode: string;
  competition: string; market: string; pick: Loc; odds: number; vol: string;
  live: boolean; minute: number | null; score: string | null; status: string;
};

export const FALLBACK_MARKETS: Market[] = [
  { match: "17588389", home: "Argentina", away: "Austria", homeCode: "ARG", awayCode: "AUT", competition: "World Cup · Group", market: "h", pick: { en: "Argentina to win", ru: "Победа Аргентины" }, odds: 1.72, vol: "128.4K", live: false, minute: null, score: null, status: "open" },
  { match: "17588302", home: "Ecuador", away: "Germany", homeCode: "ECU", awayCode: "GER", competition: "World Cup · Group", market: "a", pick: { en: "Germany to win", ru: "Победа Германии" }, odds: 1.45, vol: "96.1K", live: false, minute: null, score: null, status: "open" },
  { match: "17926647", home: "France", away: "Iraq", homeCode: "FRA", awayCode: "IRQ", competition: "World Cup · Group", market: "ou25", pick: { en: "Over 2.5 goals", ru: "Тотал больше 2.5" }, odds: 1.90, vol: "84.9K", live: false, minute: null, score: null, status: "open" },
  { match: "17588232", home: "Spain", away: "Saudi Arabia", homeCode: "ESP", awayCode: "KSA", competition: "World Cup · Group", market: "btts", pick: { en: "Both teams to score", ru: "Обе забьют" }, odds: 2.10, vol: "41.7K", live: false, minute: null, score: null, status: "open" },
  { match: "17588303", home: "Switzerland", away: "Canada", homeCode: "SUI", awayCode: "CAN", competition: "World Cup · Group", market: "d", pick: { en: "Draw", ru: "Ничья" }, odds: 3.25, vol: "22.8K", live: false, minute: null, score: null, status: "open" },
  { match: "17588390", home: "Belgium", away: "Iran", homeCode: "BEL", awayCode: "IRN", competition: "World Cup · Group", market: "h", pick: { en: "Belgium to win", ru: "Победа Бельгии" }, odds: 1.55, vol: "37.2K", live: false, minute: null, score: null, status: "open" },
];

export function useMarkets(pollMs = 12000) {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK_MARKETS);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/markets", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive && Array.isArray(j.markets) && j.markets.length) setMarkets(j.markets);
      } catch {}
    };
    load();
    const id = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [pollMs]);
  return { markets };
}
