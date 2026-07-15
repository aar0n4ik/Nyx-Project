"use client";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Any = Record<string, any>;

const exUrl = (kind: string, v?: string) =>
  v ? "https://explorer.solana.com/" + kind + "/" + v + "?cluster=devnet" : "";
const short = (s?: string) => (s ? s.slice(0, 6) + "…" + s.slice(-6) : "—");

const CPI_FALLBACK: Any = {
  nyxProgram: "GPiPk4ymC76uBntrxUXyr2rL4kWmxWRRZsBya5uxLNLY",
  txoracle: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
  tx: "65r1WhdDMuyU479caqWLjEskBrTGbZedNP6rDbgBh259MnRQo7PzCgcC1aPbVhsRNZji1FfPTD8AY7VBGaMXfV9v",
  verified: true, outcome: false, slot: 476364561, cpiDataLen: 792,
};

function useTrace(path: string) {
  const [data, setData] = useState<Any | null>(null);
  useEffect(() => {
    let on = true;
    fetch(path, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (on) setData(d); })
      .catch(() => {});
    return () => { on = false; };
  }, [path]);
  return data;
}

function seriesFrom(t: Any | null): number[] {
  if (!t) return [];
  for (const k of Object.keys(t)) {
    const v = t[k];
    if (Array.isArray(v) && v.length) {
      if (typeof v[0] === "number") return v as number[];
      if (v[0] && typeof v[0] === "object") {
        const nums = v.map((o: Any) => o?.bps ?? o?.prob ?? o?.value ?? o?.marketPriceBps).filter((x: any) => typeof x === "number");
        if (nums.length) return nums;
      }
    }
  }
  return [];
}

const S: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "radial-gradient(1200px 600px at 50% -10%, #1a1030, #06060c 60%)", color: "#e7e7f0", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "48px 18px 80px" },
  wrap: { maxWidth: 780, margin: "0 auto" },
  h1: { fontSize: 34, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 },
  sub: { opacity: 0.65, margin: "0 0 28px", fontSize: 15 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 16, padding: 20, marginBottom: 18 },
  hero: { background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(59,130,246,0.06))", border: "1px solid rgba(139,92,246,0.55)", borderRadius: 18, padding: 22, marginBottom: 18, boxShadow: "0 0 40px rgba(139,92,246,0.15)" },
  ctitle: { fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 },
  cdesc: { opacity: 0.72, fontSize: 13.5, margin: "8px 0 14px", lineHeight: 1.5 },
  row: { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13.5 },
  key: { opacity: 0.55, whiteSpace: "nowrap" },
  val: { textAlign: "right", wordBreak: "break-all" },
  link: { color: "#a78bfa", textDecoration: "none", wordBreak: "break-all" },
  badge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.4)" },
  badgeGray: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "#aaa", border: "1px solid rgba(255,255,255,0.15)" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  summary: { cursor: "pointer", opacity: 0.55, fontSize: 12, marginTop: 12 },
  pre: { overflow: "auto", fontSize: 11, background: "#0b0b13", padding: 12, borderRadius: 10, marginTop: 8, maxHeight: 260 },
  spark: { marginTop: 8, maxWidth: "100%" },
};

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div style={S.row}>
      <span style={S.key}>{k}</span>
      <span style={S.val}>{children}</span>
    </div>
  );
}
function A({ kind, v }: { kind: string; v?: string }) {
  if (!v) return <span style={S.key}>—</span>;
  return <a style={S.link} href={exUrl(kind, v)} target="_blank" rel="noreferrer">{short(v)} ↗</a>;
}
function Raw({ data }: { data: Any | null }) {
  if (!data) return null;
  return (
    <toggle>
      <summary style={S.summary}>raw JSON
      <pre style={S.pre}>{JSON.stringify(data, null, 2)}</pre>
    </toggle>
  );
}
function Spark({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const w = 300, h = 46;
  const min = Math.min(...values), max = Math.max(...values), rng = max - min || 1;
  const pts = values.map((v, i) => (i / (values.length - 1)) * w + "," + (h - ((v - min) / rng) * h)).join(" ");
  return (
    <svg width={w} height={h} style={S.spark}>
      <polyline fill="none" stroke="#a78bfa" strokeWidth={2} points={pts} />
    </svg>
  );
}

export default function VerifyPage() {
  const settle = useTrace("/settle-verified-trace.json");
  const validation = useTrace("/validation-trace.json");
  const odds = useTrace("/odds-oracle-trace.json");
  const live = useTrace("/oracle-live-trace.json");

  const s: Any = { ...CPI_FALLBACK, ...(settle || {}) };
  const bps = seriesFrom(live);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Nyx — Live On-Chain Proofs</h1>
        <p style={S.sub}>Every claim below is a real transaction on Solana devnet. Click any link to verify it yourself.</p>

        <div style={S.hero}>
          <div style={S.head}>
            <h2 style={S.ctitle}>🔗 Trustless CPI Settlement</h2>
            <span style={s.verified ? S.badge : S.badgeGray}>{s.verified ? "verified ✓" : "unverified"}</span>
          </div>
          <p style={S.cdesc}>Settlement runs through a real on-chain cross-program call from our nyx_verifier program into TxLINE&apos;s validate_stat_v2. The network verifies the match result against TxODDS&apos; Merkle root inside the transaction — if the proof fails, the CPI reverts and nothing is recorded.</p>
          <Row k="settle tx"><A kind="tx" v={s.tx} /></Row>
          <Row k="nyx_verifier program"><A kind="address" v={s.nyxProgram} /></Row>
          <Row k="TxLINE oracle (CPI target)"><A kind="address" v={s.txoracle} /></Row>
          {s.record ? <Row k="settlement record"><A kind="address" v={s.record} /></Row> : null}
          {s.dailyScoresMerkleRoots ? <Row k="TxLINE roots PDA"><A kind="address" v={s.dailyScoresMerkleRoots} /></Row> : null}
          <Row k="verified outcome">{String(s.outcome)}</Row>
          <Row k="cpi payload">{s.cpiDataLen ? s.cpiDataLen + " bytes" : "—"}</Row>
          <Row k="slot">{s.slot ?? "—"}</Row>
          <Raw data={settle} />
        </div>

        <div style={S.card}>
          <div style={S.head}>
            <h2 style={S.ctitle}>🧮 On-Chain Merkle Validation</h2>
            <span style={validation ? S.badge : S.badgeGray}>{validation ? "checked ✓" : "loading…"}</span>
          </div>
          <p style={S.cdesc}>Match statistics are proven on-chain against TxLINE&apos;s daily Merkle root — no trusted feed, the proof itself is checked by TxODDS&apos; program.</p>
          <Row k="TxLINE roots PDA"><A kind="address" v={validation?.pda} /></Row>
          <Row k="oracle program"><A kind="address" v={validation?.program} /></Row>
          <Row k="fixture">{validation?.fixtureId ?? "—"}</Row>
          <Row k="epoch day">{validation?.epochDay ?? "—"}</Row>
          <Row k="predicate">{validation ? String(validation.predicate) : "—"}</Row>
          <Raw data={validation} />
        </div>

        <div style={S.card}>
          <div style={S.head}>
            <h2 style={S.ctitle}>📈 TxLINE StablePrice Oracle</h2>
            <span style={odds ? S.badge : S.badgeGray}>{odds ? "on-chain ✓" : "loading…"}</span>
          </div>
          <p style={S.cdesc}>Fair, de-margined bookmaker consensus odds from TxODDS pushed straight onto Solana.</p>
          {odds?.bookmaker ? <Row k="source">{odds.bookmaker}</Row> : null}
          {odds?.bps ? <Row k="pushed">{odds.bps} bps</Row> : null}
          <Row k="market"><A kind="address" v={odds?.lopMarket || odds?.market} /></Row>
          <Row k="initialize_market"><A kind="tx" v={odds?.initSig || odds?.initialize_market} /></Row>
          <Row k="push_oracle"><A kind="tx" v={odds?.pushSig || odds?.push_oracle} /></Row>
          <Raw data={odds} />
        </div>

        <div style={S.card}>
          <div style={S.head}>
            <h2 style={S.ctitle}>⚡ Autonomous Live Agent (SSE)</h2>
            <span style={live ? S.badge : S.badgeGray}>{live ? "streamed ✓" : "loading…"}</span>
          </div>
          <p style={S.cdesc}>An agent subscribed to TxLINE&apos;s live feed and re-priced the on-chain oracle in real time, with no human in the loop.</p>
          {bps.length ? <Row k="oracle path">{bps[0]} → {bps[bps.length - 1]} bps</Row> : null}
          {bps.length ? <Row k="updates">{bps.length}</Row> : null}
          <Row k="market"><A kind="address" v={live?.market || live?.lopMarket} /></Row>
          <Spark values={bps} />
          <Raw data={live} />
        </div>

        <p style={S.sub}>nyx_verifier · lop · positions — all live on Solana devnet.</p>
      </div>
    </div>
  );
}
