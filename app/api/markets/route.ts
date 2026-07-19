import { NextResponse } from "next/server";

export const revalidate = 0;

type Odds = { h: number; d: number; a: number };
type Market = {
  match: string; home: string; away: string; competition: string;
  odds: Odds; vol: number; live: boolean; minute: number | null;
  score: string | null; status: "upcoming" | "live" | "finished";
  result?: "h" | "d" | "a"; kickoff?: string; demo?: boolean;
};

const BASE: Market[] = [
  { match: "88008800", home: "Nyx", away: "Demo", competition: "Exhibition", odds: { h: 2.0, d: 3.0, a: 3.5 }, vol: 0, live: false, minute: null, score: null, status: "upcoming", demo: true },
  { match: "17588232", home: "Spain", away: "Argentina", competition: "World Cup · Final", odds: { h: 2.35, d: 3.2, a: 3.05 }, vol: 4820000, live: false, minute: null, score: null, status: "upcoming", kickoff: "2026-07-19T19:00:00Z" },
  { match: "17588302", home: "England", away: "France", competition: "World Cup · Third place", odds: { h: 2.2, d: 3.6, a: 3.1 }, vol: 1650000, live: false, minute: null, score: "6 - 4", status: "finished", result: "h" },
  { match: "17588389", home: "Spain", away: "France", competition: "World Cup · Semi-final", odds: { h: 2.05, d: 3.3, a: 3.7 }, vol: 2740000, live: false, minute: null, score: "2 - 0", status: "finished", result: "h" },
  { match: "17926647", home: "Argentina", away: "England", competition: "World Cup · Semi-final", odds: { h: 2.1, d: 3.25, a: 3.5 }, vol: 2610000, live: false, minute: null, score: "2 - 1", status: "finished", result: "h" },
  { match: "17588390", home: "Argentina", away: "Switzerland", competition: "World Cup · Quarter-final", odds: { h: 1.45, d: 4.2, a: 6.5 }, vol: 1180000, live: false, minute: null, score: "3 - 1", status: "finished", result: "h" },
  { match: "17588303", home: "France", away: "Morocco", competition: "World Cup · Quarter-final", odds: { h: 1.6, d: 3.8, a: 5.4 }, vol: 1090000, live: false, minute: null, score: "2 - 0", status: "finished", result: "h" },
];

export async function GET() {
  return NextResponse.json({ markets: BASE, updatedAt: new Date().toISOString() });
}
