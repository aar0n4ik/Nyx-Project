export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function GET() {
  const body = {
    rules: [
      { pathPattern: "/bet", apiPath: "/api/actions/bet" },
      { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
    ],
  };
  return new Response(JSON.stringify(body), { headers: CORS });
}
