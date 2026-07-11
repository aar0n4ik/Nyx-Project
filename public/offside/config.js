/*
 * OFFSIDE runtime config (same-origin). Safe to commit — contains NO secrets.
 * Secrets (Groq key, TxLINE token, exchange keys) live only in Vercel env vars,
 * read server-side by the /api routes. The browser never sees them.
 */
window.CW_GROQ_PROXY = "/api/analyze-trade"; // AI narrative (works offline too)
window.CW_ORDER_PROXY = "";                   // FUTURE: set to "/api/place-order" after adding exchange keys
window.TXLINE_PROXY  = "/api/txline";         // free match-data feed proxy
window.TXLINE_NET    = "devnet";              // "devnet" (free) or "mainnet"
