# Nyx overlay — how to apply (no manual delete/paste)

This archive is an OVERLAY: it only contains new/changed files. You do not delete anything by
hand — git figures out what to replace, and one command removes the old OFFSIDE files.

## ~2 minutes
    cd nyx-project
    git checkout main && git pull
    git rm -r public/offside                 # the ONLY delete you run
    unzip -o ~/Downloads/nyx-overlay.zip -d . # overwrites changed, adds new
    npm i @solana/web3.js @solana/spl-token   # deps for the Actions endpoint
    npm pkg set name=nyx                       # rename the package
    git add -A                                 # stages adds, changes AND the deletion
    git commit -m "Rebrand OFFSIDE->Nyx + flag i18n + real Solana Actions + settlement program"
    git push                                   # Vercel auto-redeploys

That's it. `git add -A` handles the deleted public/offside folder and every new/updated file in
one shot — no manual file surgery.

## After deploy — checks
    curl -sI https://nyx-project-roan.vercel.app/
    curl -s "https://nyx-project-roan.vercel.app/api/txline/scores/snapshot/17588232" | head -c 200
    curl -s "https://nyx-project-roan.vercel.app/api/actions/bet?match=17588232&market=ou25&odds=1.95" | head -c 400
Paste that Action URL into https://dial.to to see the Blink render.

## On-chain program (optional, on your machine)
Rust + Solana CLI + Anchor 0.30.1 + ~10 devnet SOL. See Anchor.toml / programs/nyx-settlement/README.md.
The site, agent and Actions endpoint all work without it; the program adds trustless escrow settlement.
