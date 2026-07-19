// GET /api/markets -> канонические футбольные рынки + живой счёт/статус из TxLINE.
// Если TxLINE не настроен (501) или матч не идёт — отдаём базовые кэфы (не падаем).
export const runtime = "nodejs";

type Loc = { en: string; ru: string };
type Base = {
  match: string; home: string; away: string; homeCode: string; awayCode: string;
  competition: string; market: string; pick: Loc; odds: number; vol: string;
};
export type Market = Base & { live: boolean; minute: number | null; score: string | null; status: string };

const BASE: Base[] = [
  { match: "17588389", home: "Argentina", away: "Austria", homeCode: "ARG", awayCode: "AUT", competition: "World Cup · Group", market: "h", pick: { en: "Argentina to win", ru: "Победа Аргентины" }, odds: 1.72, vol: "128.4K" },
  { match: "17588302", home: "Ecuador", away: "Germany", homeCode: "ECU", awayCode: "GER", competition: "World Cup · Group", market: "a", pick: { en: "Germany to win", ru: "Победа Германии" }, odds: 1.45, vol: "96.1K" },
  { match: "17926647", home: "France", away: "Iraq", homeCode: "FRA", awayCode: "IRQ", competition: "World Cup · Group", market: "ou25", pick: { en: "Over 2.5 goals", ru: "Тотал больше 2.5" }, odds: 1.90, vol: "84.9K" },
  { match: "17588232", home: "Spain", away: "Saudi Arabia", homeCode: "ESP", awayCode: "KSA", competition: "World Cup · Group", market: "btts", pick: { en: "Both teams to score", ru: "Обе забьют" }, odds: 2.10, vol: "41.7K" },
  { match: "17588303", home: "Switzerland", away: "Canada", homeCode: "SUI", awayCode: "CAN", competition: "World Cup · Group", market: "d", pick: { en: "Draw", ru: "Ничья" }, odds: 3.25, vol: "22.8K" },
  { match: "17588390", home: "Belgium", away: "Iran", homeCode: "BEL", awayCode: "IRN", competition: "World Cup · Group", market: "h", pick: { en: "Belgium to win", ru: "Победа Бельгии" }, odds: 1.55, vol: "37.2K" },
];

let cache: { at: number; data: Market[] } | null = null;
const TTL = 10000;
const num = (v: unknown): number | null => { const n = Number(v); return isFinite(n) ? n : null; };

async function enrich(origin: string, m: Base): Promise<Market> {
  const fallback: Market = { ...m, live: false, minute: null, score: null, status: "open" };
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    // Документированный путь прокси TxLINE: /api/scores/snapshot/<matchId>
    const res = await fetch(origin + "/api/txline/scores/snapshot/" + m.match, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return fallback; // 501 не настроен / 404 -> базовые кэфы
    const j: any = await res.json().catch(() => null);
    if (!j) return fallback;
    // Защитный парс: подстрой имена полей под точную схему твоего TxLINE-фида при необходимости.
    const hs = num(j.home_score ?? j.homeScore ?? j.score?.home ?? j.home?.score);
    const as = num(j.away_score ?? j.awayScore ?? j.score?.away ?? j.away?.score);
    const minute = num(j.minute ?? j.time?.minute ?? j.clock);
    const st = String(j.status ?? j.state ?? j.period ?? "").toLowerCase();
    const live = /live|1h|2h|first|second|play|inplay|in_play/.test(st) || (minute != null && minute > 0 && !/ft|end|full/.test(st));
    return { ...m, live, minute: minute ?? null, score: hs != null && as != null ? hs + "–" + as : null, status: st || (live ? "live" : "open") };
    // ↑ Живые КЭФЫ: если у твоего TxLINE есть odds-snapshot, дёрни его тут и перезапиши m.odds.
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
