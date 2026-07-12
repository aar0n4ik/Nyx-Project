(function () {
  const PROXY = window.TXLINE_PROXY || "/api/txline";
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const fmt = (n, d) => (n == null || isNaN(n) ? "\u2013" : Number(n).toFixed(d == null ? 2 : d));
  const pct = (n) => (n == null || isNaN(n) ? "\u2013" : (n * 100).toFixed(1) + "%");
  const MATCHES = [
    { id: 17588232, h: { n: "Spain", f: "\uD83C\uDDEA\uD83C\uDDF8" }, a: { n: "Saudi Arabia", f: "\uD83C\uDDF8\uD83C\uDDE6" } },
    { id: 17588302, h: { n: "Ecuador", f: "\uD83C\uDDEA\uD83C\uDDE8" }, a: { n: "Germany", f: "\uD83C\uDDE9\uD83C\uDDEA" } },
    { id: 17588389, h: { n: "Argentina", f: "\uD83C\uDDE6\uD83C\uDDF7" }, a: { n: "Austria", f: "\uD83C\uDDE6\uD83C\uDDF9" } },
    { id: 17926647, h: { n: "France", f: "\uD83C\uDDEB\uD83C\uDDF7" }, a: { n: "Iraq", f: "\uD83C\uDDEE\uD83C\uDDF6" } },
    { id: 17588390, h: { n: "Belgium", f: "\uD83C\uDDE7\uD83C\uDDEA" }, a: { n: "Iran", f: "\uD83C\uDDEE\uD83C\uDDF7" } },
    { id: 17588303, h: { n: "Switzerland", f: "\uD83C\uDDE8\uD83C\uDDED" }, a: { n: "Canada", f: "\uD83C\uDDE8\uD83C\uDDE6" } },
  ];
  const MARKETS = [
    { k: "ou25", g: "Total goals", l: "Over 2.5" },{ k: "ou15", g: "Total goals", l: "Over 1.5" },
    { k: "btts", g: "Both teams to score", l: "Yes" },{ k: "h", g: "Match winner", l: "Home" },
    { k: "d", g: "Match winner", l: "Draw" },{ k: "a", g: "Match winner", l: "Away" },
    { k: "nh", g: "Next goal", l: "Home" },{ k: "na", g: "Next goal", l: "Away" },
  ];
  const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / fact(k);
  const poisCdf = (k, l) => { let s = 0; for (let i = 0; i <= k; i++) s += pois(i, l); return s; };
  const rp = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const clampP = (p) => Math.min(0.995, Math.max(0.005, p));
  function parseSnap(json) {
    const arr = Array.isArray(json) ? json : (json && (json.events || json.data)) || [];
    let last = null;
    for (const e of arr) { if (e && (e.Score || e.Clock || e.GameState)) last = e; }
    const n = last || {};
    const g1 = (((n.Score || {}).Participant1 || {}).Total || {}).Goals;
    const g2 = (((n.Score || {}).Participant2 || {}).Total || {}).Goals;
    const secs = (n.Clock || {}).Seconds; const running = (n.Clock || {}).Running;
    const state = n.GameState || "scheduled";
    const minute = secs != null ? Math.min(90, Math.floor(secs / 60)) : 0;
    const live = !!running || /play|inplay|1h|2h|live|first|second/i.test(String(state));
    return { g1: g1 || 0, g2: g2 || 0, minute, live, state };
  }
  function model(st) {
    const minute = Math.min(90, st.minute || 0); const rem = Math.max(0.001, (90 - minute) / 90);
    const gc = (st.g1 || 0) + (st.g2 || 0); const lamRem = 2.7 * rem; const lamH = lamRem * 0.5, lamA = lamRem * 0.5;
    const over = (line) => { const kmax = Math.floor(line) - gc; if (kmax < 0) return 0.995; return clampP(1 - poisCdf(kmax, lamRem)); };
    const pHomeMore = (st.g1 || 0) > 0 ? 1 : 1 - Math.exp(-lamH);
    const pAwayMore = (st.g2 || 0) > 0 ? 1 : 1 - Math.exp(-lamA);
    const btts = clampP(pHomeMore * pAwayMore);
    let wh = 0, wd = 0, wa = 0; const N = 3000;
    for (let i = 0; i < N; i++) { const fh = st.g1 + rp(lamH), fa = st.g2 + rp(lamA); if (fh > fa) wh++; else if (fh < fa) wa++; else wd++; }
    const pNoMore = Math.exp(-lamRem);
    const nh = clampP((lamH / (lamH + lamA)) * (1 - pNoMore)); const na = clampP((lamA / (lamH + lamA)) * (1 - pNoMore));
    return { ou25: over(2.5), ou15: over(1.5), btts, h: clampP(wh / N), d: clampP(wd / N), a: clampP(wa / N), nh, na, minute, gc, lamRem };
  }
  const oddsOf = (p) => Math.max(1.01, 1 / clampP(p));
  function verdicts(p, bookOdds, bankroll, riskCapPct) {
    const edge = bookOdds * p - 1; const b = bookOdds - 1;
    const kelly = b > 0 ? Math.max(0, (bookOdds * p - 1) / b) : 0; const kFrac = kelly * 0.5;
    const cap = (riskCapPct || 2) / 100; const stakePct = Math.min(kFrac, cap);
    const stake = bankroll * stakePct; const profit = stake * b; const rows = [];
    const push = (label, val, ok) => rows.push({ label, val, ok });
    push("Edge (EV)", pct(edge), edge > 0.05 ? "good" : edge > 0 ? "ok" : "bad");
    push("Half-Kelly stake", pct(stakePct) + " of bankroll", stakePct > 0 && stakePct <= cap ? (stakePct <= 0.02 ? "good" : "ok") : "bad");
    push("Model confidence", p >= 0.6 || p <= 0.4 ? "High" : "Medium", p >= 0.6 || p <= 0.4 ? "good" : "ok");
    const overall = edge <= 0 ? "bad" : edge > 0.05 && stakePct > 0 ? "good" : "ok";
    push("Overall", overall === "good" ? "Value bet" : overall === "ok" ? "Thin edge" : "No bet", overall);
    return { edge, kelly, stakePct, stake, profit, rows, overall };
  }
  const LS = "nyx_positions";
  const loadPos = () => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { return []; } };
  const savePos = (p) => { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) {} };
  const S = { match: MATCHES[0], market: MARKETS[0], st: { g1: 0, g2: 0, minute: 0, live: false, state: "scheduled" }, m: null, hist: [], timer: null, positions: loadPos() };
  function style() {
    if ($("#nyx-trade-css")) return; const s = el("style"); s.id = "nyx-trade-css";
    s.textContent = `#nyxtrade{--nb:#2563eb;--nc:#06b6d4;--ink:#0b1220;--mut:#5b6b86;--line:#e6ecf5;--good:#16a34a;--bad:#dc2626;--ok:#d97706}
    .nt-wrap{margin-top:26px;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 18px 50px rgba(37,99,235,.10);overflow:hidden}
    .nt-top{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding:16px 20px;background:linear-gradient(90deg,#f4f8ff,#eef6ff);border-bottom:1px solid var(--line)}
    .nt-top h3{margin:0;font-size:16px;color:var(--ink)}
    .nt-badge{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:#e8f0ff;color:var(--nb)} .nt-live{background:#fde8e8;color:#dc2626}
    .nt-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:0}@media(max-width:820px){.nt-grid{grid-template-columns:1fr}}
    .nt-l{padding:20px;border-right:1px solid var(--line)}.nt-r{padding:20px}@media(max-width:820px){.nt-l{border-right:0;border-bottom:1px solid var(--line)}}
    .nt-quote{border:1px solid var(--line);border-radius:16px;padding:16px;background:linear-gradient(180deg,#fff,#f7faff)}
    .nt-teams{display:flex;align-items:center;justify-content:space-between;gap:8px}.nt-team{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--ink)}.nt-team .fl{font-size:26px}
    .nt-score{font-size:26px;font-weight:800;color:var(--ink)}.nt-mkt{margin-top:6px;color:var(--mut);font-size:13px}
    .nt-odds{display:flex;align-items:baseline;gap:10px;margin-top:12px}.nt-odds b{font-size:40px;line-height:1;color:var(--nb);font-variant-numeric:tabular-nums}
    .nt-move{font-weight:700;font-size:14px}.up{color:var(--good)}.down{color:var(--bad)}.nt-canvas{width:100%;height:70px;margin-top:10px;display:block}
    .nt-field{margin:12px 0}.nt-field label{display:block;font-size:12px;color:var(--mut);margin-bottom:5px;font-weight:600}
    .nt-field select,.nt-field input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;color:var(--ink);background:#fff}
    .nt-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .nt-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 14px;border:0;border-radius:12px;background:linear-gradient(90deg,var(--nb),var(--nc));color:#fff;font-weight:700;cursor:pointer;font-size:15px}
    .nt-btn.sec{background:#fff;color:var(--nb);border:1px solid var(--nb)}.nt-btn.gho{background:#f2f6ff;color:var(--nb)}
    .nt-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}.nt-metric{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fbfdff}
    .nt-metric .k{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}.nt-metric .v{font-size:20px;font-weight:800;color:var(--ink)}
    .nt-rows{margin-top:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden}.nt-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--line);font-size:14px}.nt-row:last-child{border-bottom:0}
    .nt-row .lab{color:var(--mut)}.nt-row .rt{font-weight:700;display:flex;align-items:center;gap:8px}.dot{width:9px;height:9px;border-radius:50%}.dot.good{background:var(--good)}.dot.ok{background:var(--ok)}.dot.bad{background:var(--bad)}
    .nt-ai{margin-top:14px;border:1px solid var(--line);border-radius:12px;padding:14px;background:#f7faff}.nt-ai .eng{font-size:12px;font-weight:700;color:var(--nb);display:flex;align-items:center;gap:8px;margin-bottom:6px}.nt-ai p{margin:0;color:#26324a;font-size:14px;line-height:1.5}
    .nt-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.nt-note{font-size:11px;color:var(--mut);margin-top:10px;line-height:1.5}
    #nyx-pos{position:fixed;right:18px;bottom:18px;width:320px;max-width:92vw;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 20px 60px rgba(11,18,32,.18);z-index:60;overflow:hidden;transform:translateY(120%);transition:transform .25s ease}#nyx-pos.open{transform:none}
    .pos-h{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:linear-gradient(90deg,var(--nb),var(--nc));color:#fff;font-weight:700;font-size:14px}.pos-h button{background:rgba(255,255,255,.2);border:0;color:#fff;border-radius:8px;padding:4px 8px;cursor:pointer}
    .pos-b{max-height:44vh;overflow:auto;padding:8px 10px}.pos-i{border:1px solid var(--line);border-radius:10px;padding:9px 11px;margin-bottom:8px;font-size:13px}.pos-i .t{font-weight:700;color:var(--ink)}.pos-i .m{color:var(--mut);font-size:12px}.pos-i .st{font-weight:700}.pos-i .st.win{color:var(--good)}.pos-i .st.lose{color:var(--bad)}.pos-i .st.open{color:var(--nb)}
    .pos-f{padding:10px 12px;border-top:1px solid var(--line);font-size:13px;display:flex;justify-content:space-between;font-weight:700}
    #nyx-pos-tab{position:fixed;right:18px;bottom:18px;z-index:59;background:linear-gradient(90deg,var(--nb),var(--nc));color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:700;cursor:pointer;box-shadow:0 12px 30px rgba(37,99,235,.35)}`;
    document.head.appendChild(s);
  }
  function build(root) {
    root.innerHTML = ""; const wrap = el("div", "nt-wrap");
    wrap.innerHTML = `<div class="nt-top"><h3>\uD83E\uDDE0 Nyx Trading Agent \u2014 in-play markets on verifiable TxLINE data</h3><span class="nt-badge" id="nt-status">model ready</span></div>
      <div class="nt-grid"><div class="nt-l"><div class="nt-quote" id="nt-quote"></div>
        <div class="nt-field"><label>Match (live World Cup)</label><select id="nt-match"></select></div>
        <div class="nt-field"><label>Market</label><select id="nt-market"></select></div>
        <div class="nt-two"><div class="nt-field"><label>Bookmaker odds</label><input id="nt-book" type="number" step="0.01" value="2.10"></div><div class="nt-field"><label>Bankroll (USD\u20AE)</label><input id="nt-bank" type="number" step="1" value="1000"></div></div>
        <div class="nt-field"><label>Max risk per bet: <span id="nt-riskv">2%</span></label><input id="nt-risk" type="range" min="0.5" max="10" step="0.5" value="2"></div>
        <button class="nt-btn" id="nt-run">Analyze bet</button></div>
        <div class="nt-r"><div class="nt-metrics"><div class="nt-metric"><div class="k">Nyx fair prob</div><div class="v" id="nt-prob">\u2013</div></div><div class="nt-metric"><div class="k">Nyx fair odds</div><div class="v" id="nt-fair">\u2013</div></div><div class="nt-metric"><div class="k">Edge (EV)</div><div class="v" id="nt-edge">\u2013</div></div><div class="nt-metric"><div class="k">Suggested stake</div><div class="v" id="nt-stake">\u2013</div></div></div>
        <div class="nt-rows" id="nt-rows"></div>
        <div class="nt-ai"><div class="eng" id="nt-eng">\u23F3 waiting for verdict</div><p id="nt-narr">Pick a match and market, then press \u201cAnalyze bet\u201d. The verdict runs on-device via QVAC when available, otherwise online, otherwise from Nyx rules \u2014 so it works even offline.</p></div>
        <div class="nt-actions"><button class="nt-btn sec" id="nt-open">Open position</button><button class="nt-btn gho" id="nt-blink">Share as Solana Blink</button></div>
        <button class="nt-btn gho" id="nt-settle" style="margin-top:10px">Settle open positions vs TxLINE</button>
        <p class="nt-note">Odds come from the <b>Nyx live model</b> built on TxLINE match state. Settlement is verified against TxLINE final scores; on Solana the agent settles stakes in <b>USD\u20AE</b> via QVAC\u2019s WDK. Educational tool, not financial advice.</p></div></div>`;
    root.appendChild(wrap);
    const mSel = $("#nt-match", wrap); MATCHES.forEach((mt, i) => { const o = el("option"); o.value = i; o.textContent = `${mt.h.f} ${mt.h.n} \u2013 ${mt.a.n} ${mt.a.f}`; mSel.appendChild(o); });
    const kSel = $("#nt-market", wrap); MARKETS.forEach((mk, i) => { const o = el("option"); o.value = i; o.textContent = `${mk.g}: ${mk.l}`; kSel.appendChild(o); });
    mSel.onchange = () => { S.match = MATCHES[+mSel.value]; S.hist = []; refresh(true); };
    kSel.onchange = () => { S.market = MARKETS[+kSel.value]; S.hist = []; paint(); };
    $("#nt-risk", wrap).oninput = (e) => { $("#nt-riskv", wrap).textContent = e.target.value + "%"; paint(); };
    ["#nt-book", "#nt-bank"].forEach((id) => { $(id, wrap).oninput = paint; });
    $("#nt-run", wrap).onclick = analyze; $("#nt-open", wrap).onclick = openPosition; $("#nt-blink", wrap).onclick = shareBlink; $("#nt-settle", wrap).onclick = settleAll;
    buildPosPanel(); paint();
  }
  function curProb() { return S.m ? S.m[S.market.k] : null; }
  function paintQuote() {
    const q = $("#nt-quote"); if (!q) return; const mt = S.match, st = S.st, p = curProb();
    const fair = p != null ? oddsOf(p) : null; const prev = S.hist.length > 1 ? S.hist[S.hist.length - 2] : null; let move = "", cls = "";
    if (fair != null && prev != null) { if (fair > prev + 0.005) { move = "\u25B2 " + fmt(fair - prev); cls = "down"; } else if (fair < prev - 0.005) { move = "\u25BC " + fmt(prev - fair); cls = "up"; } }
    q.innerHTML = `<div class="nt-teams"><span class="nt-team"><span class="fl">${mt.h.f}</span>${mt.h.n}</span><span class="nt-score">${st.g1} : ${st.g2}</span><span class="nt-team">${mt.a.n}<span class="fl">${mt.a.f}</span></span></div>
      <div class="nt-mkt">${S.market.g} \u2014 <b>${S.market.l}</b> \u00B7 ${st.live ? "minute " + st.minute + "'" : "kick-off pending"}</div>
      <div class="nt-odds"><b>${fair != null ? fmt(fair) : "\u2013"}</b><span class="nt-move ${cls}">${move}</span></div><canvas class="nt-canvas" id="nt-chart"></canvas>`;
    drawChart();
  }
  function drawChart() {
    const c = $("#nt-chart"); if (!c) return; const w = c.clientWidth || 320, h = 70; c.width = w * 2; c.height = h * 2;
    const g = c.getContext("2d"); g.scale(2, 2); g.clearRect(0, 0, w, h); const d = S.hist.slice(-40); if (d.length < 2) return;
    const mn = Math.min.apply(null, d), mx = Math.max.apply(null, d), rng = mx - mn || 1; g.beginPath();
    d.forEach((v, i) => { const x = (i / (d.length - 1)) * w; const y = h - 6 - ((v - mn) / rng) * (h - 14); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = "#2563eb"; g.lineWidth = 2; g.stroke(); g.lineTo(w, h); g.lineTo(0, h); g.closePath();
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, "rgba(37,99,235,.18)"); grad.addColorStop(1, "rgba(37,99,235,0)"); g.fillStyle = grad; g.fill();
  }
  function paint() {
    S.m = model(S.st); const p = curProb();
    if (p != null) { S.hist.push(oddsOf(p)); if (S.hist.length > 60) S.hist.shift(); }
    paintQuote();
    const book = parseFloat(($("#nt-book") || {}).value) || 0; const bank = parseFloat(($("#nt-bank") || {}).value) || 0; const risk = parseFloat(($("#nt-risk") || {}).value) || 2;
    if (p == null) return; const v = verdicts(p, book, bank, risk);
    $("#nt-prob").textContent = pct(p); $("#nt-fair").textContent = fmt(oddsOf(p)); $("#nt-edge").textContent = pct(v.edge); $("#nt-stake").textContent = fmt(v.stake) + " \u20AE";
    const rows = $("#nt-rows"); rows.innerHTML = ""; v.rows.forEach((r) => { const d = el("div", "nt-row"); d.innerHTML = `<span class="lab">${r.label}</span><span class="rt"><span class="dot ${r.ok}"></span>${r.val}</span>`; rows.appendChild(d); }); S.v = v;
  }
  function offlineText(p, v) {
    const mk = `${S.market.g.toLowerCase()} (${S.market.l})`;
    if (v.overall === "bad") return `Nyx model puts ${mk} at ${pct(p)} (~${fmt(oddsOf(p))}). At your ${fmt(parseFloat($("#nt-book").value))} odds the edge is ${pct(v.edge)} \u2014 negative EV, so skip it.`;
    return `Nyx model puts ${mk} at ${pct(p)} (fair odds ~${fmt(oddsOf(p))}). Your odds give ${pct(v.edge)} edge; half-Kelly suggests staking ${pct(v.stakePct)} of bankroll (${fmt(v.stake)} \u20AE) for ~${fmt(v.profit)} \u20AE profit if it lands.`;
  }
  async function analyze() {
    paint(); const p = curProb(), v = S.v; if (p == null || !v) return;
    $("#nt-status").textContent = "thinking\u2026"; $("#nt-eng").textContent = "\u23F3 consulting the agent\u2026";
    const ctx = { match: `${S.match.h.n} vs ${S.match.a.n}`, score: `${S.st.g1}-${S.st.g2}`, minute: S.st.minute, market: `${S.market.g}: ${S.market.l}`, fairProb: +(p).toFixed(3), fairOdds: +oddsOf(p).toFixed(2), bookOdds: parseFloat($("#nt-book").value), edge: +(v.edge).toFixed(3), suggestedStakePct: +(v.stakePct).toFixed(3), verdict: v.overall, offlineText: offlineText(p, v) };
    let res; try { res = await window.NYX_AI.analyze(ctx); } catch (e) { res = { text: ctx.offlineText, engine: "Nyx rules \u00B7 offline" }; }
    const icon = res.engine.indexOf("QVAC") === 0 ? "\uD83D\uDD12" : res.engine.indexOf("Groq") === 0 ? "\u2601\uFE0F" : "\uD83D\uDCD0";
    $("#nt-eng").innerHTML = `${icon} ${res.engine}`; $("#nt-narr").textContent = res.text;
    $("#nt-status").textContent = S.st.live ? "live" : "model ready"; $("#nt-status").className = "nt-badge" + (S.st.live ? " nt-live" : "");
  }
  function buildPosPanel() {
    if ($("#nyx-pos")) return; const tab = el("button"); tab.id = "nyx-pos-tab"; tab.textContent = "\uD83D\uDCBC Positions"; document.body.appendChild(tab);
    const panel = el("div"); panel.id = "nyx-pos";
    panel.innerHTML = `<div class="pos-h"><span>Open positions</span><button id="nyx-pos-x">\u2715</button></div><div class="pos-b" id="nyx-pos-b"></div><div class="pos-f"><span>Net P/L</span><span id="nyx-pos-pl">0.00 \u20AE</span></div>`;
    document.body.appendChild(panel); tab.onclick = () => panel.classList.toggle("open"); $("#nyx-pos-x", panel).onclick = () => panel.classList.remove("open"); renderPos();
  }
  function renderPos() {
    const b = $("#nyx-pos-b"); if (!b) return; b.innerHTML = ""; let pl = 0;
    if (!S.positions.length) b.innerHTML = `<p style="color:#5b6b86;font-size:13px;padding:8px">No positions yet. Analyze a bet and press \u201cOpen position\u201d.</p>`;
    S.positions.slice().reverse().forEach((pos) => {
      if (pos.status === "win") pl += pos.profit; else if (pos.status === "lose") pl -= pos.stake;
      const d = el("div", "pos-i"); d.innerHTML = `<div class="t">${pos.match}</div><div class="m">${pos.market} @ ${fmt(pos.bookOdds)} \u00B7 ${fmt(pos.stake)} \u20AE</div><div class="st ${pos.status}">${pos.status === "open" ? "OPEN" : pos.status === "win" ? "WON +" + fmt(pos.profit) + " \u20AE" : "LOST -" + fmt(pos.stake) + " \u20AE"}</div>`; b.appendChild(d);
    });
    $("#nyx-pos-pl").textContent = (pl >= 0 ? "+" : "") + fmt(pl) + " \u20AE"; $("#nyx-pos-pl").style.color = pl >= 0 ? "#16a34a" : "#dc2626";
  }
  function openPosition() {
    const p = curProb(), v = S.v; if (p == null || !v) { analyze(); return; }
    S.positions.push({ id: S.match.id, match: `${S.match.h.f} ${S.match.h.n} \u2013 ${S.match.a.n} ${S.match.a.f}`, marketKey: S.market.k, market: `${S.market.g}: ${S.market.l}`, bookOdds: parseFloat($("#nt-book").value), stake: v.stake, profit: v.profit, status: "open", ts: Date.now() });
    savePos(S.positions); renderPos(); const panel = $("#nyx-pos"); if (panel) panel.classList.add("open");
  }
  function settleMarket(key, st) {
    const gc = st.g1 + st.g2;
    switch (key) { case "ou25": return gc >= 3; case "ou15": return gc >= 2; case "btts": return st.g1 > 0 && st.g2 > 0; case "h": return st.g1 > st.g2; case "d": return st.g1 === st.g2; case "a": return st.g1 < st.g2; default: return null; }
  }
  async function settleAll() {
    const open = S.positions.filter((p) => p.status === "open"); if (!open.length) { alert("No open positions to settle."); return; }
    for (const pos of open) { try { const r = await fetch(`${PROXY}/scores/snapshot/${pos.id}`, { headers: { accept: "application/json" } }); if (!r.ok) continue; const st = parseSnap(await r.json()); const won = settleMarket(pos.marketKey, st); if (won === null) continue; pos.status = won ? "win" : "lose"; } catch (e) {} }
    savePos(S.positions); renderPos();
  }
  function shareBlink() {
    const p = curProb(); if (p == null) return;
    const action = location.origin + (window.NYX_ACTIONS || "/api/actions/bet") + "?match=" + S.match.id + "&market=" + S.market.k + "&odds=" + fmt(oddsOf(p));
    const blink = "https://dial.to/?action=solana-action:" + encodeURIComponent(action);
    try { navigator.clipboard.writeText(blink); } catch (e) {}
    $("#nt-eng").innerHTML = "\uD83D\uDD17 Solana Blink"; $("#nt-narr").textContent = `Shareable Solana Blink copied to clipboard \u2014 anyone can stake USD\u20AE on \u201c${S.market.g}: ${S.market.l}\u201d for ${S.match.h.n} vs ${S.match.a.n} straight from X/Discord. Backed by the live /api/actions/bet endpoint.`;
  }
  async function refresh(reset) {
    try { const r = await fetch(`${PROXY}/scores/snapshot/${S.match.id}`, { headers: { accept: "application/json" } }); if (r.ok) { S.st = parseSnap(await r.json()); const b = $("#nt-status"); if (b) { b.textContent = S.st.live ? "live" : "model ready"; b.className = "nt-badge" + (S.st.live ? " nt-live" : ""); } } } catch (e) {}
    if (reset) S.hist = []; paint();
  }
  function init() { const root = document.getElementById("nyxtrade"); if (!root) return; style(); build(root); refresh(true); if (S.timer) clearInterval(S.timer); S.timer = setInterval(() => refresh(false), 12000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
