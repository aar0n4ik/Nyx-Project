#!/usr/bin/env bash
set -e
echo ">> Solana CLI 1.18.26 (совместимо с Anchor 0.30.1)"
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
grep -q 'solana/install/active_release' ~/.bashrc || echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo ">> Anchor 0.30.1 через avm"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.30.1 && avm use 0.30.1
echo ">> node deps"
npm ci || npm install
echo ">> Готово: $(solana --version) | $(anchor --version)"
