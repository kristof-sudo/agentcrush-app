-- Update `evidence_ready_for_public_rank` rule in agent_score_v2_rank_comparison
-- Date: 2026-05-14
-- Decision: Kris-approved 2026-05-14
--
-- Old rule:
--   active_weight_total >= 0.55
--   OR (current_rank <= 100 AND active_weight_total >= 0.45)
--
-- New rule adds a third OR clause for top-tier single-signal agents that have
-- at least one corroborating signal (prevents vanity-metric / manipulation):
--
--   active_weight_total >= 0.55
--   OR (current_rank <= 100 AND active_weight_total >= 0.45)
--   OR (
--     -- top-tier on any primary signal
--     (github_score >= 90 OR package_usage_score >= 90 OR ecosystem_score >= 90)
--     AND
--     -- at least one other signal > 50 (i.e. ≥ 2 signals > 50 total)
--     (sum of CASE WHEN <signal> > 50 THEN 1 ELSE 0 END across primary signals) >= 2
--   )
--
-- This canonicalizes the override that was previously app-layer-only in
-- src/app/rankings/page.js. Defensible publicly — "top-tier on any single
-- primary signal counts, provided multi-signal corroboration."
--
-- Future /how-we-rank page should reference this rule explicitly.
--
-- This is CREATE OR REPLACE — no schema change, just view body update.
-- All downstream views (agent_score_v2_top50_public_candidate, etc.) inherit
-- the new rule automatically since they read from this one.

CREATE OR REPLACE VIEW agent_score_v2_rank_comparison AS
WITH current_rankings AS (
  SELECT DISTINCT ON (agent_id)
    agent_id,
    score_total AS current_score,
    global_rank AS current_rank
  FROM rankings
  ORDER BY agent_id, global_rank ASC
),
all_scores AS (
  SELECT
    -- preview columns 1–60 (explicit — no p.*)
    p.agent_id,
    p.handle,
    p.display_name,
    p.github_score,
    p.package_usage_score,
    p.dependency_score,
    p.ecosystem_score,
    p.docs_quality_score,
    p.hn_score,
    p.trust_score,
    p.native_score,
    p.github_available,
    p.package_usage_available,
    p.dependency_available,
    p.ecosystem_available,
    p.docs_quality_available,
    p.hn_available,
    p.trust_available,
    p.native_available,
    p.missing_github,
    p.missing_package_usage,
    p.missing_dependency_signal,
    p.missing_ecosystem_signal,
    p.missing_docs_quality,
    p.missing_hn_signal,
    p.missing_trust_signal,
    p.missing_native_signal,
    p.w_github,
    p.w_package,
    p.w_dependency,
    p.w_ecosystem,
    p.w_docs,
    p.w_hn,
    p.w_trust,
    p.w_native,
    p.active_weight_total,
    p.score_v2_a_candidate,
    p.score_v2_b_candidate,
    p.github_stars,
    p.github_forks,
    p.github_pushed_at,
    p.last_release_tag,
    p.weekly_downloads_total,
    p.package_count,
    p.unique_dependent_repos,
    p.external_dependent_repos,
    p.dependency_weighted_strength,
    p.total_relationships,
    p.weighted_rel_score,
    p.hn_relevant_mentions,
    p.recent_90d_log_strength,
    p.claim_status,
    p.verified_source,
    p.github_contribution_ratio,
    p.package_contribution_ratio,
    p.dependency_contribution_ratio,
    p.ecosystem_contribution_ratio,
    p.docs_contribution_ratio,
    p.hn_contribution_ratio,
    p.components,
    -- rank_comparison-specific columns 61–64
    r.current_score,
    r.current_rank,
    RANK() OVER (ORDER BY p.score_v2_a_candidate DESC NULLS LAST) AS rank_v2_a,
    RANK() OVER (ORDER BY p.score_v2_b_candidate DESC NULLS LAST) AS rank_v2_b,
    -- new computed values (consumed by final SELECT for positions 71–77)
    RANK() OVER (ORDER BY p.score_v2_c_candidate DESC NULLS LAST) AS rank_v2_c,
    CASE
      WHEN p.active_weight_total >= 0.75 THEN 'high'
      WHEN p.active_weight_total >= 0.55 THEN 'medium'
      WHEN p.active_weight_total >= 0.25 THEN 'low'
      ELSE 'very_low'
    END AS coverage_tier,
    -- ── evidence_ready_for_public_rank (updated 2026-05-14) ───────────
    -- Three eligibility paths: multi-signal coverage, top-100 fallback,
    -- or top-tier single signal with at least one corroborating signal.
    (
      p.active_weight_total >= 0.55
      OR (COALESCE(r.current_rank, 9999) <= 100 AND p.active_weight_total >= 0.45)
      OR (
        (
          p.github_score >= 90
          OR p.package_usage_score >= 90
          OR p.ecosystem_score >= 90
        )
        AND (
          (CASE WHEN p.github_score        > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.package_usage_score > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.dependency_score    > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.ecosystem_score     > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.docs_quality_score  > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.hn_score            > 50 THEN 1 ELSE 0 END) +
          (CASE WHEN p.trust_score         > 50 THEN 1 ELSE 0 END)
        ) >= 2
      )
    ) AS evidence_ready_for_public_rank,
    p.score_v2_c_candidate
  FROM agent_score_v2_preview p
  LEFT JOIN current_rankings r ON r.agent_id = p.agent_id
)
SELECT
  -- ── positions 1–60: original preview columns ────────────────
  agent_id,
  handle,
  display_name,
  github_score,
  package_usage_score,
  dependency_score,
  ecosystem_score,
  docs_quality_score,
  hn_score,
  trust_score,
  native_score,
  github_available,
  package_usage_available,
  dependency_available,
  ecosystem_available,
  docs_quality_available,
  hn_available,
  trust_available,
  native_available,
  missing_github,
  missing_package_usage,
  missing_dependency_signal,
  missing_ecosystem_signal,
  missing_docs_quality,
  missing_hn_signal,
  missing_trust_signal,
  missing_native_signal,
  w_github,
  w_package,
  w_dependency,
  w_ecosystem,
  w_docs,
  w_hn,
  w_trust,
  w_native,
  active_weight_total,
  score_v2_a_candidate,
  score_v2_b_candidate,
  github_stars,
  github_forks,
  github_pushed_at,
  last_release_tag,
  weekly_downloads_total,
  package_count,
  unique_dependent_repos,
  external_dependent_repos,
  dependency_weighted_strength,
  total_relationships,
  weighted_rel_score,
  hn_relevant_mentions,
  recent_90d_log_strength,
  claim_status,
  verified_source,
  github_contribution_ratio,
  package_contribution_ratio,
  dependency_contribution_ratio,
  ecosystem_contribution_ratio,
  docs_contribution_ratio,
  hn_contribution_ratio,
  components,
  -- ── positions 61–70: original rank_comparison columns ───────
  current_score,                                                         -- 61
  current_rank,                                                          -- 62
  rank_v2_a,                                                             -- 63
  rank_v2_b,                                                             -- 64
  ROUND(score_v2_a_candidate - COALESCE(current_score, 0), 2)           -- 65
    AS score_delta_a,
  ROUND(score_v2_b_candidate - COALESCE(current_score, 0), 2)           -- 66
    AS score_delta_b,
  (current_rank - rank_v2_a::integer)                                    -- 67
    AS rank_delta_a,
  (current_rank - rank_v2_b::integer)                                    -- 68
    AS rank_delta_b,
  -- 69: needs_human_review (expanded to include v2_c checks)
  (
    ABS(current_rank - rank_v2_a::integer) >= 50
    OR ABS(current_rank - rank_v2_b::integer) >= 50
    OR ABS(current_rank - rank_v2_c::integer) >= 50
    OR ABS(score_v2_b_candidate - score_v2_a_candidate) >= 20
    OR active_weight_total < 0.40
    OR (rank_v2_a <= 20 AND COALESCE(current_rank, 9999) > 50)
    OR (rank_v2_b <= 20 AND COALESCE(current_rank, 9999) > 50)
    OR (rank_v2_c <= 20 AND COALESCE(current_rank, 9999) > 50)
    OR GREATEST(
         COALESCE(github_contribution_ratio, 0),
         COALESCE(package_contribution_ratio, 0),
         COALESCE(dependency_contribution_ratio, 0),
         COALESCE(ecosystem_contribution_ratio, 0),
         COALESCE(docs_contribution_ratio, 0),
         COALESCE(hn_contribution_ratio, 0)
       ) > 0.75
  ) AS needs_human_review,
  -- 70: review_reasons (expanded to include v2_c reasons)
  ARRAY_REMOVE(ARRAY[
    CASE WHEN ABS(current_rank - rank_v2_a::integer) >= 50
      THEN 'rank_move_50+_under_v2a' END,
    CASE WHEN ABS(current_rank - rank_v2_b::integer) >= 50
      THEN 'rank_move_50+_under_v2b' END,
    CASE WHEN ABS(current_rank - rank_v2_c::integer) >= 50
      THEN 'rank_move_50+_under_v2c' END,
    CASE WHEN ABS(score_v2_b_candidate - score_v2_a_candidate) >= 20
      THEN 'formula_divergence_20+pts' END,
    CASE WHEN active_weight_total < 0.40
      THEN 'low_coverage_active_weight_below_40pct' END,
    CASE WHEN rank_v2_a <= 20 AND COALESCE(current_rank, 9999) > 50
      THEN 'obscure_agent_enters_top20_v2a' END,
    CASE WHEN rank_v2_b <= 20 AND COALESCE(current_rank, 9999) > 50
      THEN 'obscure_agent_enters_top20_v2b' END,
    CASE WHEN rank_v2_c <= 20 AND COALESCE(current_rank, 9999) > 50
      THEN 'obscure_agent_enters_top20_v2c' END,
    CASE WHEN GREATEST(
               COALESCE(github_contribution_ratio, 0),
               COALESCE(package_contribution_ratio, 0),
               COALESCE(dependency_contribution_ratio, 0),
               COALESCE(ecosystem_contribution_ratio, 0),
               COALESCE(docs_contribution_ratio, 0),
               COALESCE(hn_contribution_ratio, 0)
             ) > 0.75
      THEN 'single_component_dominates_75pct' END
  ], NULL) AS review_reasons,
  -- ── positions 71–77: NEW columns appended after review_reasons ──
  score_v2_c_candidate,                                                  -- 71
  rank_v2_c,                                                             -- 72
  coverage_tier,                                                         -- 73
  evidence_ready_for_public_rank,                                        -- 74
  ROUND(score_v2_c_candidate - COALESCE(current_score, 0), 2)           -- 75
    AS score_delta_c,
  (current_rank - rank_v2_c::integer)                                    -- 76
    AS rank_delta_c,
  CASE                                                                   -- 77
    WHEN evidence_ready_for_public_rank THEN score_v2_c_candidate
    ELSE ROUND(score_v2_c_candidate * 0.75, 2)
  END AS score_v2_c_public_candidate
FROM all_scores;

COMMENT ON VIEW agent_score_v2_rank_comparison IS
  'Canonical v2 ranking comparison view. evidence_ready_for_public_rank rule updated 2026-05-14 to include top-tier single-signal path with corroboration (any primary signal >= 90 + at least one other signal > 50). Documented in code comments; future /how-we-rank page should reference this rule.';
