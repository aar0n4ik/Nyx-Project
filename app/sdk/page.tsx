"use client";
import type { CSSProperties } from "react";

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet";
const EXP = "https:" + "//explorer.solana" + ".com/";
const NPM = "https:" + "//www." + "npmjs" + ".com/package/";
const CRATES = "https:" + "//crates" + ".io/crates/";
const tx = (h: string) => EXP + "tx/" + h + "?cluster=" + CLUSTER;
const addr = (a: string) => EXP + "address/" + a + "?cluster=" + CLUSTER;

const PROOF = {
  cpiResolve: "q9yZGMJbHgfSqKmrqWyhHJZ6PRNW89b2ZEJG6icVV2dEGDHRdAzYxnheS9aix9c14CEzBTERqYrPgvSjbMfWAkQ",
  arbitrate: "KDsynE3WonhsfXYPKCKhM13RqEyiKGDMYrSuXF74yNog1ccdZf55TqTD3aHa8Kjx5HL8EL14E8H2GFqqdB2vPFm",
};

const PROGRAMS: [string, string][] = [
  ["nyx_settlement", "AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3"],
  ["nyx_dispute", "7bSmAPPAypVtWsRMvMhmT6bUrJyvmc76VKXinAgwc8vN"],
  ["nyx_oracle_bridge", "BiJaXJ7kEXy8cohxf7NxfyqS2sLbxZSa3Fx4JjEZS9bk"],
];

const PACKAGES = [
  { name: "nyx-txodds-settlement", lang: "JS / TS", registry: "npm",
    url: NPM + "nyx-txodds-settlement",
    install: "npm i nyx-txodds-settlement",
    blurb: "Off-chain instruction builders, PDA derivation and account decoders for all three programs." },
  { name: "nyx-txodds-oracle", lang: "Rust", registry: "crates.io",
    url: CRATES + "nyx-txodds-oracle",
    install: "cargo add nyx-txodds-oracle",
    blurb: "On-chain program IDs, discriminators, borsh decoders and a push_resolution CPI helper." },
  { name: "nyx-txodds-verifier", lang: "Rust", registry: "crates.io",
    url: CRATES + "nyx-txodds-verifier",
    install: "cargo add nyx-txodds-verifier",
    blurb: "Verify TxLINE Merkle sports data on-chain via CPI into txoracle validate_stat_v2." },
];

const FLOW = [
  "propose (bond) -> dispute (matching bond) -> arbitrate -> slash wrong side",
  "                                  |",
  "                                  v",
  "      oracle-bridge PDA --CPI--> settlement.resolve   (no human key, ever)",
].join("\n");

const short = (s: string) => s.slice(0, 8) + "..." + s.slice(-6);

const S: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: "radial-gradient(1200px 600px at 50% -10%, #1a1030, #06060c 60%)", color: "#e7e7f0", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "48px 18px 80px" },
  wrap: { maxWidth: 820, margin: "0 auto" },
  h1: { fontSize: 34, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 },
  sub: { opacity: 0.65, margin: "0 0 28px", fontSize: 15, lineHeight: 1.5 },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 16, padding: 22, marginBottom: 18 },
  hero: { background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(59,130,246,0.06))", border: "1px solid rgba(139,92,246,0.55)", borderRadius: 18, padding: 24, marginBottom: 22, boxShadow: "0 0 40px rgba(139,92,246,0.15)" },
  ctitle: { fontSize: 18, fontWeight: 700, margin: "0 0 12px" },
  p: { opacity: 0.82, fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" },
  flow: { fontFamily: "ui-monospace, monospace", fontSize: 12.5, background: "#0b0b13", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", margin: "12px 0", whiteSpace: "pre", overflowX: "auto", color: "#c9c4e0" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  pkgName: { fontSize: 16, fontWeight: 700, fontFamily: "ui-monospace, monospace" },
  pkgMeta: { opacity: 0.6, fontSize: 12.5, margin: "2px 0 8px" },
  install: { fontFamily: "ui-monospace, monospace", fontSize: 12.5, background: "#0b0b13", borderRadius: 8, padding: "8px 10px", display: "inline-block", color: "#9be7c4", border: "1px solid rgba(255,255,255,0.06)" },
  link: { color: "#a78bfa", textDecoration: "none", fontWeight: 600 },
  row: { display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13.5 },
  key: { opacity: 0.55, whiteSpace: "nowrap" },
  monoLink: { fontFamily: "ui-monospace, monospace", wordBreak: "break-all", textAlign: "right", color: "#a78bfa", textDecoration: "none", fontWeight: 600 },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "rgba(139,92,246,0.16)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" },
  mt12: { marginTop: 12 },
  foot: { opacity: 0.5, fontSize: 12, marginTop: 26, lineHeight: 1.5 },
};

export default function SdkPage() {
  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Nyx - Trust-minimized Settlement SDK</h1>
        <p style={S.sub}>
          Open-source packages to build honest, self-settling prediction markets on
          TxODDS / TxLINE data - no trusted admin key required.
        </p>

        <section style={S.hero}>
          <h2 style={S.ctitle}>Why this exists</h2>
          <p style={S.p}>
            TxLINE proves a feed is internally consistent (a Merkle root), but it does not
            prove an outcome is true, and gives no on-chain way to challenge a bad signer.
            Built naively, every market keeps an admin key that can call resolve() - one
            leaked key and the market is drained or rigged.
          </p>
          <p style={S.p}>
            Nyx removes that key. An outcome reaches settlement only after surviving an
            optimistic dispute game, and the market oracle is a program PDA, not a person:
          </p>
          <div style={S.flow}>{FLOW}</div>
          <p style={S.p}>
            Honest asserters reclaim their bond; wrong ones are slashed to the challenger;
            undisputed outcomes finalize after a liveness window. The bridge forwards only
            the already-finalized outcome - anything else reverts.
          </p>
        </section>

        {PACKAGES.map((pkg) => (
          <section key={pkg.name} style={S.card}>
            <div style={S.head}>
              <span style={S.pkgName}>{pkg.name}</span>
              <span style={S.badge}>{pkg.registry}</span>
            </div>
            <div style={S.pkgMeta}>{pkg.lang}</div>
            <p style={S.p}>{pkg.blurb}</p>
            <code style={S.install}>{pkg.install}</code>
            <div style={S.mt12}>
              <a style={S.link} href={pkg.url} target="_blank" rel="noreferrer">View on {pkg.registry}</a>
            </div>
          </section>
        ))}

        <section style={S.card}>
          <h2 style={S.ctitle}>Programs (Solana {CLUSTER})</h2>
          {PROGRAMS.map(([name, id]) => (
            <div key={id} style={S.row}>
              <span style={S.key}>{name}</span>
              <a style={S.monoLink} href={addr(id)} target="_blank" rel="noreferrer">{id}</a>
            </div>
          ))}
        </section>

        <section style={S.card}>
          <h2 style={S.ctitle}>Proven on-chain (no mocks)</h2>
          <div style={S.row}>
            <span style={S.key}>CPI resolve via PDA oracle</span>
            <a style={S.monoLink} href={tx(PROOF.cpiResolve)} target="_blank" rel="noreferrer">{short(PROOF.cpiResolve)}</a>
          </div>
          <div style={S.row}>
            <span style={S.key}>Dispute arbitrated + slash</span>
            <a style={S.monoLink} href={tx(PROOF.arbitrate)} target="_blank" rel="noreferrer">{short(PROOF.arbitrate)}</a>
          </div>
        </section>

        <p style={S.foot}>
          Unofficial community project. Not affiliated with, sponsored by, or endorsed by
          TxODDS or Tether. Explorer cluster: {CLUSTER} - set NEXT_PUBLIC_SOLANA_CLUSTER to switch.
        </p>
      </div>
    </main>
  );
}
