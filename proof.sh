#!/usr/bin/env bash
set -e
export PATH="$HOME/.cargo/bin:$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd "$(git rev-parse --show-toplevel)"
PID=$(solana address -k target/deploy/nyx_settlement-keypair.json)

echo "== capture fresh on-chain proof =="
NYX_PROGRAM=$PID node scripts/ref-split-onchain.mjs 2>/dev/null | tee /tmp/nyxproof.txt

MARKET=$(grep 'market: http' /tmp/nyxproof.txt | awk '{print $NF}')
SPLIT=$(grep 'split in ONE' /tmp/nyxproof.txt | awk '{print $NF}')
MINT=$(grep 'test-USD mint' /tmp/nyxproof.txt | awk '{print $NF}')
BETTOR=$(solana address)
AFF=$(solana address -k scripts/.agent.json)

echo "== write proof into DEPLOYMENTS.md =="
printf '\n### Live devnet proof (%s)\n- Program: https://explorer.solana.com/address/%s?cluster=devnet\n- test-USD mint: %s\n- create_market: %s\n- place_bet_with_ref (5%% split, program-enforced, 6%% reverts): %s\n- Bettor: %s\n- Affiliate: %s\n' "$(date -u +%Y-%m-%dT%H:%MZ)" "$PID" "$MINT" "$MARKET" "$SPLIT" "$BETTOR" "$AFF" >> DEPLOYMENTS.md

echo "== remove throwaway helper scripts =="
git rm -f deploy-v2.sh fix-and-deploy.sh go.sh go2.sh 2>/dev/null || true

git add DEPLOYMENTS.md
git commit -m "docs: verifiable devnet proof for settlement v2 + remove scratch scripts" || echo "nothing to commit"
git push
echo "== PROOF SAVED =="
grep -A8 "Live devnet proof" DEPLOYMENTS.md | tail -n 9
