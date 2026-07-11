/*
 * GET /api/txline/<...>  ->  forwards to the real TxLINE API server-side,
 * injecting your JWT + apiToken from Vercel env. Works for JSON and the SSE stream.
 * Example: /api/txline/scores/snapshot/12345?asOf=...  ->  {origin}/api/scores/snapshot/12345?asOf=...
 */
export const runtime = "edge";

const ORIGINS: Record<string, string> = {
  devnet: "https://txline-dev.txodds.com",
  mainnet: "https://txline.txodds.com",
};

function txOrigin(): string {
  return process.env.TXLINE_ORIGIN || ORIGINS[process.env.TXLINE_NET || "devnet"] || ORIGINS.devnet;
}

export async function GET(req: Request, ctx: { params: { path?: string[] } }) {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!jwt || !apiToken) {
    return new Response(
      JSON.stringify({ error: "TxLINE not configured. Set TXLINE_JWT and TXLINE_API_TOKEN in Vercel env." }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  }
  const path = (ctx.params.path || []).join("/");
  const search = new URL(req.url).search;
  const target = `${txOrigin()}/api/${path}${search}`;
  const accept = req.headers.get("accept") || "application/json";
  const upstream = await fetch(target, {
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken, Accept: accept },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
