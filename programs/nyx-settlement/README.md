# nyx-settlement (Anchor program)
Parimutuel, oracle-settled market for verifiable World Cup bets. Real escrow, no house risk.
- create_market / place_bet / resolve / claim. Winners get stake + proportional share of the losing pool.
## Build & deploy (your machine, ~10 devnet SOL)
    solana config set --url devnet && solana airdrop 5
    anchor build && anchor keys sync && anchor build && anchor deploy
Then add the deployed id to public/nyx/nyx-config.js as window.NYX_PROGRAM_ID.
