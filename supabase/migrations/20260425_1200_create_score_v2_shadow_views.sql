-- ============================================================
-- Phase 5 Shadow Scoring: score_v2 infrastructure
-- Created: 2026-04-25
-- Author: shadow scoring only — zero writes to live tables
-- ============================================================
--
-- SAFETY CONTRACT:
--   This migration creates READ-ONLY views.
--   It does NOT modify: agents, rankings, agent_snapshots,
--   or any column that feeds the live recalc_rankings() path.
--   It does NOT call recalc_rankings().
--   It does NOT create write tables.
--
-- Component weights (percentages of 100%):
--   A  GitHub activity              20%
--   B  Package downloads/usage      20%
--   C  Dependency graph/adoption    15%
--   D  Ecosystem integration        10%
--   E  Docs quality                 10%
--   F  HN/discourse signal          10%
--   G  Trust state                   5%
--   H  AgentCrush native (RESERVED) 10%  ← excluded from active denom
--
-- Normalization rule:
--   Missing signals are excluded from the denominator.
--   Native (H) is always excluded until real native signals exist.
--   An agent with only GitHub + Docs + Trust scores against 35% weight total,
--   not 100% — no zero-padding for missing signals.
--
-- Two candidate formulas:
--   score_v2_a: normalized weighted arithmetic mean
--   score_v2_b: normalized weighted geometric mean (penalizes weak components)
-- ============================================================


-- ============================================================
-- HELPER VIEW 1: agent_score_v2_github
-- Latest github_repo_snapshots per agent → github_score 0–100
-- ============================================================
-- Stars:   log-scaled, normalized vs 50 k stars (60 pts max)
-- Forks:   log-scaled, normalized vs 10 k forks (20 pts max)
-- Recency: pushed_at recency bonus             (15 pts max)
-- Release: has any tagged release              ( 5 pts max)
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_github AS
WITH latest AS (
  SELECT DISTINCT ON (agent_id)
    agent_id,
    stars,
    forks,
    pushed_at,
    last_release_tag
  FROM github_repo_snapshots
  ORDER BY agent_id, pushed_at DESC NULLS LAST, id DESC
),
pts AS (
  SELECT
    agent_id,
    stars,
    forks,
    pushed_at,
    last_release_tag,
    LEAST(60.0, ROUND(LN(1 + COALESCE(stars, 0)::numeric) / LN(50001::numeric) * 60, 2))  AS stars_pts,
    LEAST(20.0, ROUND(LN(1 + COALESCE(forks, 0)::numeric) / LN(10001::numeric) * 20, 2))  AS forks_pts,
    CASE
      WHEN pushed_at >= NOW() - INTERVAL '30 days'  THEN 15.0
      WHEN pushed_at >= NOW() - INTERVAL '90 days'  THEN  8.0
      WHEN pushed_at >= NOW() - INTERVAL '365 days' THEN  3.0
      ELSE 0.0
    END AS recency_pts,
    CASE WHEN last_release_tag IS NOT NULL THEN 5.0 ELSE 0.0 END AS release_pts
  FROM latest
)
SELECT
  agent_id,
  stars,
  forks,
  pushed_at,
  last_release_tag,
  stars_pts,
  forks_pts,
  recency_pts,
  release_pts,
  LEAST(100.0, GREATEST(0.0,
    stars_pts + forks_pts + recency_pts + release_pts
  )) AS github_score
FROM pts;


-- ============================================================
-- HELPER VIEW 2: agent_score_v2_ecosystem
-- Derived from curated agent_relationships
-- Counts directed relationships (both as source and target),
-- weighted by rel_type, log-scaled to 0–100.
-- Normalization ceiling: 100 weighted units → 100 pts.
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_ecosystem AS
WITH all_rels AS (
  -- agent_relationships uses symmetric agent_a / agent_b columns.
  -- Union both sides so each agent gets credit regardless of slot.
  SELECT agent_a AS agent_id, rel_type, intensity FROM agent_relationships
  UNION ALL
  SELECT agent_b AS agent_id, rel_type, intensity FROM agent_relationships
),
weighted AS (
  SELECT
    agent_id,
    COUNT(*) AS total_relationships,
    SUM(
      CASE rel_type
        WHEN 'framework_of'      THEN 3.0
        WHEN 'integrates_with'   THEN 2.0
        WHEN 'part_of_ecosystem' THEN 2.0
        WHEN 'runs_on'           THEN 1.5
        WHEN 'derived_from'      THEN 1.0
        WHEN 'competes_with'     THEN 0.5
        WHEN 'adjacent_to'       THEN 0.5
        ELSE 1.0
      END * (COALESCE(intensity, 7)::numeric / 10.0)
    ) AS weighted_rel_score
  FROM all_rels
  GROUP BY agent_id
)
SELECT
  agent_id,
  total_relationships,
  ROUND(weighted_rel_score, 3) AS weighted_rel_score,
  LEAST(100.0,
    ROUND((LN(1 + weighted_rel_score) / LN(101::numeric) * 100.0)::numeric, 2)
  ) AS ecosystem_score
FROM weighted;


-- ============================================================
-- VIEW 1 (primary): agent_score_v2_signal_components
-- One row per agent — all component scores + availability flags
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_signal_components AS
SELECT
  a.id                           AS agent_id,
  a.handle,
  a.display_name,

  -- ── A: GitHub activity (20%) ──────────────────────────────
  gh.github_score,
  (gh.agent_id IS NOT NULL)      AS github_available,
  gh.stars                       AS github_stars,
  gh.forks                       AS github_forks,
  gh.pushed_at                   AS github_pushed_at,
  gh.last_release_tag,

  -- ── B: Package downloads (20%) ───────────────────────────
  pu.usage_score_candidate       AS package_usage_score,
  (pu.agent_id IS NOT NULL)      AS package_usage_available,
  pu.weekly_downloads_total,
  pu.package_count,

  -- ── C: Dependency graph (15%) ────────────────────────────
  dep.dependency_score_candidate AS dependency_score,
  (dep.agent_id IS NOT NULL)     AS dependency_available,
  dep.unique_dependent_repos,
  dep.external_dependent_repos,
  dep.weighted_strength          AS dependency_weighted_strength,

  -- ── D: Ecosystem integration (10%) ───────────────────────
  eco.ecosystem_score,
  (eco.agent_id IS NOT NULL)     AS ecosystem_available,
  eco.total_relationships,
  eco.weighted_rel_score,

  -- ── E: Docs quality (10%) ────────────────────────────────
  dq.docs_quality_score,
  (dq.agent_id IS NOT NULL)      AS docs_quality_available,

  -- ── F: HN signal (10%) ───────────────────────────────────
  hn.hn_signal_score_candidate   AS hn_score,
  (hn.agent_id IS NOT NULL)      AS hn_available,
  hn.relevant_mentions           AS hn_relevant_mentions,
  hn.recent_90d_log_strength,

  -- ── G: Trust state (5%) ──────────────────────────────────
  -- Always derived from agents.claim_status + verified_source.
  -- verified / verified_source=true → 90
  -- claimed                         → 65
  -- verification_requested          → 45
  -- unclaimed / null                → 20
  CASE
    WHEN a.claim_status = 'verified' OR a.verified_source = TRUE THEN 90.0
    WHEN a.claim_status = 'claimed'                               THEN 65.0
    WHEN a.claim_status = 'verification_requested'                THEN 45.0
    ELSE 20.0
  END                            AS trust_score,
  TRUE                           AS trust_available,
  a.claim_status,
  a.verified_source,

  -- ── H: AgentCrush native (10%) — RESERVED ────────────────
  NULL::numeric                  AS native_score,
  FALSE                          AS native_available,

  -- ── Missing flags (for diagnostics + normalization) ──────
  (gh.agent_id  IS NULL)         AS missing_github,
  (pu.agent_id  IS NULL)         AS missing_package_usage,
  (dep.agent_id IS NULL)         AS missing_dependency_signal,
  (eco.agent_id IS NULL)         AS missing_ecosystem_signal,
  (dq.agent_id  IS NULL)         AS missing_docs_quality,
  (hn.agent_id  IS NULL)         AS missing_hn_signal,
  FALSE                          AS missing_trust_signal,
  TRUE                           AS missing_native_signal

FROM agents a
LEFT JOIN agent_score_v2_github          gh  ON gh.agent_id  = a.id
LEFT JOIN agent_package_usage_rollups    pu  ON pu.agent_id  = a.id
LEFT JOIN agent_dependency_signal_rollups dep ON dep.agent_id = a.id
LEFT JOIN agent_score_v2_ecosystem       eco ON eco.agent_id  = a.id
LEFT JOIN agent_docs_quality_latest      dq  ON dq.agent_id  = a.id
LEFT JOIN agent_hn_signal_rollups        hn  ON hn.agent_id  = a.id;


-- ============================================================
-- VIEW 2 (primary): agent_score_v2_preview
-- Applies score_v2_a and score_v2_b formulas.
-- Both formulas normalize by available weight only.
-- Native (H) is always excluded from the active denominator.
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_preview AS
WITH weights (w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native) AS (
  VALUES (0.20::numeric, 0.20::numeric, 0.15::numeric, 0.10::numeric,
          0.10::numeric, 0.10::numeric, 0.05::numeric, 0.10::numeric)
  -- w_native is defined for metadata; excluded below from all active computations
),
base AS (
  SELECT s.*, w.*
  FROM agent_score_v2_signal_components s
  CROSS JOIN weights w
),
computed AS (
  SELECT
    agent_id,
    handle,
    display_name,

    -- raw component scores
    github_score,
    package_usage_score,
    dependency_score,
    ecosystem_score,
    docs_quality_score,
    hn_score,
    trust_score,
    native_score,

    -- availability
    github_available,
    package_usage_available,
    dependency_available,
    ecosystem_available,
    docs_quality_available,
    hn_available,
    trust_available,
    native_available,

    -- missing flags
    missing_github,
    missing_package_usage,
    missing_dependency_signal,
    missing_ecosystem_signal,
    missing_docs_quality,
    missing_hn_signal,
    missing_trust_signal,
    missing_native_signal,

    -- weights
    w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native,

    -- diagnostic metrics
    github_stars, github_forks, github_pushed_at, last_release_tag,
    weekly_downloads_total, package_count,
    unique_dependent_repos, external_dependent_repos, dependency_weighted_strength,
    total_relationships, weighted_rel_score,
    hn_relevant_mentions, recent_90d_log_strength,
    claim_status, verified_source,

    -- ── Active weight denominator (native excluded always) ──
    (
      CASE WHEN github_available        THEN w_github     ELSE 0 END +
      CASE WHEN package_usage_available THEN w_package    ELSE 0 END +
      CASE WHEN dependency_available    THEN w_dependency ELSE 0 END +
      CASE WHEN ecosystem_available     THEN w_ecosystem  ELSE 0 END +
      CASE WHEN docs_quality_available  THEN w_docs       ELSE 0 END +
      CASE WHEN hn_available            THEN w_hn         ELSE 0 END +
      CASE WHEN trust_available         THEN w_trust      ELSE 0 END
    ) AS active_weight_total,

    -- ── score_v2_a: normalized weighted arithmetic mean ─────
    -- SUM(score_i * w_i for available) / SUM(w_i for available)
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

    -- ── score_v2_b: normalized weighted geometric mean ──────
    -- EXP( SUM(w_i * LN(GREATEST(score_i,1))) / SUM(w_i) ) for available
    -- Floor at 1 prevents LN(0). Score can range ~1–100.
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
    ) AS score_v2_b_raw

  FROM base
)
SELECT
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
  w_github, w_package, w_dependency, w_ecosystem, w_docs, w_hn, w_trust, w_native,
  active_weight_total,
  ROUND(score_v2_a_raw, 2)                          AS score_v2_a_candidate,
  ROUND(LEAST(100.0, score_v2_b_raw), 2)            AS score_v2_b_candidate,
  github_stars, github_forks, github_pushed_at, last_release_tag,
  weekly_downloads_total, package_count,
  unique_dependent_repos, external_dependent_repos, dependency_weighted_strength,
  total_relationships, weighted_rel_score,
  hn_relevant_mentions, recent_90d_log_strength,
  claim_status, verified_source,
  -- Per-component contribution to score_v2_a (for disproportionate-influence detection)
  ROUND(
    CASE WHEN github_available AND score_v2_a_raw > 0
      THEN (COALESCE(github_score, 0) * w_github / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS github_contribution_ratio,
  ROUND(
    CASE WHEN package_usage_available AND score_v2_a_raw > 0
      THEN (COALESCE(package_usage_score, 0) * w_package / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS package_contribution_ratio,
  ROUND(
    CASE WHEN dependency_available AND score_v2_a_raw > 0
      THEN (COALESCE(dependency_score, 0) * w_dependency / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS dependency_contribution_ratio,
  ROUND(
    CASE WHEN ecosystem_available AND score_v2_a_raw > 0
      THEN (COALESCE(ecosystem_score, 0) * w_ecosystem / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS ecosystem_contribution_ratio,
  ROUND(
    CASE WHEN docs_quality_available AND score_v2_a_raw > 0
      THEN (COALESCE(docs_quality_score, 0) * w_docs / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS docs_contribution_ratio,
  ROUND(
    CASE WHEN hn_available AND score_v2_a_raw > 0
      THEN (COALESCE(hn_score, 0) * w_hn / NULLIF(active_weight_total, 0)) / NULLIF(score_v2_a_raw, 0)
      ELSE NULL END, 3
  ) AS hn_contribution_ratio,
  -- Component JSON for full auditability
  jsonb_build_object(
    'github',      jsonb_build_object('score', github_score,       'weight', w_github,     'available', github_available,        'contribution_ratio', NULL),
    'package',     jsonb_build_object('score', package_usage_score,'weight', w_package,    'available', package_usage_available, 'contribution_ratio', NULL),
    'dependency',  jsonb_build_object('score', dependency_score,   'weight', w_dependency, 'available', dependency_available,    'contribution_ratio', NULL),
    'ecosystem',   jsonb_build_object('score', ecosystem_score,    'weight', w_ecosystem,  'available', ecosystem_available,     'contribution_ratio', NULL),
    'docs',        jsonb_build_object('score', docs_quality_score, 'weight', w_docs,       'available', docs_quality_available,  'contribution_ratio', NULL),
    'hn',          jsonb_build_object('score', hn_score,           'weight', w_hn,         'available', hn_available,            'contribution_ratio', NULL),
    'trust',       jsonb_build_object('score', trust_score,        'weight', w_trust,      'available', trust_available,         'contribution_ratio', NULL),
    'native',      jsonb_build_object('score', native_score,       'weight', w_native,     'available', native_available,        'note', 'reserved — excluded from active denominator')
  ) AS components
FROM computed;


-- ============================================================
-- VIEW 3 (primary): agent_score_v2_rank_comparison
-- Adds current v1 score/rank and computes v2 ranks + deltas.
-- rank_delta > 0 means the agent IMPROVED under v2.
-- ============================================================

CREATE OR REPLACE VIEW agent_score_v2_rank_comparison AS
WITH current_rankings AS (
  SELECT DISTINCT ON (agent_id)
    agent_id,
    score_total  AS current_score,
    global_rank  AS current_rank
  FROM rankings
  ORDER BY agent_id, global_rank ASC
),
v2 AS (
  SELECT p.*, r.current_score, r.current_rank
  FROM agent_score_v2_preview p
  LEFT JOIN current_rankings r ON r.agent_id = p.agent_id
),
ranked AS (
  SELECT
    v2.*,
    RANK() OVER (ORDER BY score_v2_a_candidate DESC NULLS LAST) AS rank_v2_a,
    RANK() OVER (ORDER BY score_v2_b_candidate DESC NULLS LAST) AS rank_v2_b
  FROM v2
)
SELECT
  ranked.*,
  -- Score deltas
  ROUND(score_v2_a_candidate - COALESCE(current_score, 0), 2) AS score_delta_a,
  ROUND(score_v2_b_candidate - COALESCE(current_score, 0), 2) AS score_delta_b,
  -- Rank deltas: positive = improved (moved up), negative = dropped
  (current_rank - rank_v2_a::integer) AS rank_delta_a,
  (current_rank - rank_v2_b::integer) AS rank_delta_b,
  -- ── Review flags ─────────────────────────────────────────
  (
    ABS(current_rank - rank_v2_a::integer) >= 50
    OR ABS(current_rank - rank_v2_b::integer) >= 50
    OR ABS(score_v2_b_candidate - score_v2_a_candidate) >= 20
    OR active_weight_total < 0.40
    OR (rank_v2_a <= 20 AND COALESCE(current_rank, 9999) > 50)
    OR (rank_v2_b <= 20 AND COALESCE(current_rank, 9999) > 50)
    OR GREATEST(
         COALESCE(github_contribution_ratio, 0),
         COALESCE(package_contribution_ratio, 0),
         COALESCE(dependency_contribution_ratio, 0),
         COALESCE(ecosystem_contribution_ratio, 0),
         COALESCE(docs_contribution_ratio, 0),
         COALESCE(hn_contribution_ratio, 0)
       ) > 0.75
  ) AS needs_human_review,
  -- Review reason(s) as text array for easy filtering
  ARRAY_REMOVE(ARRAY[
    CASE WHEN ABS(current_rank - rank_v2_a::integer) >= 50
      THEN 'rank_move_50+_under_v2a' END,
    CASE WHEN ABS(current_rank - rank_v2_b::integer) >= 50
      THEN 'rank_move_50+_under_v2b' END,
    CASE WHEN ABS(score_v2_b_candidate - score_v2_a_candidate) >= 20
      THEN 'formula_divergence_20+pts' END,
    CASE WHEN active_weight_total < 0.40
      THEN 'low_coverage_active_weight_below_40pct' END,
    CASE WHEN rank_v2_a <= 20 AND COALESCE(current_rank, 9999) > 50
      THEN 'obscure_agent_enters_top20_v2a' END,
    CASE WHEN rank_v2_b <= 20 AND COALESCE(current_rank, 9999) > 50
      THEN 'obscure_agent_enters_top20_v2b' END,
    CASE WHEN GREATEST(
               COALESCE(github_contribution_ratio, 0),
               COALESCE(package_contribution_ratio, 0),
               COALESCE(dependency_contribution_ratio, 0),
               COALESCE(ecosystem_contribution_ratio, 0),
               COALESCE(docs_contribution_ratio, 0),
               COALESCE(hn_contribution_ratio, 0)
             ) > 0.75
      THEN 'single_component_dominates_75pct' END
  ], NULL) AS review_reasons
FROM ranked;


-- ============================================================
-- STEP 2 — Comparison views (read-only, no LIMIT — add at query time)
-- ============================================================

-- ── Coverage diagnostics ──────────────────────────────────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_coverage_diagnostics AS
SELECT
  COUNT(*)                                                              AS total_agents,
  -- GitHub
  COUNT(*) FILTER (WHERE github_available)                             AS github_count,
  ROUND(COUNT(*) FILTER (WHERE github_available)::numeric / COUNT(*) * 100, 1) AS github_pct,
  -- Package usage
  COUNT(*) FILTER (WHERE package_usage_available)                      AS package_count_agents,
  ROUND(COUNT(*) FILTER (WHERE package_usage_available)::numeric / COUNT(*) * 100, 1) AS package_pct,
  -- Dependency graph
  COUNT(*) FILTER (WHERE dependency_available)                         AS dependency_count,
  ROUND(COUNT(*) FILTER (WHERE dependency_available)::numeric / COUNT(*) * 100, 1) AS dependency_pct,
  -- Ecosystem integration
  COUNT(*) FILTER (WHERE ecosystem_available)                          AS ecosystem_count,
  ROUND(COUNT(*) FILTER (WHERE ecosystem_available)::numeric / COUNT(*) * 100, 1) AS ecosystem_pct,
  -- Docs quality
  COUNT(*) FILTER (WHERE docs_quality_available)                       AS docs_count,
  ROUND(COUNT(*) FILTER (WHERE docs_quality_available)::numeric / COUNT(*) * 100, 1) AS docs_pct,
  -- HN signal
  COUNT(*) FILTER (WHERE hn_available)                                 AS hn_count,
  ROUND(COUNT(*) FILTER (WHERE hn_available)::numeric / COUNT(*) * 100, 1) AS hn_pct,
  -- Trust (always 100%)
  COUNT(*) FILTER (WHERE trust_available)                              AS trust_count,
  ROUND(COUNT(*) FILTER (WHERE trust_available)::numeric / COUNT(*) * 100, 1) AS trust_pct,
  -- Native (always 0%)
  COUNT(*) FILTER (WHERE native_available)                             AS native_count,
  0.0::numeric                                                         AS native_pct,
  -- Active weight distribution
  ROUND(AVG(active_weight_total), 3)                                   AS avg_active_weight,
  ROUND(MIN(active_weight_total), 3)                                   AS min_active_weight,
  ROUND(MAX(active_weight_total), 3)                                   AS max_active_weight,
  COUNT(*) FILTER (WHERE active_weight_total < 0.40)                   AS low_coverage_agents,
  COUNT(*) FILTER (WHERE needs_human_review)                           AS needs_review_count
FROM agent_score_v2_rank_comparison;


-- ── Known-agent comparison ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_known_agents AS
SELECT
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
  review_reasons
FROM agent_score_v2_rank_comparison
WHERE handle IN (
  'crewai', 'dspyagents', 'openclaw', 'agentops', 'aider',
  'openhands', 'camelai', 'langroid', 'agentscope', 'babyagi'
)
ORDER BY COALESCE(current_rank, 99999);


-- ── Biggest movers: positive rank change under v2_a ──────────────────────────
-- Query with: SELECT * FROM agent_score_v2_movers_positive_a LIMIT 50;

CREATE OR REPLACE VIEW agent_score_v2_movers_positive_a AS
SELECT
  handle, display_name, current_rank, rank_v2_a, rank_delta_a,
  current_score, score_v2_a_candidate, score_delta_a,
  active_weight_total, needs_human_review, review_reasons,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score
FROM agent_score_v2_rank_comparison
WHERE current_rank IS NOT NULL
ORDER BY rank_delta_a DESC NULLS LAST;


-- ── Biggest movers: negative rank change under v2_a ──────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_movers_negative_a AS
SELECT
  handle, display_name, current_rank, rank_v2_a, rank_delta_a,
  current_score, score_v2_a_candidate, score_delta_a,
  active_weight_total, needs_human_review, review_reasons,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score
FROM agent_score_v2_rank_comparison
WHERE current_rank IS NOT NULL
ORDER BY rank_delta_a ASC NULLS LAST;


-- ── Biggest movers: positive rank change under v2_b ──────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_movers_positive_b AS
SELECT
  handle, display_name, current_rank, rank_v2_b, rank_delta_b,
  current_score, score_v2_b_candidate, score_delta_b,
  active_weight_total, needs_human_review, review_reasons,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score
FROM agent_score_v2_rank_comparison
WHERE current_rank IS NOT NULL
ORDER BY rank_delta_b DESC NULLS LAST;


-- ── Biggest movers: negative rank change under v2_b ──────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_movers_negative_b AS
SELECT
  handle, display_name, current_rank, rank_v2_b, rank_delta_b,
  current_score, score_v2_b_candidate, score_delta_b,
  active_weight_total, needs_human_review, review_reasons,
  github_score, package_usage_score, dependency_score,
  ecosystem_score, docs_quality_score, hn_score, trust_score
FROM agent_score_v2_rank_comparison
WHERE current_rank IS NOT NULL
ORDER BY rank_delta_b ASC NULLS LAST;


-- ── Large rank movers (±20 or more, either formula) ──────────────────────────

CREATE OR REPLACE VIEW agent_score_v2_large_movers AS
SELECT
  handle, display_name,
  current_rank, rank_v2_a, rank_v2_b,
  rank_delta_a, rank_delta_b,
  current_score, score_v2_a_candidate, score_v2_b_candidate,
  active_weight_total, needs_human_review, review_reasons,
  components
FROM agent_score_v2_rank_comparison
WHERE
  current_rank IS NOT NULL
  AND (
    ABS(rank_delta_a) >= 20
    OR ABS(rank_delta_b) >= 20
  )
ORDER BY GREATEST(ABS(COALESCE(rank_delta_a,0)), ABS(COALESCE(rank_delta_b,0))) DESC;


-- ============================================================
-- WEEK-OVER-WEEK STABILITY ASSESSMENT
-- ============================================================
--
-- Status: NOT POSSIBLE YET
--
-- Reason:
--   Week-over-week v2 stability requires computing score_v2_a and
--   score_v2_b at two points in time (today and 7 days ago) using
--   the same formula, then comparing the resulting ranks.
--
--   The signal tables (agent_hn_signals, agent_package_download_signals,
--   agent_dependency_edges, agent_docs_quality_signals) were created
--   on 2026-04-24. Today is 2026-04-25.
--
--   These tables do not yet contain enough historical signal snapshots
--   to reconstruct what each component score would have been 7 days ago.
--   The rollup views are live views — they reflect current state only.
--
--   agent_snapshots (created 2026-04-08) captures v1 score_total and
--   v1 global_rank, but NOT decomposed v2 component scores.
--   Comparing v1 rank at t-7 to v2 rank today conflates formula change
--   with time change and is not a valid stability measure.
--
-- What IS possible now:
--   - Single-point v1 vs v2 rank comparison (above views)
--   - Coverage diagnostics
--
-- What becomes possible after 1 full week of signal accumulation:
--   Snapshot the signal rollup outputs into a separate audit table
--   (e.g. agent_score_v2_snapshots) on a daily cron. After 7 daily
--   rows exist, create a view comparing rank_v2_a_today vs rank_v2_a_7d_ago.
--
-- TODO (do not implement until signal data accumulates):
--   CREATE TABLE agent_score_v2_snapshots (
--     agent_id UUID, snapshot_date DATE,
--     score_v2_a NUMERIC, score_v2_b NUMERIC,
--     rank_v2_a INTEGER, rank_v2_b INTEGER,
--     active_weight_total NUMERIC,
--     components JSONB,
--     PRIMARY KEY (agent_id, snapshot_date)
--   );
--   -- Populated by: node tools/record-v2-snapshot.mjs (to be written)
--   -- Week-over-week view: compare snapshot_date = TODAY vs TODAY - 7
--
-- ============================================================


-- ============================================================
-- STEP 2 — Convenience queries (copy/paste into Supabase SQL editor)
-- ============================================================
--
-- Top 50 by current v1 rank:
--   SELECT handle, display_name, current_rank, current_score,
--          rank_v2_a, rank_v2_b, rank_delta_a, rank_delta_b,
--          score_v2_a_candidate, score_v2_b_candidate, active_weight_total,
--          needs_human_review
--   FROM agent_score_v2_rank_comparison
--   WHERE current_rank IS NOT NULL
--   ORDER BY current_rank ASC
--   LIMIT 50;
--
-- Top 50 by score_v2_a:
--   SELECT handle, display_name, rank_v2_a, score_v2_a_candidate,
--          current_rank, rank_delta_a, active_weight_total, needs_human_review
--   FROM agent_score_v2_rank_comparison
--   ORDER BY rank_v2_a ASC
--   LIMIT 50;
--
-- Top 50 by score_v2_b:
--   SELECT handle, display_name, rank_v2_b, score_v2_b_candidate,
--          current_rank, rank_delta_b, active_weight_total, needs_human_review
--   FROM agent_score_v2_rank_comparison
--   ORDER BY rank_v2_b ASC
--   LIMIT 50;
--
-- Top 50 positive movers (v2_a):
--   SELECT * FROM agent_score_v2_movers_positive_a LIMIT 50;
--
-- Top 50 negative movers (v2_a):
--   SELECT * FROM agent_score_v2_movers_negative_a LIMIT 50;
--
-- Top 50 positive movers (v2_b):
--   SELECT * FROM agent_score_v2_movers_positive_b LIMIT 50;
--
-- Top 50 negative movers (v2_b):
--   SELECT * FROM agent_score_v2_movers_negative_b LIMIT 50;
--
-- Large movers ±20 (either formula):
--   SELECT * FROM agent_score_v2_large_movers;
--
-- Coverage diagnostics:
--   SELECT * FROM agent_score_v2_coverage_diagnostics;
--
-- Known-agent comparison:
--   SELECT * FROM agent_score_v2_known_agents;
--
-- All agents needing human review:
--   SELECT handle, display_name, current_rank, rank_v2_a, rank_v2_b,
--          review_reasons, active_weight_total, components
--   FROM agent_score_v2_rank_comparison
--   WHERE needs_human_review = TRUE
--   ORDER BY COALESCE(current_rank, 9999);
-- ============================================================
