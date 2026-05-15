-- Step (c) of the Category Index Pivot — Model Family scoring view
-- Date: 2026-05-15
-- Kris-approved 2026-05-15 (design doc: agentcrush-brain/Decisions/2026-05-15-model-family-scoring-design.md)
--
-- Adds `agents.hf_author` (TEXT, nullable, indexed) to join model_family agents
-- to all HF models from that author. Backfills the 3 model_family seed agents.
--
-- Creates `agent_score_model_family_v1` view. Aggregates HF signals (downloads,
-- likes, recency, breadth, top model) by hf_author. Reserves columns for future
-- signals (derivatives, LMArena, citations, social) — NULL placeholders until
-- their adapters ship.
--
-- IMPORTANT: evidence_ready_for_public_rank is intentionally false for every
-- model_family agent on day 1. The rule (Kris-approved 2026-05-15):
--   "At least 3 of 5 signals present AND at least one of (derivatives, LMArena,
--    citations) must be one of them. Downloads alone is vanity for models the
--    same way GitHub stars are vanity for developer agents."
-- Since derivatives, LMArena, and citations adapters haven't shipped yet, no
-- model_family agent can pass the rule. /rankings/model-families launches
-- empty with full methodology transparency. Rankings populate as evidence
-- accumulates — not on a fixed date.
--
-- Sequence to defensible v1: LMArena adapter → derivatives adapter → citations
-- adapter → then most well-known model families (Hermes, Llama, Mistral, Qwen,
-- DeepSeek) become evidence-ready automatically within days.
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add agents.hf_author column
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS hf_author TEXT;

COMMENT ON COLUMN public.agents.hf_author IS
  'HuggingFace organization/user name (e.g. NousResearch, meta-llama, mistralai, Qwen, deepseek-ai, google). Joins to hf_models.author. NULL for non-model-family agents.';

CREATE INDEX IF NOT EXISTS idx_agents_hf_author
  ON public.agents (hf_author);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Backfill the 3 model_family seed agents
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.agents SET hf_author = 'NousResearch' WHERE handle = 'nousresearch_hermes_agent';
UPDATE public.agents SET hf_author = 'deepseek-ai'  WHERE handle = 'deepseek';
UPDATE public.agents SET hf_author = 'google'       WHERE handle = 'gemini';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Drop old version of the view if present (idempotent re-runs)
-- ──────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.agent_score_model_family_v1 CASCADE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Create the model_family scoring view
-- ──────────────────────────────────────────────────────────────────────────────

CREATE VIEW public.agent_score_model_family_v1 AS
WITH author_aggregates AS (
  SELECT
    author,
    SUM(downloads)::BIGINT                                              AS total_downloads,
    SUM(likes)::INTEGER                                                 AS total_likes,
    COUNT(model_id)::INTEGER                                            AS model_count,
    MAX(downloads)::BIGINT                                              AS top_model_downloads,
    MAX(likes)::INTEGER                                                 AS top_model_likes,
    MAX(last_modified_at)                                               AS most_recent_modified,
    -- Per Kris 2026-05-15: track gated status as transparency, don't filter.
    -- "Gated = manual" doesn't mean unfree (Hermes weights are open even
    -- where the HF repo gates the agreement click).
    ROUND(
      100.0 * SUM(CASE WHEN COALESCE(gated, FALSE) THEN 1 ELSE 0 END)::numeric
            / NULLIF(COUNT(model_id), 0),
      1
    )::numeric(5,1)                                                     AS gated_pct
  FROM public.hf_models
  WHERE removed_at IS NULL
  GROUP BY author
),
hf_sub_scores AS (
  SELECT
    agg.author,
    agg.total_downloads,
    agg.total_likes,
    agg.model_count,
    agg.top_model_downloads,
    agg.top_model_likes,
    agg.most_recent_modified,
    agg.gated_pct,

    -- Sub-scores within the HF basket (each 0..100)
    LEAST(100, ROUND( LOG(10, GREATEST(1, agg.total_downloads))     * 15 ))::INTEGER AS hf_downloads_score,
    LEAST(100, ROUND( LOG(10, GREATEST(1, agg.total_likes))         * 25 ))::INTEGER AS hf_likes_score,
    CASE
      WHEN agg.most_recent_modified > NOW() - INTERVAL '30 days'  THEN 100
      WHEN agg.most_recent_modified > NOW() - INTERVAL '90 days'  THEN 75
      WHEN agg.most_recent_modified > NOW() - INTERVAL '180 days' THEN 50
      WHEN agg.most_recent_modified > NOW() - INTERVAL '365 days' THEN 25
      ELSE 0
    END::INTEGER                                                                     AS hf_recency_score,
    LEAST(100, ROUND( LOG(10, GREATEST(1, agg.model_count))         * 40 ))::INTEGER AS hf_breadth_score,
    LEAST(100, ROUND( LOG(10, GREATEST(1, agg.top_model_downloads)) * 13 ))::INTEGER AS hf_top_model_score
  FROM author_aggregates agg
),
hf_basket AS (
  SELECT
    *,
    -- Composite HF score (weighted average of the 5 HF sub-scores).
    -- Internal weights: downloads 30, likes 20, recency 20, breadth 15, top 15.
    -- This single value represents the "HF" 30% slice in the Kris-approved
    -- top-level weighting (HF 30, derivatives 20, LMArena 25, citations 15,
    -- social 10).
    ROUND(
      hf_downloads_score  * 0.30 +
      hf_likes_score      * 0.20 +
      hf_recency_score    * 0.20 +
      hf_breadth_score    * 0.15 +
      hf_top_model_score  * 0.15
    )::INTEGER AS hf_score
  FROM hf_sub_scores
)
SELECT
  a.id                                       AS agent_id,
  a.handle,
  a.display_name,
  a.hf_author,

  -- Raw HF aggregates (for transparency display)
  COALESCE(hb.total_downloads, 0)::BIGINT    AS total_downloads,
  COALESCE(hb.total_likes, 0)::INTEGER       AS total_likes,
  COALESCE(hb.model_count, 0)::INTEGER       AS model_count,
  COALESCE(hb.top_model_downloads, 0)::BIGINT AS top_model_downloads,
  COALESCE(hb.top_model_likes, 0)::INTEGER   AS top_model_likes,
  hb.most_recent_modified,
  hb.gated_pct,

  -- HF sub-scores (the 5 internals)
  COALESCE(hb.hf_downloads_score, 0)::INTEGER  AS hf_downloads_score,
  COALESCE(hb.hf_likes_score, 0)::INTEGER      AS hf_likes_score,
  COALESCE(hb.hf_recency_score, 0)::INTEGER    AS hf_recency_score,
  COALESCE(hb.hf_breadth_score, 0)::INTEGER    AS hf_breadth_score,
  COALESCE(hb.hf_top_model_score, 0)::INTEGER  AS hf_top_model_score,

  -- Top-level signal slices (Kris-approved 2026-05-15 weights: 30/20/25/15/10)
  COALESCE(hb.hf_score, 0)::INTEGER            AS hf_score,
  -- Reserved columns — NULL until their adapters ship.
  -- Future migration replaces this view to plumb in real values.
  NULL::INTEGER                                AS derivatives_score,
  NULL::INTEGER                                AS lmarena_score,
  NULL::INTEGER                                AS citations_score,
  NULL::INTEGER                                AS social_score,

  -- Composite model_family_score: weighted blend over the 5 top-level slices.
  -- NULL slices contribute 0. Until derivatives/LMArena/citations/social
  -- adapters land, every score is capped at ~30 (the HF slice's full weight).
  ROUND(
    COALESCE(hb.hf_score, 0)        * 0.30 +
    COALESCE(NULL::INTEGER, 0)::INT * 0.20 +  -- derivatives
    COALESCE(NULL::INTEGER, 0)::INT * 0.25 +  -- lmarena
    COALESCE(NULL::INTEGER, 0)::INT * 0.15 +  -- citations
    COALESCE(NULL::INTEGER, 0)::INT * 0.10    -- social
  )::INTEGER                                   AS model_family_score,

  -- Rank within the model_family category (over composite score)
  RANK() OVER (
    ORDER BY (
      COALESCE(hb.hf_score, 0)        * 0.30 +
      COALESCE(NULL::INTEGER, 0)::INT * 0.20 +
      COALESCE(NULL::INTEGER, 0)::INT * 0.25 +
      COALESCE(NULL::INTEGER, 0)::INT * 0.15 +
      COALESCE(NULL::INTEGER, 0)::INT * 0.10
    ) DESC
  )::INTEGER                                   AS rank_in_model_family,

  -- Count of signals currently available (HF + any non-NULL future)
  (
    CASE WHEN COALESCE(hb.hf_score, 0) > 0   THEN 1 ELSE 0 END +
    0 +  -- derivatives_score IS NOT NULL
    0 +  -- lmarena_score IS NOT NULL
    0 +  -- citations_score IS NOT NULL
    0    -- social_score IS NOT NULL
  )::INTEGER                                   AS signals_available_count,

  -- Strict evidence-ready rule (Kris 2026-05-15):
  --   Require at least 3 of 5 signals present AND at least one of
  --   (derivatives, LMArena, citations). Downloads alone doesn't qualify.
  -- Since derivatives/LMArena/citations adapters haven't shipped, this is
  -- FALSE for every row today. Rankings populate as adapters land.
  (
    -- 3 of 5 signals present
    (
      (CASE WHEN COALESCE(hb.hf_score, 0) > 0  THEN 1 ELSE 0 END) +
      0 +  -- derivatives_score IS NOT NULL
      0 +  -- lmarena_score IS NOT NULL
      0 +  -- citations_score IS NOT NULL
      0    -- social_score IS NOT NULL
    ) >= 3
    -- AND at least one of (derivatives, LMArena, citations) — all currently NULL
    AND (
      FALSE  -- derivatives_score IS NOT NULL
      OR FALSE  -- lmarena_score IS NOT NULL
      OR FALSE  -- citations_score IS NOT NULL
    )
  )                                            AS evidence_ready_for_public_rank,

  -- Methodology version (bump when the rule or weights change)
  'v1.0-hf-only'::TEXT                         AS methodology_version

FROM public.agents a
LEFT JOIN hf_basket hb ON hb.author = a.hf_author
WHERE a.primary_category = 'model_family';

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model-family category scoring view. Aggregates HF signals by hf_author. Reserved columns for derivatives/LMArena/citations/social — NULL until adapters ship. evidence_ready_for_public_rank is strict: requires 3-of-5 signals AND at least one corroborating capability signal (derivatives/LMArena/citations). Methodology v1.0-hf-only. See agentcrush-brain/Decisions/2026-05-15-model-family-scoring-design.md.';
