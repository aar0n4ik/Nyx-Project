export const runtime = "nodejs";

type Odds = { h: number; d: number; a: number };
type Base = { match: string; home: string; away: string; competition: string; odds: Odds; vol: string };
export type Market = Base & { live: boolean; minute: number | null; score: string | null; status: string };

const BASE: Base[] = [
  { match: "17588389", home: "Argentina", away: "Austria", competition: "World Cup · Group C", odds: { h: 1.72, d: 3.8, a: 4.5 }, vol: "128.4K" },
  { match: "17588302", home: "Ecuador", away: "Germany", competition: "World Cup · Group A", odds: { h: 5.2, d: 3.9, a: 1.62 }, vol: "96.1K" },
  { match: "17926647", home: "France", away: "Iraq", competition: "World Cup · Group F", odds: { h: 1.25, d: 5.5, a: 9.0 }, vol: "84.9K" },
  { match: "17588232", home: "Spain", away: "Saudi Arabia", competition: "World Cup · Group B", odds: { h: 1.3, d: 5.0, a: 8.5 }, vol: "41.7K" },
  { match: "17588303", home: "Switzerland", away: "Canada", competition: "World Cup · Group E", odds: { h: 2.35, d: 3.25, a: 3.1 }, vol: "22.8K" },
  { match: "17588390", home: "Belgium", away: "Iran", competition: "World Cup · Group D", odds: { h: 1.55, d: 3.9, a: 6.0 }, vol: "37.2K" },
];

let cache: { at: number; data: Market[] } | null = null;
const TTL = 10000;
const num = (v: unknown): number | null => { const n = Number(v); return isFinite(n) ? n : null; };

async function enrich(origin: string, m: Base): Promise<Market> {
  const fallback: Market = { ...m, live: false, minute: null, score: null, status: "open" };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(origin + "/api/txline/scores/snapshot/" + m.match, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return fallback;
    const j: any = await res.json().catch(() => null);
    if (!j) return fallback;
    const hs = num(j.home_score ?? j.homeScore ?? j.score?.home ?? j.home?.score);
    const as = num(j.away_score ?? j.awayScore ?? j.score?.away ?? j.away?.score);
    const minute = num(j.minute ?? j.time?.minute ?? j.clock);
    const st = String(j.status ?? j.state ?? j.period ?? "").toLowerCase();
    const live = /live|1h|2h|first|second|play|inplay|in_play/.test(st) || (minute != null && minute > 0 && !/ft|end|full/.test(st));
    return { ...m, live, minute: minute ?? null, score: hs != null && as != null ? hs + "–" + as : null, status: st || (live ? "live" : "open") };
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (cache && Date.now() - cache.at < TTL) {
    return new Response(JSON.stringify({ markets: cache.data, cached: true }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  const data = await Promise.all(BASE.map((m) => enrich(origin, m)));
  cache = { at: Date.now(), data };
  return new Response(JSON.stringify({ markets: data, cached: false }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
