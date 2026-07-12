// Nyx P2P mesh — gossips verified TxLINE snapshots device-to-device over Hyperswarm.
// Real Hyperswarm when installed; graceful in-memory no-op fallback otherwise.
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
const PROTO = "nyx-mesh-v1";
function topicKey(name) { return crypto.createHash("sha256").update("nyx:" + name).digest(); }
export class NyxMesh extends EventEmitter {
  constructor({ topic = "txline-worldcup", nodeId } = {}) {
    super();
    this.topicName = topic;
    this.nodeId = nodeId || crypto.randomBytes(6).toString("hex");
    this.swarm = null;
    this.peers = new Set();
    this.seen = new Map(); // fixtureId -> highest seq seen
    this.seq = 0;
    this.started = false;
  }
  async start() {
    if (this.started) return this;
    this.started = true;
    let Hyperswarm;
    try { Hyperswarm = (await import("hyperswarm")).default; }
    catch { this.emit("warn", "hyperswarm not installed \u2014 running standalone (no P2P)"); return this; }
    this.swarm = new Hyperswarm();
    const key = topicKey(this.topicName);
    this.swarm.on("connection", (conn, info) => {
      const id = info && info.publicKey ? info.publicKey.toString("hex").slice(0, 12) : crypto.randomBytes(6).toString("hex");
      this.peers.add(conn);
      this.emit("peer", { id, count: this.peers.size });
      conn.on("data", (buf) => this._onData(conn, buf));
      conn.on("error", () => {});
      conn.on("close", () => { this.peers.delete(conn); this.emit("peer", { id, count: this.peers.size }); });
    });
    const disc = this.swarm.join(key, { server: true, client: true });
    await disc.flushed().catch(() => {});
    this.emit("ready", { topic: this.topicName, nodeId: this.nodeId });
    return this;
  }
  _onData(conn, buf) {
    let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }
    if (!msg || msg.proto !== PROTO || msg.type !== "snapshot") return;
    const s = msg.snapshot; if (!s || s.fixtureId == null) return;
    const prev = this.seen.get(s.fixtureId) || -1;
    if (msg.seq <= prev) return; // dedupe / older
    this.seen.set(s.fixtureId, msg.seq);
    this.emit("snapshot", { snapshot: s, from: msg.nodeId, seq: msg.seq, ttl: msg.ttl });
    if (msg.ttl > 0) this._flood(buf, conn, msg.ttl - 1); // re-gossip to others
  }
  _flood(buf, except, ttl) {
    if (ttl < 0) return;
    for (const p of this.peers) { if (p !== except) { try { p.write(buf); } catch {} } }
  }
  broadcast(snapshot) {
    if (snapshot.fixtureId == null) throw new Error("snapshot.fixtureId required");
    const prev = this.seen.get(snapshot.fixtureId) || -1;
    const seq = Math.max(prev + 1, ++this.seq);
    this.seen.set(snapshot.fixtureId, seq);
    const msg = { proto: PROTO, type: "snapshot", nodeId: this.nodeId, seq, ttl: 4, snapshot };
    const buf = Buffer.from(JSON.stringify(msg));
    for (const p of this.peers) { try { p.write(buf); } catch {} }
    this.emit("broadcast", { fixtureId: snapshot.fixtureId, seq, peers: this.peers.size });
    return seq;
  }
  peerCount() { return this.peers.size; }
  async stop() { try { if (this.swarm) await this.swarm.destroy(); } catch {} this.peers.clear(); this.started = false; }
}
export default NyxMesh;
