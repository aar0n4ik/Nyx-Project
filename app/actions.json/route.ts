const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" }
export async function OPTIONS() { return new Response(null, { headers: CORS }) }
export async function GET() {
  const body = { rules: [
    { pathPattern: "/bet/**", apiPath: "/api/actions/bet" },
    { pathPattern: "/api/actions/bet", apiPath: "/api/actions/bet" },
    { pathPattern: "/delegate/**", apiPath: "/api/actions/delegate" },
    { pathPattern: "/api/actions/delegate", apiPath: "/api/actions/delegate" },
  ] }
  return new Response(JSON.stringify(body), { headers: CORS })
}
