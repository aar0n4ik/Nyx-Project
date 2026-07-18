#!/usr/bin/env bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(git rev-parse --show-toplevel)"

echo "== STAGE: restore corrupted files from git =="
git checkout -- Anchor.toml programs/nyx-settlement/src/lib.rs

PID=$(solana address -k target/deploy/nyx_settlement-keypair.json)
echo "program id: $PID"

echo "== STAGE: set program id cleanly (python, no sed) =="
python3 - "$PID" <<'PY'
import re, sys
pid = sys.argv[1]
lib = "programs/nyx-settlement/src/lib.rs"
s = open(lib).read()
s = re.sub(r'declare_id!\("*"\)', lambda m: 'declare_id!("'+pid+'")', s)
open(lib,"w").write(s)
a = open("Anchor.toml").read()
a = re.sub(r'(nyx_settlement\s*=\s*")*"', lambda m: m.group(1)+pid+'"', a)
open("Anchor.toml","w").write(a)
print("set ->", pid)
PY

echo "== verify (по одному чистому вхождению) =="
grep -n "declare_id" programs/nyx-settlement/src/lib.rs
grep -n "nyx_settlement" Anchor.toml

echo "== STAGE: anchor build =="
anchor build -p nyx_settlement
echo "== STAGE: anchor deploy (devnet) =="
anchor deploy -p nyx_settlement --provider.cluster devnet
echo "== STAGE: run live split tx =="
NYX_PROGRAM=$PID node scripts/ref-split-onchain.mjs
echo "== STAGE: record + push =="
grep -q "Settlement v2" DEPLOYMENTS.md || printf '\n## Settlement v2 — protocol-enforced affiliate split (devnet, self-owned)\n- Program id: `%s`\n- place_bet_with_ref: on-chain 5%% referral cap; split enforced by the program, not the client.\n' "$PID" >> DEPLOYMENTS.md
git add -A && git commit -m "feat(settlement v2): protocol-enforced affiliate split on devnet (self-owned program id)" || echo "нечего коммитить"
git push
echo "== ГОТОВО: $PID =="
