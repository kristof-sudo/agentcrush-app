-- Migration: 20260608_0920_model_family_scoring_view
-- Creates agent_score_model_family_v1 — composite score for model_family agents.
--
-- Methodology v1.0-model-family-v0:
--
-- The full rubric the methodology page advertises is:
--   • HF downloads 25%  • LMSYS Arena rank 25%  • GitHub stars 15%
--   • Derivative models count 15%  • Agentic adoption 20%
--
-- v1.0 reality: we have GitHub stars + follower_count + recency in agent_snapshots,
-- and visibility_score / reputation_score on agents (manually curated from the
-- rubric above). HF downloads, LMSYS rank, derivative counts, and agentic-
-- integration counts are pending ingestion (planned v1.1).
--
-- So v1.0 uses:
--   Expert visibility composite (visibility_score)    40%
--      — analyst-curated from HF / LMSYS / derivatives, the rubric anchor
--   GitHub stars (log-scaled, latest snapshot)        20%
--   Follower count (log-scaled, latest snapshot)      15%
--   Reputation score (trust + community)              15%
--   Recency (last_event_at within 30d)                10%
--   ───────────────────────────────────────────────────────
--   Total                                            100%
--
-- Evidence-ready: 3 of 5 signals non-null AND visibility_score >= 50
-- (visibility_score is the expert composite — below 50 means we haven't
--  evaluated the model family at all, so any ranking would be noise).
--
-- v1.1 will replace visibility_score with ingested sub-signals:
--   hf_downloads_score (HuggingFace API monthly), lmsys_arena_rank_score
--   (LMSYS leaderboard scrape), derivative_models_count_score (HF model search
--   for base-model children), agentic_adoption_score (search CrewAI/LangChain/
--   AutoGen integration registries).
--
-- Idempotent.

DROP VIEW IF EXISTS public.agent_score_model_family_v1 CASCADE;

CREATE VIEW public.agent_score_model_family_v1 AS
WITH latest_snapshot AS (
  -- Pick the most recent snapshot row per agent_id
  SELECT DISTINCT ON (agent_id)
    agent_id, snapshot_date, score, rank, github_stars, follower_count
  FROM public.agent_snapshots
  ORDER BY agent_id, snapshot_date DESC
),
joined AS (
  SELECT
    a.id, a.handle, a.display_name, a.bio,
    a.primary_category, a.secondary_categories,
    a.tier, a.activity_status,
    a.visibility_score, a.reputation_score,
    a.last_event_at, a.website_url, a.github_url, a.x_handle,
    s.snapshot_date    AS latest_snapshot_date,
    s.github_stars,
    s.follower_count
  FROM public.agents a
  LEFT JOIN latest_snapshot s ON s.agent_id = a.id
  WHERE a.primary_category = 'model_family'
     OR 'model_family' = ANY(COALESCE(a.secondary_categories, ARRAY[]::TEXT[]))
),
sub_scores AS (
  SELECT
    j.*,

    -- Expert visibility composite — analyst-curated from the rubric above.
    -- This is the anchor signal in v1.0; v1.1 replaces it with ingested
    -- HF / LMSYS / derivatives / adoption sub-scores.
    CASE
      WHEN visibility_score IS NULL THEN NULL::INTEGER
      ELSE GREATEST(0, LEAST(100, visibility_score))::INTEGER
    END AS expert_visibility_score,

    -- GitHub stars (log-scaled). Org or base-repo stars from latest snapshot.
    --   100 → 24,  1k → 36,  10k → 48,  100k → 60
    CASE
      WHEN github_stars IS NULL OR github_stars <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, github_stars::numeric)) * 12))::INTEGER
    END AS github_stars_score,

    -- Follower count (log-scaled). Org/team X account.
    --   1k → 36, 10k → 52, 100k → 68, 1M → 84
    CASE
      WHEN follower_count IS NULL OR follower_count <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, follower_count::numeric)) * 16))::INTEGER
    END AS followers_score,

    -- Reputation score — already 0-100 scale on agents table.
    CASE
      WHEN reputation_score IS NULL THEN NULL::INTEGER
      ELSE GREATEST(0, LEAST(100, reputation_score))::INTEGER
    END AS reputation_basket_score,

    -- Recency: 100 if active or last_event within 7d, 70 within 30d,
    -- 30 within 90d, 0 otherwise.
    CASE
      WHEN activity_status = 'active' THEN 100
      WHEN last_event_at IS NULL THEN 0
      WHEN last_event_at > NOW() - INTERVAL '7 days'  THEN 100
      WHEN last_event_at > NOW() - INTERVAL '30 days' THEN 70
      WHEN last_event_at > NOW() - INTERVAL '90 days' THEN 30
      ELSE 0
    END::INTEGER AS recency_score

  FROM joined j
)
SELECT
  id                                                  AS agent_id,
  handle,
  display_name,
  bio,
  primary_category,
  secondary_categories,
  tier,
  activity_status,
  website_url,
  github_url,
  x_handle,
  latest_snapshot_date,

  -- Raw inputs (for transparency display)
  visibility_score                                    AS raw_visibility_score,
  reputation_score                                    AS raw_reputation_score,
  github_stars                                        AS raw_github_stars,
  follower_count                                      AS raw_follower_count,
  last_event_at                                       AS raw_last_event_at,

  -- Sub-scores
  expert_visibility_score,
  github_stars_score,
  followers_score,
  reputation_basket_score,
  recency_score,

  -- Composite (weights: visibility 40, stars 20, followers 15, reputation 15, recency 10)
  ROUND(
    COALESCE(expert_visibility_score, 0)   * 0.40 +
    COALESCE(github_stars_score, 0)        * 0.20 +
    COALESCE(followers_score, 0)           * 0.15 +
    COALESCE(reputation_basket_score, 0)   * 0.15 +
    COALESCE(recency_score, 0)             * 0.10
  )::INTEGER AS model_family_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(expert_visibility_score, 0)   * 0.40 +
      COALESCE(github_stars_score, 0)        * 0.20 +
      COALESCE(followers_score, 0)           * 0.15 +
      COALESCE(reputation_basket_score, 0)   * 0.15 +
      COALESCE(recency_score, 0)             * 0.10
    ) DESC
  )::INTEGER AS rank_in_model_family,

  -- Signals available count (5 signals)
  (
    (CASE WHEN expert_visibility_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN github_stars_score      IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN followers_score         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN reputation_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN recency_score           IS NOT NULL THEN 1 ELSE 0 END)
  )::INTEGER AS signals_available_count,

  -- Evidence-ready: 3-of-5 AND visibility_score >= 50 (the expert anchor)
  (
    (
      (CASE WHEN expert_visibility_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN github_stars_score      IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN followers_score         IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN reputation_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN recency_score           IS NOT NULL THEN 1 ELSE 0 END)
    ) >= 3
    AND visibility_score IS NOT NULL
    AND visibility_score >= 50
  ) AS evidence_ready_for_public_rank,

  'v1.0-model-family-v0'::TEXT AS methodology_version

FROM sub_scores;

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model family scoring view, methodology v1.0. Composite of expert visibility (40% — analyst-curated from HF downloads / LMSYS Arena rank / derivative model count / agentic adoption), GitHub stars (20%, log-scaled), follower count (15%, log-scaled), reputation (15%), and recency (10%). Evidence-ready requires 3 of 5 signals AND visibility_score >= 50. v1.1 will replace expert_visibility_score with ingested sub-signals from HuggingFace API, LMSYS leaderboard, and agentic framework registries.';
