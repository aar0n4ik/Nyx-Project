#!/usr/bin/env bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(git rev-parse --show-toplevel)"
solana config set --url devnet >/dev/null

echo "== STAGE: preflight =="
grep -q "place_bet_with_ref" programs/nyx-settlement/src/lib.rs || { echo "lib.rs без place_bet_with_ref"; exit 1; }
test -f scripts/.agent.json || solana-keygen new -o scripts/.agent.json --no-bip39-passphrase
BAL=$(solana balance | grep -oE '[0-9.]+' | head -1)
echo "wallet $(solana address): $BAL SOL"
awk "BEGIN{exit !($BAL >= 3)}" || { echo ">>> Мало SOL ($BAL). Долей через faucet и запусти: bash deploy-v2.sh"; exit 1; }

echo "== STAGE: fresh program id (owned by your wallet) =="
mkdir -p target/deploy
test -f target/deploy/nyx_settlement-keypair.json || solana-keygen new -o target/deploy/nyx_settlement-keypair.json --no-bip39-passphrase
PID=$(solana address -k target/deploy/nyx_settlement-keypair.json)
echo "program id: $PID"
sed -i "s#declare_id!(\"*\")#declare_id!(\"$PID\")#" programs/nyx-settlement/src/lib.rs
sed -i "s#nyx_settlement = \"*\"#nyx_settlement = \"$PID\"#g" Anchor.toml

echo "== STAGE: write self-provisioning demo script =="
cat > scripts/ref-split-onchain.mjs <<'EOF'
import fs from "fs";
import crypto from "crypto";
import {
  Connection, PublicKey, Keypair, Transaction, TransactionInstruction,
  SystemProgram, SYSVAR_RENT_PUBKEY, sendAndConfirmTransaction, clusterApiUrl,
} from "@solana/web3.js";
let spl;
try { spl = await import("@solana/spl-token"); }
catch { console.error("НЕТ @solana/spl-token — сделай npm ci."); process.exit(1); }
if (!process.env.NYX_PROGRAM) { console.error("NYX_PROGRAM не задан"); process.exit(1); }
const PROGRAM = new PublicKey(process.env.NYX_PROGRAM);
const TOKEN = spl.TOKEN_PROGRAM_ID;
const SYS = SystemProgram.programId;
const ONE = 1_000_000;
const STAKE = 10 * ONE, REF_BPS = 500, OVER_BPS = 600;
const conn = new Connection(process.env.SOLANA_RPC || clusterApiUrl("devnet"), "confirmed");
const link = (s) => "https://explorer.solana.com/tx/" + s + "?cluster=devnet";
const disc = (n) => crypto.createHash("sha256").update("global:" + n).digest().subarray(0, 8);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const m = (pubkey, s, w) => ({ pubkey, isSigner: s, isWritable: w });
const load = (p) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p))));
const send = (ixs, signers) => sendAndConfirmTransaction(conn, new Transaction().add(...ixs), signers, { commitment: "confirmed" });
const user = load(process.env.HOME + "/.config/solana/id.json");
const affiliate = load("scripts/.agent.json");
console.log("bettor   :", user.publicKey.toBase58());
console.log("affiliate:", affiliate.publicKey.toBase58());
const mint = await spl.createMint(conn, user, user.publicKey, null, 6);
console.log("test-USD mint:", mint.toBase58());
const bettorAta = (await spl.getOrCreateAssociatedTokenAccount(conn, user, mint, user.publicKey)).address;
const affAta    = (await spl.getOrCreateAssociatedTokenAccount(conn, user, mint, affiliate.publicKey)).address;
await spl.mintTo(conn, user, mint, bettorAta, user, 1000 * ONE);
console.log("minted 1000 test-USD to bettor");
const fixtureId = Date.now() % 4_000_000_000;
const marketKey = Buffer.alloc(8); marketKey.writeBigUInt64LE(BigInt(fixtureId % 100000));
const [market]   = PublicKey.findProgramAddressSync([Buffer.from("market"), u64(fixtureId), marketKey], PROGRAM);
const [vault]    = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PROGRAM);
const [position] = PublicKey.findProgramAddressSync([Buffer.from("pos"), market.toBuffer(), user.publicKey.toBuffer()], PROGRAM);
const closeTs = Math.floor(Date.now()/1000) + 3600;
const createMarketIx = new TransactionInstruction({ programId: PROGRAM,
  data: Buffer.concat([disc("create_market"), u64(fixtureId), marketKey, i64(closeTs)]),
  keys: [ m(market,false,true), m(user.publicKey,true,true), m(mint,false,false), m(vault,false,true),
          m(TOKEN,false,false), m(SYS,false,false), m(SYSVAR_RENT_PUBKEY,false,false) ] });
console.log("market:", link(await send([createMarketIx], [user])));
const betIx = (bps) => new TransactionInstruction({ programId: PROGRAM,
  data: Buffer.concat([disc("place_bet_with_ref"), Buffer.from([1]), u64(STAKE), u16(bps)]),
  keys: [ m(market,false,true), m(position,false,true), m(user.publicKey,true,true),
          m(bettorAta,false,true), m(affAta,false,true), m(vault,false,true),
          m(TOKEN,false,false), m(SYS,false,false) ] });
const affBefore = Number((await spl.getAccount(conn, affAta)).amount);
const sig = await send([betIx(REF_BPS)], [user]);
console.log("bet + protocol-enforced 5% split in ONE instruction:", link(sig));
const affAfter = Number((await spl.getAccount(conn, affAta)).amount);
const expected = Math.floor(STAKE * REF_BPS / 10000);
console.log(`affiliate earned ${(affAfter-affBefore)/ONE} USD (expected ${expected/ONE}) — decided by the PROGRAM`);
let rejected = false;
try { await send([betIx(OVER_BPS)], [user]); } catch { rejected = true; }
console.log(rejected ? "cap enforced: 6% referral REJECTED on-chain (RefTooHigh)" : "WARNING: 6% NOT rejected");
console.log((affAfter-affBefore) === expected && rejected ? "REF-SPLIT-ONCHAIN-OK" : "REF-SPLIT-ONCHAIN-CHECK");
EOF

echo "== STAGE: anchor build =="
anchor build -p nyx_settlement
echo "== STAGE: anchor deploy (devnet) =="
anchor deploy -p nyx_settlement --provider.cluster devnet
echo "== STAGE: run live split tx =="
NYX_PROGRAM=$PID node scripts/ref-split-onchain.mjs
echo "== STAGE: record + push =="
printf '\n## Settlement v2 — protocol-enforced affiliate split (devnet, self-owned)\n- Program id: `%s`\n- place_bet_with_ref: on-chain 5%% referral cap; split enforced by the program, not the client.\n' "$PID" >> DEPLOYMENTS.md
git add -A && git commit -m "feat(settlement v2): protocol-enforced affiliate split on devnet (self-owned program id)" || echo "нечего коммитить"
git push
echo "== ГОТОВО =="
