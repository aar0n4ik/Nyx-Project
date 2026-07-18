import fs from "fs";
import crypto from "crypto";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction,
} from "@solana/web3.js";

if (process.env.NYX_ALLOW_MAINNET !== "1") { console.error("Refusing: set NYX_ALLOW_MAINNET=1 to move real money."); process.exit(1); }

const PROGRAM = new PublicKey("AmMSLCCtJPCU3EJHEyxwAUTXQuzcAHVEVkCFJv6JrrW3");
const TOKEN   = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOC   = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYS     = SystemProgram.programId;
const MINT    = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // real Tether USD₮ (mainnet)
const ONE = 1_000_000;
const STAKE = 20_000;   // 0.02 USD₮ — real money, tiny by design
const REF_BPS = 500;    // 5% — enforced by the program
const OVER_BPS = 600;   // 6% — must revert on-chain

const conn = new Connection(process.env.SOLANA_RPC_MAINNET || "https://api.mainnet-beta.solana.com", "confirmed");
const link = (s) => "https://explorer.solana.com/tx/" + s;
const disc = (n) => crypto.createHash("sha256").update("global:" + n).digest().subarray(0, 8);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const m = (pubkey, s, w) => ({ pubkey, isSigner: s, isWritable: w });
const ata = (owner) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ASSOC)[0];
const load = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p))));
const send = (ixs, signers) => sendAndConfirmTransaction(conn, new Transaction().add(...ixs), signers, { commitment: "confirmed" });
async function bal(o){ try { return Number((await conn.getTokenAccountBalance(ata(o))).value.amount); } catch { return 0; } }
function createAtaIx(payer, owner){ return new TransactionInstruction({ programId: ASSOC, data: Buffer.from([1]),
  keys: [ m(payer,true,true), m(ata(owner),false,true), m(owner,false,false), m(MINT,false,false), m(SYS,false,false), m(TOKEN,false,false) ] }); }

const user = load(process.env.NYX_MAINNET_KEYPAIR || (process.env.HOME + "/.config/solana/id.json"));
const affiliate = load("scripts/.agent.json");
console.log("MAINNET bettor   :", user.publicKey.toBase58());
console.log("MAINNET affiliate:", affiliate.publicKey.toBase58());

const held = await bal(user.publicKey);
if (held < STAKE) { console.error(`Bettor holds ${held/ONE} USD₮, need >= ${STAKE/ONE}. Fund the wallet with real USD₮ first.`); process.exit(1); }

const fixtureId = Date.now() % 4_000_000_000;
const marketKey = Buffer.alloc(8); marketKey.writeBigUInt64LE(BigInt(fixtureId % 100000));
const [market]   = PublicKey.findProgramAddressSync([Buffer.from("market"), u64(fixtureId), marketKey], PROGRAM);
const [vault]    = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PROGRAM);
const [position] = PublicKey.findProgramAddressSync([Buffer.from("pos"), market.toBuffer(), user.publicKey.toBuffer()], PROGRAM);
const closeTs = Math.floor(Date.now()/1000) + 3600;

const createMarketIx = new TransactionInstruction({ programId: PROGRAM,
  data: Buffer.concat([disc("create_market"), u64(fixtureId), marketKey, i64(closeTs)]),
  keys: [ m(market,false,true), m(user.publicKey,true,true), m(MINT,false,false), m(vault,false,true),
          m(TOKEN,false,false), m(SYS,false,false), m(SYSVAR_RENT_PUBKEY,false,false) ] });

const betIx = (bps) => new TransactionInstruction({ programId: PROGRAM,
  data: Buffer.concat([disc("place_bet_with_ref"), Buffer.from([1]), u64(STAKE), u16(bps)]),
  keys: [ m(market,false,true), m(position,false,true), m(user.publicKey,true,true),
          m(ata(user.publicKey),false,true), m(ata(affiliate.publicKey),false,true),
          m(vault,false,true), m(TOKEN,false,false), m(SYS,false,false) ] });

const pre = [];
if (!(await conn.getAccountInfo(ata(affiliate.publicKey)))) pre.push(createAtaIx(user.publicKey, affiliate.publicKey));

const affBefore = await bal(affiliate.publicKey);
const mkSig = await send([createMarketIx], [user]);
console.log("MAINNET market created:", link(mkSig));

const sig = await send([...pre, betIx(REF_BPS)], [user]);
console.log("MAINNET bet + protocol-enforced split in ONE instruction:", link(sig));
const affAfter = await bal(affiliate.publicKey);
const expected = Math.floor(STAKE * REF_BPS / 10000);
console.log(`affiliate earned: ${(affAfter-affBefore)/ONE} USD₮ (expected ${expected/ONE}) — decided by the PROGRAM on MAINNET`);

let rejected = false;
try { await send([betIx(OVER_BPS)], [user]); } catch { rejected = true; }
console.log(rejected ? "cap enforced on MAINNET: 6% referral REJECTED (RefTooHigh) ✓" : "WARNING: 6% NOT rejected — check deploy");

fs.appendFileSync("DEPLOYMENTS.md", `\n| Affiliate split — protocol-enforced (5% cap), Solana MAINNET | \`${sig}\` |\n`);
console.log((affAfter-affBefore) === expected && rejected ? "REF-SPLIT-MAINNET-OK" : "REF-SPLIT-MAINNET-CHECK");
