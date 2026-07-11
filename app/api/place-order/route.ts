/*
 * POST /api/place-order  — FUTURE / optional. Disabled unless exchange keys exist.
 * Bybit v5 (linear perps): set leverage, then Market order with TP/SL.
 * Ported from github.com/aar0n4ik/CryptoWay (app/api/place-order/route.ts).
 * Keys live ONLY in Vercel env. The demo never calls this (CW_ORDER_PROXY is empty).
 */
export const runtime = "edge";

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sign(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

async function bybit(base: string, path: string, body: string, key: string, secret: string) {
  const ts = Date.now().toString();
  const recv = "5000";
  const signature = await sign(secret, ts + key + recv + body);
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BAPI-API-KEY": key,
      "X-BAPI-TIMESTAMP": ts,
      "X-BAPI-RECV-WINDOW": recv,
      "X-BAPI-SIGN": signature,
    },
    body,
  });
  return res.json();
}

export async function POST(req: Request) {
  const key = process.env.BYBIT_API_KEY;
  const secret = process.env.BYBIT_API_SECRET;
  const base = process.env.BYBIT_BASE || "https://api.bybit.com";
  if (!key || !secret) {
    return json({ error: "Exchange keys not configured (BYBIT_API_KEY / BYBIT_API_SECRET). Intentionally disabled for the local demo." }, 501);
  }
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "invalid JSON" }, 400); }
  const symbol = String(b.instrument || "").toUpperCase();
  const side = b.direction === "long" ? "Buy" : "Sell";
  const qty = String(b.qty ?? (typeof b.positionSize === "number" ? b.positionSize.toFixed(3) : b.positionSize));
  try {
    await bybit(base, "/v5/position/set-leverage", JSON.stringify({ category: "linear", symbol, buyLeverage: String(b.leverage), sellLeverage: String(b.leverage) }), key, secret);
    const order = await bybit(base, "/v5/order/create", JSON.stringify({
      category: "linear", symbol, side, orderType: "Market", qty,
      takeProfit: b.tp ? String(b.tp) : undefined,
      stopLoss: b.sl ? String(b.sl) : undefined,
      tpslMode: "Full",
    }), key, secret);
    return json({ ok: true, order });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 502);
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
