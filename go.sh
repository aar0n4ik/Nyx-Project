#!/usr/bin/env bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(git rev-parse --show-toplevel)"

echo "== STAGE: restore from git =="
git checkout -- Anchor.toml programs/nyx-settlement/src/lib.rs

PID=$(solana address -k target/deploy/nyx_settlement-keypair.json)
echo "program id: $PID"

echo "== STAGE: set program id (string-based, no regex) =="
python3 - "$PID" <<'PY'
import sys
pid = sys.argv[1]
lib = "programs/nyx-settlement/src/lib.rs"
s = open(lib).read()
key = 'declare_id!("'
i = s.index(key) + len(key)
j = s.index('"', i)
s = s[:i] + pid + s[j:]
open(lib, "w").write(s)
a = open("Anchor.toml").read()
out = []
for ln in a.split("\n"):
    if ln.strip().startswith("nyx_settlement") and "=" in ln:
        indent = ln[:len(ln) - len(ln.lstrip())]
        out.append(indent + 'nyx_settlement = "' + pid + '"')
    else:
        out.append(ln)
open("Anchor.toml", "w").write("\n".join(out))
print("set to", pid)
PY

echo "== verify =="
grep -n "declare_id" programs/nyx-settlement/src/lib.rs
grep -n "nyx_settlement" Anchor.toml

echo "== STAGE: anchor build =="
anchor build -p nyx_settlement || anchor build
echo "== STAGE: anchor deploy (devnet) =="
anchor deploy -p nyx_settlement --provider.cluster devnet
echo "== STAGE: run live split tx =="
NYX_PROGRAM=$PID node scripts/ref-split-onchain.mjs
echo "== STAGE: record + push =="
grep -q "Settlement v2" DEPLOYMENTS.md || printf '\n## Settlement v2 (devnet, self-owned) - protocol-enforced affiliate split\n- Program id: %s\n- place_bet_with_ref: on-chain 5%% referral cap, split enforced by the program.\n' "$PID" >> DEPLOYMENTS.md
git add -A && git commit -m "feat(settlement v2): protocol-enforced affiliate split on devnet" || echo "nothing to commit"
git push
echo "== DONE: $PID =="
