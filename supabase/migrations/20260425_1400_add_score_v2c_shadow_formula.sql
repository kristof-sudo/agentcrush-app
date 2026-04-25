-- ============================================================
-- Phase 5 Shadow Scoring: score_v2_c conservative formula
-- Created: 2026-04-25
-- ============================================================
--
-- SAFETY CONTRACT: read-only views only.
-- No writes to agents, rankings, agent_snapshots, or any live
-- scoring path. No recalc_rankings() call.
--
-- Context:
--   score_v2_a and score_v2_b proved unsafe with sparse coverage:
--   avg active_weight_total = 0.073, 1181/1225 agents low-coverage.
--   CowAgent jumped from rank 1221 → 1 on a single strong signal.
--
-- score_v2_c uses a fixed denominator (0.90) and a conservative
-- missing-signal prior of 20 instead of shrinking the denominator.
-- This prevents sparse agents from dominating by being "normalized"
-- against only the signals they happen to have.
--
-- Formula:
--   score_v2_c = (
--     COALESCE(github_score,       20) * 0.20 +
--     COALESCE(package_usage_score,20) * 0.20 +
--     COALESCE(dependency_score,   20) * 0.15 +
--     COALESCE(ecosystem_score,    20) * 0.10 +
--     COALESCE(docs_quality_score, 20) * 0.10 +
--     COALESCE(hn_score,           20) * 0.10 +
--     COALESCE(trust_score,        20) * 0.05
--   ) / 0.90
--
-- Native (0.10) remains reserved and excluded from denominator.
-- Denominator = 0.90 always (no shrinkage for missing signals).
-- Missing prior = 20 (neutral-low, not zero, not punishing).
-- ============================================================


-- ============================================================
-- Step 1: Replace agent_score_v2_preview
-- Adds score_v2_c_candidate to the existing a/b candidates.
-- score_v2_c_candidate appended LAST — column positions 1–60
-- are identical to migration 1200; new column lands at 61.
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_preview AS
WITH weights (w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native) AS (
  VALUES (0.20::numeric, 0.20::numeric, 0.15::numeric, 0.10::numeric,
          0.10::numeric, 0.10::numeric, 0.05::numeric, 0.10::numeric)
),
base AS (
  SELECT s.*, w.*
  FROM agent_score_v2_signal_components s
  CROSS JOIN weights w
),
computed AS (
  SELECT
    agent_id, handle, display_name,
    github_score, package_usage_score, dependency_score, ecosystem_score,
    docs_quality_score, hn_score, trust_score, native_score,
    github_available, package_usage_available, dependency_available,
    ecosystem_available, docs_quality_available, hn_available,
    trust_available, native_available,
    missing_github, missing_package_usage, missing_dependency_signal,
    missing_ecosystem_signal, missing_docs_quality, missing_hn_signal,
    missing_trust_signal, missing_native_signal,
    w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native,
    github_stars, github_forks, github_pushed_at, last_release_tag,
    weekly_downloads_total, package_count,
    unique_dependent_repos, external_dependent_repos, dependency_weighted_strength,
    total_relationships, weighted_rel_score,
    hn_relevant_mentions, recent_90d_log_strength,
    claim_status, verified_source,

    -- Active weight total (native always excluded)
    (
      CASE WHEN github_available        THEN w_github     ELSE 0 END +
      CASE WHEN package_usage_available THEN w_package    ELSE 0 END +
      CASE WHEN dependency_available    THEN w_dependency ELSE 0 END +
      CASE WHEN ecosystem_available     THEN w_ecosystem  ELSE 0 END +
      CASE WHEN docs_quality_available  THEN w_docs       ELSE 0 END +
      CASE WHEN hn_available            THEN w_hn         ELSE 0 END +
      CASE WHEN trust_available         THEN w_trust      ELSE 0 END
    ) AS active_weight_total,

    -- score_v2_a: normalized weighted arithmetic mean (shrinking denom)
    (
      CASE WHEN github_available        THEN COALESCE(github_score, 0)       * w_github     ELSE 0 END +
      CASE WHEN package_usage_available THEN COALESCE(package_usage_score,0) * w_package    ELSE 0 END +
      CASE WHEN dependency_available    THEN COALESCE(dependency_score, 0)   * w_dependency ELSE 0 END +
      CASE WHEN ecosystem_available     THEN COALESCE(ecosystem_score, 0)    * w_ecosystem  ELSE 0 END +
      CASE WHEN docs_quality_available  THEN COALESCE(docs_quality_score, 0) * w_docs       ELSE 0 END +
      CASE WHEN hn_available            THEN COALESCE(hn_score, 0)           * w_hn         ELSE 0 END +
      CASE WHEN trust_available         THEN COALESCE(trust_score, 0)        * w_trust      ELSE 0 END
    ) / NULLIF(
      CASE WHEN github_available        THEN w_github     ELSE 0 END +
      CASE WHEN package_usage_available THEN w_package    ELSE 0 END +
      CASE WHEN dependency_available    THEN w_dependency ELSE 0 END +
      CASE WHEN ecosystem_available     THEN w_ecosystem  ELSE 0 END +
      CASE WHEN docs_quality_available  THEN w_docs       ELSE 0 END +
      CASE WHEN hn_available            THEN w_hn         ELSE 0 END +
      CASE WHEN trust_available         THEN w_trust      ELSE 0 END,
      0
    ) AS score_v2_a_raw,

    -- score_v2_b: normalized weighted geometric mean (shrinking denom)
    EXP(
      (
        CASE WHEN github_available        THEN w_github     * LN(GREATEST(COALESCE(github_score, 1),       1)) ELSE 0 END +
        CASE WHEN package_usage_available THEN w_package    * LN(GREATEST(COALESCE(package_usage_score,1), 1)) ELSE 0 END +
        CASE WHEN dependency_available    THEN w_dependency * LN(GREATEST(COALESCE(dependency_score, 1),   1)) ELSE 0 END +
        CASE WHEN ecosystem_available     THEN w_ecosystem  * LN(GREATEST(COALESCE(ecosystem_score, 1),    1)) ELSE 0 END +
        CASE WHEN docs_quality_available  THEN w_docs       * LN(GREATEST(COALESCE(docs_quality_score, 1), 1)) ELSE 0 END +
        CASE WHEN hn_available            THEN w_hn         * LN(GREATEST(COALESCE(hn_score, 1),           1)) ELSE 0 END +
        CASE WHEN trust_available         THEN w_trust      * LN(GREATEST(COALESCE(trust_score, 1),        1)) ELSE 0 END
      ) / NULLIF(
        CASE WHEN github_available        THEN w_github     ELSE 0 END +
        CASE WHEN package_usage_available THEN w_package    ELSE 0 END +
        CASE WHEN dependency_available    THEN w_dependency ELSE 0 END +
        CASE WHEN ecosystem_available     THEN w_ecosystem  ELSE 0 END +
        CASE WHEN docs_quality_available  THEN w_docs       ELSE 0 END +
        CASE WHEN hn_available            THEN w_hn         ELSE 0 END +
        CASE WHEN trust_available         THEN w_trust      ELSE 0 END,
        0
      )
    ) AS score_v2_b_raw,

    -- score_v2_c: fixed-denominator weighted mean with missing-signal prior
    -- Denominator = 0.90 always (native excluded, no shrinkage).
    -- Prior = 20 for any unavailable component (neutral-low, not zero).
    (
      COALESCE(github_score,       20) * 0.20 +
      COALESCE(package_usage_score,20) * 0.20 +
      COALESCE(dependency_score,   20) * 0.15 +
      COALESCE(ecosystem_score,    20) * 0.10 +
      COALESCE(docs_quality_score, 20) * 0.10 +
      COALESCE(hn_score,           20) * 0.10 +
      COALESCE(trust_score,        20) * 0.05
    )::numeric / 0.90 AS score_v2_c_raw

  FROM base
)
SELECT
  -- positions 1–60: identical to migration 1200
  agent_id, handle, display_name,
  github_score, package_usage_score, dependency_score, ecosystem_score,
  docs_quality_score, hn_score, trust_score, native_score,
  github_available, package_usage_available, dependency_available,
  ecosystem_available, docs_quality_available, hn_available,
  trust_available, native_available,
  missing_github, missing_package_usage, missing_dependency_signal,
  missing_ecosystem_signal, missing_docs_quality, missing_hn_signal,
  missing_trust_signal, missing_native_signal,
  w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native,
  active_weight_total,
  ROUND(score_v2_a_raw, 2)               AS score_v2_a_candidate,
  ROUND(LEAST(100.0, score_v2_b_raw), 2) AS score_v2_b_candidate,
  github_stars, github_forks, github_pushed_at, last_release_tag,
  weekly_downloads_total, package_count,
  unique_dependent_repos, external_dependent_repos, dependency_weighted_strength,
  total_relationships, weighted_rel_score,
  hn_relevant_mentions, recent_90d_log_strength,
  claim_status, verified_source,
  ROUND(
    CASE WHEN github_available AND score_v2_a_raw > 0
      THEN (COALESCE(github_score, 0) * w_github / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS github_contribution_ratio,
  ROUND(
    CASE WHEN package_usage_available AND score_v2_a_raw > 0
      THEN (COALESCE(package_usage_score, 0) * w_package / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS package_contribution_ratio,
  ROUND(
    CASE WHEN dependency_available AND score_v2_a_raw > 0
      THEN (COALESCE(dependency_score, 0) * w_dependency / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS dependency_contribution_ratio,
  ROUND(
    CASE WHEN ecosystem_available AND score_v2_a_raw > 0
      THEN (COALESCE(ecosystem_score, 0) * w_ecosystem / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS ecosystem_contribution_ratio,
  ROUND(
    CASE WHEN docs_quality_available AND score_v2_a_raw > 0
      THEN (COALESCE(docs_quality_score, 0) * w_docs / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS docs_contribution_ratio,
  ROUND(
    CASE WHEN hn_available AND score_v2_a_raw > 0
      THEN (COALESCE(hn_score, 0) * w_hn / NULLIF(active_weight_total,0)) / NULLIF(score_v2_a_raw,0)
      ELSE NULL END, 3) AS hn_contribution_ratio,
  jsonb_build_object(
    'github',     jsonb_build_object('score', github_score,        'weight', w_github,     'available', github_available),
    'package',    jsonb_build_object('score', package_usage_score, 'weight', w_package,    'available', package_usage_available),
    'dependency', jsonb_build_object('score', dependency_score,    'weight', w_dependency, 'available', dependency_available),
    'ecosystem',  jsonb_build_object('score', ecosystem_score,     'weight', w_ecosystem,  'available', ecosystem_available),
    'docs',       jsonb_build_object('score', docs_quality_score,  'weight', w_docs,       'available', docs_quality_available),
    'hn',         jsonb_build_object('score', hn_score,            'weight', w_hn,         'available', hn_available),
    'trust',      jsonb_build_object('score', trust_score,         'weight', w_trust,      'available', trust_available),
    'native',     jsonb_build_object('score', native_score,        'weight', w_native,     'available', native_available,
                                     'note', 'reserved — excluded from active denominator')
  ) AS components,
  -- position 61: score_v2_c appended last so positions 1–60 are unchanged
  ROUND(score_v2_c_raw, 2) AS score_v2_c_candidate
FROM computed;


-- ============================================================
-- Step 2: Replace agent_score_v2_rank_comparison
-- Adds rank_v2_c, rank_delta_c, score_delta_c, coverage_tier,
-- evidence_ready_for_public_rank, score_v2_c_public_candidate.
--
-- Column-position discipline:
--   Positions 1–70 are identical to migration 1200.
--   New columns are appended at positions 71–77.
--   No wildcard (*) expansion in the final SELECT — all 70
--   original columns are listed explicitly to prevent position
--   shifts when the upstream preview view gains new columns.
-- ============================================================

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
    (
      p.active_weight_total >= 0.55
      OR (COALESCE(r.current_rank, 9999) <= 100 AND p.active_weight_total >= 0.45)
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


-- ============================================================
-- Step 3: Replace comparison / diagnostic views
-- ============================================================

-- ── Coverage diagnostics (adds coverage_tier breakdown) ──────────────────────
-- Column-position rule: new tier/evidence columns appended AFTER
-- needs_review_count (position 22 in migration 1200's version).

CREATE OR REPLACE VIEW agent_score_v2_coverage_diagnostics AS
SELECT
  COUNT(*)                                                              AS total_agents,
  COUNT(*) FILTER (WHERE github_available)                             AS github_count,
  ROUND(COUNT(*) FILTER (WHERE github_available)::numeric / COUNT(*) * 100, 1) AS github_pct,
  COUNT(*) FILTER (WHERE package_usage_available)                      AS package_count_agents,
  ROUND(COUNT(*) FILTER (WHERE package_usage_available)::numeric / COUNT(*) * 100, 1) AS package_pct,
  COUNT(*) FILTER (WHERE dependency_available)                         AS dependency_count,
  ROUND(COUNT(*) FILTER (WHERE dependency_available)::numeric / COUNT(*) * 100, 1) AS dependency_pct,
  COUNT(*) FILTER (WHERE ecosystem_available)                          AS ecosystem_count,
  ROUND(COUNT(*) FILTER (WHERE ecosystem_available)::numeric / COUNT(*) * 100, 1) AS ecosystem_pct,
  COUNT(*) FILTER (WHERE docs_quality_available)                       AS docs_count,
  ROUND(COUNT(*) FILTER (WHERE docs_quality_available)::numeric / COUNT(*) * 100, 1) AS docs_pct,
  COUNT(*) FILTER (WHERE hn_available)                                 AS hn_count,
  ROUND(COUNT(*) FILTER (WHERE hn_available)::numeric / COUNT(*) * 100, 1) AS hn_pct,
  COUNT(*) FILTER (WHERE trust_available)                              AS trust_count,
  ROUND(COUNT(*) FILTER (WHERE trust_available)::numeric / COUNT(*) * 100, 1) AS trust_pct,
  COUNT(*) FILTER (WHERE native_available)                             AS native_count,
  0.0::numeric                                                         AS native_pct,
  ROUND(AVG(active_weight_total), 3)                                   AS avg_active_weight,
  ROUND(MIN(active_weight_total), 3)                                   AS min_active_weight,
  ROUND(MAX(active_weight_total), 3)                                   AS max_active_weight,
  COUNT(*) FILTER (WHERE active_weight_total < 0.40)                   AS low_coverage_agents,
  COUNT(*) FILTER (WHERE needs_human_review)                           AS needs_review_count,
  -- NEW columns appended after needs_review_count (positions 23–28)
  COUNT(*) FILTER (WHERE coverage_tier = 'high')                       AS tier_high,
  COUNT(*) FILTER (WHERE coverage_tier = 'medium')                     AS tier_medium,
  COUNT(*) FILTER (WHERE coverage_tier = 'low')                        AS tier_low,
  COUNT(*) FILTER (WHERE coverage_tier = 'very_low')                   AS tier_very_low,
  COUNT(*) FILTER (WHERE evidence_ready_for_public_rank = TRUE)        AS evidence_ready_count,
  COUNT(*) FILTER (WHERE evidence_ready_for_public_rank = FALSE)       AS evidence_not_ready_count
FROM agent_score_v2_rank_comparison;


-- ── Known-agent comparison (expanded list, includes v2_c) ────────────────────
-- Column-position rule: v2_c columns appended AFTER review_reasons
-- (position 28 in migration 1200's version of this view).

CREATE OR REPLACE VIEW agent_score_v2_known_agents AS
SELECT
  -- positions 1–28: identical to migration 1200
  handle,
  display_name,
  current_rank,
  current_score,
  rank_v2_a,
  rank_v2_b,
  rank_delta_a,
  rank_delta_b,
  score_v2_a_candidate,
  score_v2_b_candidate,
  score_delta_a,
  score_delta_b,
  active_weight_total,
  github_available,
  package_usage_available,
  dependency_available,
  ecosystem_available,
  docs_quality_available,
  hn_available,
  github_score,
  package_usage_score,
  dependency_score,
  ecosystem_score,
  docs_quality_score,
  hn_score,
  trust_score,
  needs_human_review,
  review_reasons,
  -- NEW columns appended after review_reasons (positions 29–35)
  rank_v2_c,
  rank_delta_c,
  score_v2_c_candidate,
  score_v2_c_public_candidate,
  score_delta_c,
  coverage_tier,
  evidence_ready_for_public_rank
FROM agent_score_v2_rank_comparison
WHERE handle IN (
  'crewai', 'dspyagents', 'openclaw', 'agentops', 'aider',
  'openhands', 'camelai', 'langroid', 'agentscope', 'babyagi',
  'nanobot', 'cowagent', 'firecrawl', 'career-ops'
)
ORDER BY COALESCE(current_rank, 99999);


-- ── Top 50 by score_v2_c_candidate ───────────────────────────────────────────
-- New view (no prior column-position constraints).

CREATE OR REPLACE VIEW agent_score_v2_top50_c AS
SELECT
  rank_v2_c,
  handle,
  display_name,
  score_v2_c_candidate,
  current_rank,
  rank_delta_c,
  active_weight_total,
  coverage_tier,
  evidence_ready_for_public_rank,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score,
  needs_human_review,
  review_reasons
FROM agent_score_v2_rank_comparison
ORDER BY rank_v2_c ASC NULLS LAST;


-- ── Top 50 by score_v2_c_public_candidate ────────────────────────────────────
-- New view (no prior column-position constraints).

CREATE OR REPLACE VIEW agent_score_v2_top50_public_candidate AS
WITH pub_ranked AS (
  SELECT
    *,
    RANK() OVER (ORDER BY score_v2_c_public_candidate DESC NULLS LAST) AS rank_v2_c_public
  FROM agent_score_v2_rank_comparison
)
SELECT
  rank_v2_c_public,
  handle,
  display_name,
  score_v2_c_public_candidate,
  score_v2_c_candidate,
  current_rank,
  rank_v2_c,
  active_weight_total,
  coverage_tier,
  evidence_ready_for_public_rank,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score,
  needs_human_review,
  review_reasons
FROM pub_ranked
ORDER BY rank_v2_c_public ASC NULLS LAST;


-- ── Formula comparison summary (a vs b vs c at a glance) ─────────────────────
-- New view (no prior column-position constraints).

CREATE OR REPLACE VIEW agent_score_v2_formula_comparison_summary AS
WITH pub_ranked AS (
  SELECT
    *,
    RANK() OVER (ORDER BY score_v2_c_public_candidate DESC NULLS LAST) AS rank_v2_c_public
  FROM agent_score_v2_rank_comparison
)
SELECT
  handle,
  display_name,
  current_rank,
  rank_v2_a,
  rank_v2_b,
  rank_v2_c,
  rank_v2_c_public,
  score_v2_a_candidate,
  score_v2_b_candidate,
  score_v2_c_candidate,
  score_v2_c_public_candidate,
  current_score,
  active_weight_total,
  coverage_tier,
  evidence_ready_for_public_rank,
  ROUND(ABS(score_v2_a_candidate - score_v2_c_candidate), 2) AS a_vs_c_divergence,
  ROUND(ABS(score_v2_b_candidate - score_v2_c_candidate), 2) AS b_vs_c_divergence,
  CASE
    WHEN rank_v2_c <= rank_v2_a AND rank_v2_c <= rank_v2_b THEN 'v2_c'
    WHEN rank_v2_a <= rank_v2_b                             THEN 'v2_a'
    ELSE 'v2_b'
  END AS best_formula_for_agent,
  needs_human_review,
  review_reasons
FROM pub_ranked
ORDER BY rank_v2_c ASC NULLS LAST;


-- ── Large movers under v2_c (±20 positions) ──────────────────────────────────
-- New view (no prior column-position constraints).

CREATE OR REPLACE VIEW agent_score_v2_large_movers_c AS
SELECT
  handle, display_name,
  current_rank, rank_v2_c,
  rank_delta_c,
  current_score, score_v2_c_candidate,
  active_weight_total, coverage_tier, evidence_ready_for_public_rank,
  needs_human_review, review_reasons,
  components
FROM agent_score_v2_rank_comparison
WHERE
  current_rank IS NOT NULL
  AND ABS(rank_delta_c) >= 20
ORDER BY ABS(rank_delta_c) DESC NULLS LAST;


-- ============================================================
-- Convenience queries
-- ============================================================
--
-- Top 50 by score_v2_c:
--   SELECT * FROM agent_score_v2_top50_c LIMIT 50;
--
-- Top 50 by score_v2_c_public_candidate:
--   SELECT * FROM agent_score_v2_top50_public_candidate LIMIT 50;
--
-- Known agents:
--   SELECT * FROM agent_score_v2_known_agents;
--
-- Coverage tier counts + evidence gate:
--   SELECT * FROM agent_score_v2_coverage_diagnostics;
--
-- Large movers under v2_c:
--   SELECT * FROM agent_score_v2_large_movers_c LIMIT 50;
--
-- Formula comparison (all three):
--   SELECT * FROM agent_score_v2_formula_comparison_summary LIMIT 50;
--
-- Agents that are evidence_ready and in top 50 by v2_c:
--   SELECT handle, display_name, rank_v2_c, score_v2_c_candidate,
--          coverage_tier, active_weight_total
--   FROM agent_score_v2_rank_comparison
--   WHERE evidence_ready_for_public_rank = TRUE
--   ORDER BY rank_v2_c LIMIT 50;
-- ============================================================
