#!/usr/bin/env bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(git rev-parse --show-toplevel)"
solana config set --url devnet >/dev/null
PID=$(solana address -k target/deploy/nyx_settlement-keypair.json)
echo "program id: $PID"

echo "== STAGE: anchor build --no-idl (IDL пропускаем, он не нужен) =="
anchor build --no-idl -p nyx_settlement || anchor build --no-idl
test -f target/deploy/nyx_settlement.so || { echo "нет target/deploy/nyx_settlement.so"; ls -la target/deploy; exit 1; }

echo "== STAGE: deploy (solana program deploy, devnet) =="
solana program deploy target/deploy/nyx_settlement.so --program-id target/deploy/nyx_settlement-keypair.json --url devnet

echo "== STAGE: run live split tx =="
NYX_PROGRAM=$PID node scripts/ref-split-onchain.mjs

echo "== STAGE: record + push =="
grep -q "Settlement v2" DEPLOYMENTS.md || printf '\n## Settlement v2 (devnet, self-owned) - protocol-enforced affiliate split\n- Program id: %s\n- place_bet_with_ref: on-chain 5%% referral cap, split enforced by the program.\n' "$PID" >> DEPLOYMENTS.md
git add -A && git commit -m "feat(settlement v2): protocol-enforced affiliate split on devnet" || echo "nothing to commit"
git push
echo "== DONE: $PID =="
