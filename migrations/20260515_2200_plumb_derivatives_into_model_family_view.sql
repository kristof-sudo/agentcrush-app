-- Step (c.2.b) — Plumb derivatives_score into agent_score_model_family_v1
-- Date: 2026-05-15
-- Depends on: hf_derivatives (step c.2 — created + populated)
-- Depends on: agent_score_model_family_v1 (currently v1.1-hf+lmarena)
--
-- Replaces the view with a v1.2 that computes derivatives_score per author.
-- Mapping (per the future-step note in step c.2 README):
--   derivatives_score = LEAST(100, ROUND( LOG(10, GREATEST(1, total_derivatives)) * 25 ))
-- where total_derivatives = SUM(hf_derivatives.derivatives_count) GROUPED BY base_author.
--
-- After this migration, projected scores for current seeds:
--   Google (Gemini): HF 99 + LMArena 98 + Derivatives 63 → composite ~67. 3 signals + LMArena capability → EVIDENCE-READY ✓
--   DeepSeek:        HF 93 + LMArena 94 + Derivatives 50 → composite ~61. 3 signals + LMArena capability → EVIDENCE-READY ✓
--   Hermes:          HF 69 + LMArena 0  + Derivatives 33 → composite ~27. 2 signals → still NOT evidence-ready.
--     (Hermes needs citations (step c.3) to add the 3rd signal AND a capability signal beyond derivatives.)
--
-- Methodology version: v1.1-hf+lmarena → v1.2-hf+lmarena+derivatives.
--
-- Idempotent.

DROP VIEW IF EXISTS public.agent_score_model_family_v1 CASCADE;

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
    agg.*,
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
    ROUND(
      hf_downloads_score  * 0.30 +
      hf_likes_score      * 0.20 +
      hf_recency_score    * 0.20 +
      hf_breadth_score    * 0.15 +
      hf_top_model_score  * 0.15
    )::INTEGER AS hf_score
  FROM hf_sub_scores
),
lmarena_per_agent AS (
  SELECT
    a.id                                                  AS agent_id,
    MAX(lm.arena_score)::NUMERIC                          AS lmarena_top_score,
    COUNT(lm.model_name)::INTEGER                         AS lmarena_matched_count,
    SUM(lm.votes)::BIGINT                                 AS lmarena_total_votes
  FROM public.agents a
  LEFT JOIN public.lmarena_models lm
    ON lm.model_name = ANY(a.lmarena_model_keys)
    AND lm.removed_at IS NULL
  WHERE a.primary_category = 'model_family'
  GROUP BY a.id
),
-- NEW IN v1.2: per-author derivatives aggregation
derivatives_per_author AS (
  SELECT
    base_author                                                         AS author,
    SUM(derivatives_count)::INTEGER                                     AS total_derivatives,
    SUM(derivatives_total_downloads)::BIGINT                            AS total_derivative_downloads,
    COUNT(base_model)::INTEGER                                          AS base_models_with_derivatives,
    MAX(derivatives_count)::INTEGER                                     AS top_base_derivatives_count
  FROM public.hf_derivatives
  GROUP BY base_author
)
SELECT
  a.id                                       AS agent_id,
  a.handle,
  a.display_name,
  a.hf_author,
  a.lmarena_model_keys,

  -- Raw HF aggregates
  COALESCE(hb.total_downloads, 0)::BIGINT     AS total_downloads,
  COALESCE(hb.total_likes, 0)::INTEGER        AS total_likes,
  COALESCE(hb.model_count, 0)::INTEGER        AS model_count,
  COALESCE(hb.top_model_downloads, 0)::BIGINT AS top_model_downloads,
  COALESCE(hb.top_model_likes, 0)::INTEGER    AS top_model_likes,
  hb.most_recent_modified,
  hb.gated_pct,

  -- LMArena raw aggregates
  lma.lmarena_top_score                       AS lmarena_top_arena_score,
  lma.lmarena_matched_count,
  lma.lmarena_total_votes,

  -- NEW: Derivatives raw aggregates
  COALESCE(dpa.total_derivatives, 0)::INTEGER          AS total_derivatives,
  COALESCE(dpa.base_models_with_derivatives, 0)::INTEGER AS base_models_with_derivatives,
  COALESCE(dpa.top_base_derivatives_count, 0)::INTEGER AS top_base_derivatives_count,
  COALESCE(dpa.total_derivative_downloads, 0)::BIGINT  AS total_derivative_downloads,

  -- HF sub-scores
  COALESCE(hb.hf_downloads_score, 0)::INTEGER  AS hf_downloads_score,
  COALESCE(hb.hf_likes_score, 0)::INTEGER      AS hf_likes_score,
  COALESCE(hb.hf_recency_score, 0)::INTEGER    AS hf_recency_score,
  COALESCE(hb.hf_breadth_score, 0)::INTEGER    AS hf_breadth_score,
  COALESCE(hb.hf_top_model_score, 0)::INTEGER  AS hf_top_model_score,

  -- Top-level signal slices
  COALESCE(hb.hf_score, 0)::INTEGER            AS hf_score,
  -- Derivatives: log-scaled total count × 25
  CASE
    WHEN dpa.total_derivatives IS NULL OR dpa.total_derivatives = 0 THEN NULL::INTEGER
    ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dpa.total_derivatives::numeric)) * 25 ))::INTEGER
  END                                          AS derivatives_score,
  -- LMArena: (700..1500) → (0..100)
  CASE
    WHEN lma.lmarena_top_score IS NULL THEN NULL::INTEGER
    ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))::INTEGER
  END                                          AS lmarena_score,
  NULL::INTEGER                                AS citations_score,
  NULL::INTEGER                                AS social_score,

  -- Composite (weights: HF 30, derivatives 20, LMArena 25, citations 15, social 10)
  ROUND(
    COALESCE(hb.hf_score, 0)                                       * 0.30 +
    COALESCE(
      CASE WHEN dpa.total_derivatives IS NULL OR dpa.total_derivatives = 0 THEN 0
           ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dpa.total_derivatives::numeric)) * 25 ))
      END, 0
    )                                                              * 0.20 +
    COALESCE(
      CASE WHEN lma.lmarena_top_score IS NULL THEN 0
           ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))
      END, 0
    )                                                              * 0.25 +
    0                                                              * 0.15 +  -- citations
    0                                                              * 0.10    -- social
  )::INTEGER                                   AS model_family_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(hb.hf_score, 0) * 0.30 +
      COALESCE(
        CASE WHEN dpa.total_derivatives IS NULL OR dpa.total_derivatives = 0 THEN 0
             ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dpa.total_derivatives::numeric)) * 25 ))
        END, 0
      ) * 0.20 +
      COALESCE(
        CASE WHEN lma.lmarena_top_score IS NULL THEN 0
             ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))
        END, 0
      ) * 0.25 +
      0 * 0.15 +
      0 * 0.10
    ) DESC
  )::INTEGER                                   AS rank_in_model_family,

  -- Signals available count: HF + LMArena (if matched) + derivatives (if any)
  (
    (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
    0 +  -- citations_score IS NOT NULL
    0    -- social_score IS NOT NULL
  )::INTEGER                                   AS signals_available_count,

  -- Evidence-ready rule:
  --   3 of 5 signals AND >=1 of (derivatives, LMArena, citations)
  (
    (
      (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
      0 +
      0
    ) >= 3
    AND (
      (dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0)
      OR lma.lmarena_top_score IS NOT NULL
      OR FALSE  -- citations_score IS NOT NULL
    )
  )                                            AS evidence_ready_for_public_rank,

  'v1.2-hf+lmarena+derivatives'::TEXT          AS methodology_version

FROM public.agents a
LEFT JOIN hf_basket hb               ON hb.author     = a.hf_author
LEFT JOIN lmarena_per_agent lma      ON lma.agent_id  = a.id
LEFT JOIN derivatives_per_author dpa ON dpa.author    = a.hf_author
WHERE a.primary_category = 'model_family';

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model-family category scoring view, methodology v1.2. Plumbs HF + LMArena + derivatives. Citations and social still NULL. evidence_ready_for_public_rank requires 3-of-5 signals AND >=1 capability signal. Projected first evidence-ready agents: Gemini, DeepSeek. Hermes still pending (needs citations to reach 3-of-5).';
