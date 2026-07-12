// Minimal .env loader (side effect) — no dependency on dotenv.
// Reads nyx-mesh/.env (one level up from src/) and fills process.env for keys not already set.
import { readFileSync } from "node:fs";
try {
  const txt = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
} catch {}
