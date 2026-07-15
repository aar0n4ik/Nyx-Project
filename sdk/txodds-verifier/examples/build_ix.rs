use nyx_txodds_verifier::{
    build_validate_stat_v2_data, derive_daily_scores_roots_pda, epoch_day_from_millis,
    NDimensionalStrategy, ProofNode, ScoreStat, ScoresBatchSummary, ScoresUpdateStats, StatLeaf,
    StatPredicate, StatValidationInput, TraderPredicate, TXORACLE_DEVNET,
};

fn main() {
    let ts: i64 = 1_752_000_000_000;
    let payload = StatValidationInput {
        ts,
        fixture_summary: ScoresBatchSummary {
            fixture_id: 17_926_686,
            update_stats: ScoresUpdateStats { update_count: 3, min_timestamp: ts, max_timestamp: ts + 1000 },
            events_sub_tree_root: [0u8; 32],
        },
        fixture_proof: vec![ProofNode { hash: [1u8; 32], is_right_sibling: true }],
        main_tree_proof: vec![ProofNode { hash: [2u8; 32], is_right_sibling: false }],
        event_stat_root: [3u8; 32],
        stats: vec![StatLeaf {
            stat: ScoreStat { key: 1, value: 2, period: 0 },
            stat_proof: vec![],
        }],
    };
    let strategy = NDimensionalStrategy::discrete(vec![
        StatPredicate::single(0, TraderPredicate::greater_than(0)),
    ]);
    let data = build_validate_stat_v2_data(&payload, &strategy).expect("serialize");
    println!("validate_stat_v2 instruction data: {} bytes", data.len());
    let (pda, bump) = derive_daily_scores_roots_pda(&TXORACLE_DEVNET, epoch_day_from_millis(ts));
    println!("daily_scores_roots PDA: {pda} (bump {bump})");
}
