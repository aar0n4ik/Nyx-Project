"use strict";
// Nyx pAMM client — ручной кодировщик инструкций Anchor-программы nyx_pamm (без IDL).
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const web3 = require("@solana/web3.js");
const {
  PublicKey, TransactionInstruction, SystemProgram,
  SYSVAR_RENT_PUBKEY, Keypair, Connection, clusterApiUrl,
} = web3;

const PAMM_PROGRAM_ID = new PublicKey("8hxh836KRG4H6poU7oZ161AV71gpTLKKE1mYrEsuwpW3");
const USDT_MINT       = new PublicKey("5GPxJkwceeP36RwghtTpMJtwaYTqmbG9JdqFBTUpSDLS");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// ---- encoders ----
const disc = (name) => crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8);
const u8  = (v) => Buffer.from([Number(v) & 0xff]);
const u32LE = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(Number(v) >>> 0, 0); return b; };
const u64LE = (v) => { let x = BigInt(v); const b = Buffer.alloc(8);  for (let i=0;i<8;i++){ b[i]=Number(x&0xffn); x>>=8n; } return b; };
const i128LE = (v) => { let x = BigInt(v); if (x<0n) x=(1n<<128n)+x; const b=Buffer.alloc(16); for(let i=0;i<16;i++){ b[i]=Number(x&0xffn); x>>=8n; } return b; };
const vecI128 = (arr) => Buffer.concat([u32LE(arr.length), ...arr.map(i128LE)]);
const pk = (p) => (p instanceof PublicKey ? p : new PublicKey(p)).toBuffer();

// ---- PDAs ----
const poolPda  = (eventId) => PublicKey.findProgramAddressSync([Buffer.from("pool"), u64LE(eventId)], PAMM_PROGRAM_ID)[0];
const vaultPda = (pool)    => PublicKey.findProgramAddressSync([Buffer.from("vault"), pool.toBuffer()], PAMM_PROGRAM_ID)[0];
const posPda   = (pool,user,outcome) => PublicKey.findProgramAddressSync([Buffer.from("pos"), pool.toBuffer(), user.toBuffer(), Buffer.from([Number(outcome)&0xff])], PAMM_PROGRAM_ID)[0];
const ataOf    = (owner,mint) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), (mint||USDT_MINT).toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0];

const m  = (pubkey,isSigner,isWritable) => ({ pubkey, isSigner:!!isSigner, isWritable:!!isWritable });
const ixOf = (keys,data) => new TransactionInstruction({ programId: PAMM_PROGRAM_ID, keys, data });

// ---- instruction builders (порядок аккаунтов = задеплоенные структуры) ----
function ixInitPool({ creator, eventId, n, b, keeper }) {
  creator = new PublicKey(creator); keeper = new PublicKey(keeper || creator);
  const pool = poolPda(eventId), vault = vaultPda(pool), creatorAta = ataOf(creator, USDT_MINT);
  const keys = [
    m(pool,false,true), m(vault,false,true), m(USDT_MINT,false,false), m(creatorAta,false,true),
    m(creator,true,true), m(TOKEN_PROGRAM_ID,false,false), m(SystemProgram.programId,false,false), m(SYSVAR_RENT_PUBKEY,false,false),
  ];
  const data = Buffer.concat([disc("init_pool"), u64LE(eventId), u8(n), i128LE(b)]);
  return { ix: ixOf(keys, data), pool, vault, creatorAta };
}
function ixPushOracle({ keeper, eventId, theta }) {
  keeper = new PublicKey(keeper); const pool = poolPda(eventId);
  const keys = [ m(pool,false,true), m(keeper,true,false) ];
  const data = Buffer.concat([disc("push_oracle"), vecI128(theta)]);
  return { ix: ixOf(keys, data), pool };
}
function tradeCtx(user, eventId, outcome) {
  user = new PublicKey(user);
  const pool = poolPda(eventId), vault = vaultPda(pool), position = posPda(pool,user,outcome), userAta = ataOf(user, USDT_MINT);
  const keys = [
    m(pool,false,true), m(vault,false,true), m(position,false,true), m(userAta,false,true),
    m(user,true,true), m(TOKEN_PROGRAM_ID,false,false), m(SystemProgram.programId,false,false),
  ];
  return { pool, vault, position, userAta, user, keys };
}
function ixBuy({ user, eventId, outcome, shares, maxCost }) {
  const t = tradeCtx(user, eventId, outcome);
  const data = Buffer.concat([disc("buy"), u8(outcome), i128LE(shares), u64LE(maxCost)]);
  return { ix: ixOf(t.keys, data), ...t };
}
function ixSell({ user, eventId, outcome, shares, minReturn }) {
  const t = tradeCtx(user, eventId, outcome);
  const data = Buffer.concat([disc("sell"), u8(outcome), i128LE(shares), u64LE(minReturn)]);
  return { ix: ixOf(t.keys, data), ...t };
}
function ixResolve({ keeper, eventId, winner }) {
  keeper = new PublicKey(keeper); const pool = poolPda(eventId);
  const keys = [ m(pool,false,true), m(keeper,true,false) ];
  const data = Buffer.concat([disc("resolve"), u8(winner)]);
  return { ix: ixOf(keys, data), pool };
}
function ixClaim({ user, eventId, outcome }) {
  const t = tradeCtx(user, eventId, outcome);
  const data = Buffer.concat([disc("claim"), u8(outcome)]);
  return { ix: ixOf(t.keys, data), ...t };
}

// ---- helpers ----
const loadKeypair = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p.replace(/^~/, os.homedir()), "utf8"))));
const connection  = () => new Connection(process.env.PAMM_RPC || clusterApiUrl("devnet"), "confirmed");

module.exports = {
  PAMM_PROGRAM_ID, USDT_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  disc, u8, u32LE, u64LE, i128LE, vecI128,
  poolPda, vaultPda, posPda, ataOf,
  ixInitPool, ixPushOracle, ixBuy, ixSell, ixResolve, ixClaim,
  loadKeypair, connection,
};

// ---- self-test: node pamm-client.cjs selftest ----
if (require.main === module && process.argv[2] === "selftest") {
  const names = ["init_pool","push_oracle","buy","sell","resolve","claim"];
  console.log("== discriminators ==");
  for (const nm of names) console.log(nm.padEnd(12), disc(nm).toString("hex"));
  const ev = 42n, pool = poolPda(ev), vault = vaultPda(pool), user = Keypair.generate().publicKey;
  console.log("== sample PDAs (eventId=42) ==");
  console.log("pool ", pool.toBase58());
  console.log("vault", vault.toBase58());
  console.log("pos0 ", posPda(pool,user,0).toBase58());
  console.log("ata  ", ataOf(user,USDT_MINT).toBase58());
  const a = ixInitPool({ creator:user, eventId:ev, n:2, b:100000000000n, keeper:user });
  console.log("init_pool  -> data", a.ix.data.length, "b, keys", a.ix.keys.length);
  const o = ixPushOracle({ keeper:user, eventId:ev, theta:[-50000000n, 50000000n] });
  console.log("push_oracle-> data", o.ix.data.length, "b, keys", o.ix.keys.length);
  const t = ixBuy({ user, eventId:ev, outcome:1, shares:5000000000n, maxCost:1000000n });
  console.log("buy        -> data", t.ix.data.length, "b, keys", t.ix.keys.length);
  console.log("OK");
}
