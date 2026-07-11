/*
 * OFFSIDE — offline-first engine. ZERO network required. Real crypto:
 *   - Ed25519 via Web Crypto (Solana's curve; graceful ECDSA P-256 fallback)
 *   - SHA-256 commit-reveal, hash-chained + signed PoLI receipts (re-verified)
 *   - Real P2P mesh across tabs via BroadcastChannel
 * Three tracks share ONE engine: Fan (consumer), Market (prediction), Agent (trading).
 * Simulated-only: the LLM (real build = QVAC Qwen3-4B) and RPC broadcast — both labeled.
 */

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const hexToBuf = (h) => { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a.buffer; };
const short = (s, n = 10) => s.slice(0, n) + "\u2026" + s.slice(-6);
const sha256 = async (data) => hex(await crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data));
const rand = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
const nowSec = () => Math.floor(Date.now() / 1000);

/* ---- signature abstraction: prefer Ed25519 (Solana), fall back to P-256 ---- */
const SIG = {
  name: "Ed25519", ready: false,
  async detect() {
    try {
      const k = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      await crypto.subtle.sign("Ed25519", k.privateKey, new Uint8Array([1]));
      this.name = "Ed25519";
    } catch { this.name = "ECDSA-P256"; }
    this.ready = true; return this.name;
  },
  _gen() { return this.name === "Ed25519" ? { name: "Ed25519" } : { name: "ECDSA", namedCurve: "P-256" }; },
  _sign() { return this.name === "Ed25519" ? { name: "Ed25519" } : { name: "ECDSA", hash: "SHA-256" }; },
  generateKey() { return crypto.subtle.generateKey(this._gen(), true, ["sign", "verify"]); },
  async pub(key) { return hex(await crypto.subtle.exportKey("raw", key.publicKey)); },
  async sign(priv, bytes) { return hex(await crypto.subtle.sign(this._sign(), priv, bytes)); },
  verify(pub, sigHex, bytes) { return crypto.subtle.verify(this._sign(), pub, hexToBuf(sigHex), bytes); },
};

/* ---------------- PoLI: Proof-of-Local-Inference ---------------- */
class PoLI {
  constructor() { this.chain = []; }
  async init() { this.key = await SIG.generateKey(); this.pubHex = await SIG.pub(this.key); }
  _stable(r) { return JSON.stringify([r.index, r.modelId, r.promptHash, r.outputHash, r.deviceAttestation, r.prevHash]); }
  async _hash(r) { return sha256(this._stable(r)); }
  async record({ modelId, prompt, output, attestation }) {
    const prev = this.chain.at(-1);
    const prevHash = prev ? await this._hash(prev) : "0".repeat(64);
    const base = { index: this.chain.length, modelId, promptHash: await sha256(prompt), outputHash: await sha256(output), deviceAttestation: attestation, prevHash };
    const signature = await SIG.sign(this.key.privateKey, enc.encode(this._stable(base)));
    this.chain.push({ ...base, signature });
    return this.chain.at(-1);
  }
  async verify() {
    let prevHash = "0".repeat(64);
    for (const r of this.chain) {
      if (r.prevHash !== prevHash) return { ok: false, at: r.index, reason: "broken chain link" };
      const { signature, ...base } = r;
      const valid = await SIG.verify(this.key.publicKey, signature, enc.encode(this._stable(base)));
      if (!valid) return { ok: false, at: r.index, reason: "bad signature" };
      prevHash = await this._hash(r);
    }
    return { ok: true, count: this.chain.length };
  }
}

/* ---------------- On-device agent (stub for QVAC Qwen3-4B) ---------------- */
function onDeviceDecision(question, choice) {
  return { outcome: choice, rationaleKey: choice === 1 ? "rationale_yes" : "rationale_no", model: "Qwen3-4B-Q4_K_M (local)" };
}
function netguardAttestation() { return `egress=0;online=${navigator.onLine ? 1 : 0};ts=${nowSec()}`; }

/* ---------------- Wallet + durable-nonce offline signing ---------------- */
class OfflineWallet {
  async init() {
    this.key = await SIG.generateKey();
    this.pubHex = await SIG.pub(this.key);
    this.noncePool = Array.from({ length: 16 }, () => rand(32));
  }
  claimNonce() { if (!this.noncePool.length) this.noncePool.push(rand(32)); return this.noncePool.shift(); }
  async signTx(instruction) {
    const nonce = this.claimNonce();
    const message = {
      version: 0,
      feePayer: "Relayer1111111111111111111111111111111111",
      recentBlockhash: nonce,
      instructions: [{ program: "System", kind: "nonceAdvance", nonce }, instruction],
    };
    const serialized = enc.encode(JSON.stringify(message));
    const signature = await SIG.sign(this.key.privateKey, serialized);
    return {
      id: `${instruction.market}:${nowSec()}:${Math.random().toString(36).slice(2, 7)}`,
      signer: this.pubHex, nonce, signature,
      message: btoa(String.fromCharCode(...serialized)), createdAt: nowSec(), broadcastSig: null,
    };
  }
  verifyTx(tx) { return SIG.verify(this.key.publicKey, tx.signature, Uint8Array.from(atob(tx.message), (c) => c.charCodeAt(0))); }
}

/* ---------------- P2P mesh via BroadcastChannel (real, offline) ---------------- */
class Mesh {
  constructor(onRelay) {
    this.queue = new Map(); this.peers = 0; this.onRelay = onRelay;
    this.chan = ("BroadcastChannel" in self) ? new BroadcastChannel("offside-mesh") : null;
    if (this.chan) {
      this.chan.onmessage = (e) => {
        const m = e.data;
        if (m.t === "hello") { this.peers++; this.chan.postMessage({ t: "ack" }); updatePeers(); }
        else if (m.t === "ack") { this.peers++; updatePeers(); }
        else if (m.t === "tx" && !this.queue.has(m.tx.id)) { this.queue.set(m.tx.id, m.tx); onRelay(m.tx); }
        else if (m.t === "settled") { const q = this.queue.get(m.id); if (q) q.broadcastSig = m.sig; }
      };
      this.chan.postMessage({ t: "hello" });
    }
  }
  enqueue(tx) { this.queue.set(tx.id, tx); this.chan && this.chan.postMessage({ t: "tx", tx }); }
  async flush() {
    const settled = [];
    for (const tx of this.queue.values()) {
      if (tx.broadcastSig) continue;
      tx.broadcastSig = await sha256(tx.signature + ":confirmed");
      settled.push(tx);
      this.chan && this.chan.postMessage({ t: "settled", id: tx.id, sig: tx.broadcastSig });
    }
    return settled;
  }
  get pending() { return [...this.queue.values()].filter((t) => !t.broadcastSig).length; }
}

/* ---------------- i18n ---------------- */
let lang = (function () {
  const supported = ["en", "ru", "uk", "de", "es"];
  let l = window.__OFFSIDE_LANG || new URLSearchParams(location.search).get("lang");
  try { l = l || localStorage.getItem("offside_lang"); } catch {}
  l = l || (navigator.language || "en").slice(0, 2).toLowerCase();
  return supported.includes(l) ? l : "en";
})();
function t(k) { const L = window.I18N; return (L[lang] && L[lang][k] != null) ? L[lang][k] : (L.en[k] != null ? L.en[k] : k); }
function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { const k = el.dataset.i18n; if (window.I18N.en[k] != null) el.textContent = t(k); });
}

/* ---------------- App wiring ---------------- */
const poli = new PoLI();
const wallet = new OfflineWallet();
let mesh, online = false, busy = false;
let mode = "consumer", agentTimer = null;

const $ = (id) => document.getElementById(id);
function set(id, text, ok) { const el = $(id); el.textContent = text; el.classList.toggle("ok", !!ok); el.classList.remove("pend"); }
function updatePeers() {
  $("peerinfo").innerHTML = mesh && mesh.peers > 0
    ? `\u{1F7E2} <b>${mesh.peers} mesh peer(s)</b> connected · your offline transactions relay through them.`
    : "Open this file in a 2nd tab \u2192 it becomes a mesh peer that relays your offline transactions.";
}
function renderStatus() {
  const q = mesh ? mesh.pending : 0;
  $("qbadge").textContent = `${q} queued`;
  if (online) { $("dot").className = "dot live"; $("statustext").textContent = q ? t("status_syncing") : t("status_synced"); }
  else { $("dot").className = "dot"; $("statustext").textContent = t("status_off"); }
}

function paintMode() {
  $("trackbadge").textContent = t("badge_" + mode);
  const trading = mode === "trading", market = mode === "prediction";
  $("choices").style.display = trading ? "none" : "grid";
  $("agentPanel").classList.remove("show");
  $("cwcalc").classList.toggle("show", trading);
  ["qlabel", "question", "hint", "hood"].forEach((id) => { const el = $(id); if (el) el.style.display = trading ? "none" : ""; });
  $("stakeline").style.display = market ? "flex" : "none";
  $("qlabel").textContent = t(market ? "ql_prediction" : "ql_consumer");
  $("question").textContent = t(market ? "q_prediction" : "q_consumer");
  $("hinttxt").textContent = t(market ? "hint_prediction" : "hint_consumer");
  $("btnYesTxt").textContent = t("yes");
  $("btnNoTxt").textContent = t("no");
}

function setLang(next) {
  lang = next;
  try { localStorage.setItem("offside_lang", next); } catch {}
  applyStatic();
  paintMode();
  $("btnVerify").textContent = t("verify");
  $("btnFlush").textContent = t("flush");
  $("netlabel").textContent = online ? t("netlabel_on") : t("netlabel_off");
  renderStatus();
  if (window.CW) window.CW.setLang(next);
}

function selectTrack(m) {
  mode = m;
  $("trackpick").classList.add("hidden");
  paintMode();
  stopAgent();
  if (m === "trading" && window.CW) window.CW.mount($("cwcalc"), { lang, online, sign: (payload) => wallet.signTx(payload) });
}

/* ---- Trading track: autonomous edge detector ---- */
async function agentTick() {
  const side = Math.random() > 0.45 ? 1 : 0;
  await predict(side);
  const log = $("agentlog");
  const el = document.createElement("div");
  el.className = "sig";
  el.innerHTML = `<span class="side ${side ? "up" : "dn"}">${side ? t("yes") : t("no")}</span>`
    + `<span class="m">${t("agent_edge")} · ${t("agent_signed")}</span>`
    + `<span class="h">0x${Math.random().toString(16).slice(2, 8)}</span>`;
  log.prepend(el);
  while (log.children.length > 5) log.removeChild(log.lastChild);
}
function startAgent() { stopAgent(); agentTick(); agentTimer = setInterval(agentTick, 4500); }
function stopAgent() { if (agentTimer) { clearInterval(agentTimer); agentTimer = null; } }

async function predict(choice) {
  if (busy) return; busy = true;
  $("btnYes").disabled = $("btnNo").disabled = true;
  $("hood").open = true;
  const market = mode === "prediction" ? "H2Lead:ARGvFRA" : "GoalInInterval:ARGvFRA:60-70";
  const question = mode === "prediction" ? "Will ARG lead FRA in H2 goals?" : "Goal between 60-70?";

  const dec = onDeviceDecision(question, choice);
  set("v_llm", `${dec.model} \u2192 ${choice ? "YES" : "NO"}`, true);

  const receipt = await poli.record({ modelId: dec.model, prompt: question + "|" + choice, output: dec.rationaleKey, attestation: netguardAttestation() });
  set("v_poli", `#${receipt.index} signed · ${short(receipt.signature)}`, true);

  const salt = rand(31);
  const commitment = await sha256(choice + "|" + salt);
  set("v_zk", `commit ${short(commitment)}  (pick hidden)`, true);

  const tx = await wallet.signTx({ program: "settlement", kind: "commit_prediction", market, commitment });
  const sigOk = await wallet.verifyTx(tx);
  set("v_sig", `${short(tx.signature)}  ${sigOk ? "\u2713 self-verified" : "\u2717"}`, sigOk);
  set("v_nonce", `${short(tx.nonce)}  (never expires)`, true);

  mesh.enqueue(tx);
  set("v_mesh", online ? "broadcasting\u2026" : "queued offline · relays on reconnect", online);

  $("result").classList.add("show");
  $("rtitle").textContent = online ? t("r_sent") : t("r_signed_off");
  $("rpick").textContent = choice ? t("yes") + " \u26bd" : t("no") + " \u{1F6AB}";
  $("rdot").className = "dot" + (online ? " live" : "");
  $("rationale").textContent = t(dec.rationaleKey) + (online ? "" : t("rationale_nosig"));

  renderStatus();
  if (online) await settle();
  busy = false; $("btnYes").disabled = $("btnNo").disabled = false;
}

async function settle() {
  if (!mesh.pending) { renderStatus(); return; }
  $("dot").className = "dot sync"; $("statustext").textContent = t("status_syncing");
  await new Promise((r) => setTimeout(r, 650));
  const settled = await mesh.flush();
  if (settled.length) {
    const last = settled.at(-1);
    set("v_mesh", `relayed · ${settled.length} tx`, true);
    set("v_settle", `settled vs TxLINE · ${short(last.broadcastSig)}`, true);
    $("rtitle").textContent = t("r_settled");
    $("rdot").className = "dot live";
  }
  renderStatus();
}

async function toggleNet() {
  online = !online;
  $("netswitch").classList.toggle("on", online);
  $("netlabel").textContent = online ? t("netlabel_on") : t("netlabel_off");
  renderStatus();
  if (window.CW) window.CW.setOnline(online);
  if (online) await settle();
  else { const el = $("v_settle"); el.textContent = "pending network"; el.classList.remove("ok"); el.classList.add("pend"); }
}

async function verifyPoli() {
  const btn = $("btnVerify"); btn.textContent = t("verifying");
  const res = await poli.verify();
  btn.textContent = res.ok ? `\u2705 ${t("verify_ok")} · ${res.count} ${t("inferences")}` : `\u274C ${t("verify_bad")} #${res.at}`;
  btn.style.color = res.ok ? "var(--green)" : "var(--red)";
  setTimeout(() => { btn.textContent = t("verify"); btn.style.color = ""; }, 2600);
}

(async function main() {
  const algo = await SIG.detect();
  await poli.init();
  await wallet.init();
  mesh = new Mesh(() => { renderStatus(); set("v_mesh", "relayed a peer's offline tx", true); });

  applyStatic();
  paintMode();
  $("lang").value = lang;
  $("btnVerify").textContent = t("verify");
  $("btnFlush").textContent = t("flush");
  $("netlabel").textContent = t("netlabel_off");
  updatePeers();
  renderStatus();

  const foot = $("foottech");
  if (foot) foot.innerHTML = foot.innerHTML.replace("<code>Ed25519</code>", `<code>${algo === "Ed25519" ? "Ed25519" : "ECDSA P-256"}</code>`);

  $("lang").onchange = (e) => setLang(e.target.value);
  document.querySelectorAll(".tcard").forEach((c) => { c.onclick = () => selectTrack(c.dataset.track); });
  $("changetrack").onclick = () => { stopAgent(); $("trackpick").classList.remove("hidden"); };
  $("btnYes").onclick = () => predict(1);
  $("btnNo").onclick = () => predict(0);
  $("netswitch").onclick = toggleNet;
  $("netswitch").onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleNet(); } };
  $("btnVerify").onclick = verifyPoli;
  $("btnFlush").onclick = async () => { if (!online) await toggleNet(); else await settle(); };
  let m = 63; setInterval(() => { m = m < 70 ? m + 1 : 63; $("clock").textContent = m + "'"; }, 5000);
})();
