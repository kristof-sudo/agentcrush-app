-- Step (c.3.b) — Plumb citations_score into agent_score_model_family_v1
-- Date: 2026-05-16
-- Depends on: 20260516_0900_create_paper_citations.sql
-- Depends on: agent_score_model_family_v1 (currently v1.2-hf+lmarena+derivatives)
--
-- Replaces the view with v1.3 that computes citations_score per agent by
-- joining agents.semantic_scholar_paper_ids → paper_citations.arxiv_id.
--
-- Mapping (per the c.3 design):
--   citations_score = LEAST(100, ROUND( LOG(10, GREATEST(1, total_citations)) * 16 ))
-- where total_citations = SUM(paper_citations.citation_count) JOINed via
-- agents.semantic_scholar_paper_ids (tokens "arxiv:XXXX.XXXXX" stripped to
-- match paper_citations.arxiv_id).
--
-- Projected scores from currently-populated paper_citations rows:
--   Qwen      9634 cites  → 64
--   DeepSeek  6556 cites  → 61
--   Gemini    3528 cites  → 57
--   Llama    19768 cites  → 69
--   Hermes        0 cites → NULL (paper fetch failed; backfill later)
--
-- After this migration, with full top-level weights (HF 30 / derivatives 20 /
-- LMArena 25 / citations 15 / social 10), projected composites:
--   Qwen:     0.30*100 + 0.20*75 + 0.25*96 + 0.15*64 + 0.10*0 = 30+15+24+9.6+0  = 78.6 → 79
--   Gemini:   0.30*99  + 0.20*63 + 0.25*98 + 0.15*57 + 0.10*0 = 29.7+12.6+24.5+8.6 = 75.4 → 75
--   DeepSeek: 0.30*93  + 0.20*50 + 0.25*94 + 0.15*61 + 0.10*0 = 27.9+10+23.5+9.2 = 70.6 → 71
--   Llama:    0.30*78  + 0.20*58 + 0.25*73 + 0.15*69 + 0.10*0 = 23.4+11.6+18.3+10.4 = 63.7 → 64
--   Hermes:   0.30*69  + 0.20*33 + 0     + 0      + 0     = 20.7+6.6 = 27.3 → 27 (unchanged, 2 signals)
--
-- Evidence-ready rule unchanged: 3-of-5 signals AND ≥1 capability signal
-- (derivatives OR lmarena OR citations).
--
-- Methodology version: v1.2-hf+lmarena+derivatives → v1.3-hf+lmarena+derivatives+citations.
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
derivatives_per_author AS (
  SELECT
    base_author                                                         AS author,
    SUM(derivatives_count)::INTEGER                                     AS total_derivatives,
    SUM(derivatives_total_downloads)::BIGINT                            AS total_derivative_downloads,
    COUNT(base_model)::INTEGER                                          AS base_models_with_derivatives,
    MAX(derivatives_count)::INTEGER                                     AS top_base_derivatives_count
  FROM public.hf_derivatives
  GROUP BY base_author
),
-- NEW IN v1.3: per-agent citation aggregation
-- Join agents.semantic_scholar_paper_ids ("arxiv:XXXX.XXXXX") → paper_citations.arxiv_id
citations_per_agent AS (
  SELECT
    a.id                                                                AS agent_id,
    SUM(pc.citation_count)::BIGINT                                      AS total_citations,
    SUM(pc.influential_citation_count)::INTEGER                         AS total_influential_citations,
    COUNT(pc.paper_id)::INTEGER                                         AS papers_matched_count,
    MAX(pc.citation_count)::INTEGER                                     AS top_paper_citations
  FROM public.agents a
  LEFT JOIN LATERAL unnest(a.semantic_scholar_paper_ids) AS t(token) ON TRUE
  LEFT JOIN public.paper_citations pc
    ON pc.arxiv_id = REGEXP_REPLACE(t.token, '^arxiv:', '', 'i')
    AND pc.removed_at IS NULL
  WHERE a.primary_category = 'model_family'
  GROUP BY a.id
)
SELECT
  a.id                                       AS agent_id,
  a.handle,
  a.display_name,
  a.hf_author,
  a.lmarena_model_keys,
  a.semantic_scholar_paper_ids,

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

  -- Derivatives raw aggregates
  COALESCE(dpa.total_derivatives, 0)::INTEGER          AS total_derivatives,
  COALESCE(dpa.base_models_with_derivatives, 0)::INTEGER AS base_models_with_derivatives,
  COALESCE(dpa.top_base_derivatives_count, 0)::INTEGER AS top_base_derivatives_count,
  COALESCE(dpa.total_derivative_downloads, 0)::BIGINT  AS total_derivative_downloads,

  -- NEW: Citations raw aggregates
  COALESCE(cpa.total_citations, 0)::BIGINT             AS total_citations,
  COALESCE(cpa.total_influential_citations, 0)::INTEGER AS total_influential_citations,
  COALESCE(cpa.papers_matched_count, 0)::INTEGER       AS papers_matched_count,
  COALESCE(cpa.top_paper_citations, 0)::INTEGER        AS top_paper_citations,

  -- HF sub-scores
  COALESCE(hb.hf_downloads_score, 0)::INTEGER  AS hf_downloads_score,
  COALESCE(hb.hf_likes_score, 0)::INTEGER      AS hf_likes_score,
  COALESCE(hb.hf_recency_score, 0)::INTEGER    AS hf_recency_score,
  COALESCE(hb.hf_breadth_score, 0)::INTEGER    AS hf_breadth_score,
  COALESCE(hb.hf_top_model_score, 0)::INTEGER  AS hf_top_model_score,

  -- Top-level signal slices
  COALESCE(hb.hf_score, 0)::INTEGER            AS hf_score,
  CASE
    WHEN dpa.total_derivatives IS NULL OR dpa.total_derivatives = 0 THEN NULL::INTEGER
    ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dpa.total_derivatives::numeric)) * 25 ))::INTEGER
  END                                          AS derivatives_score,
  CASE
    WHEN lma.lmarena_top_score IS NULL THEN NULL::INTEGER
    ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))::INTEGER
  END                                          AS lmarena_score,
  -- NEW: Citations — log-scaled total cites × 16
  CASE
    WHEN cpa.total_citations IS NULL OR cpa.total_citations = 0 THEN NULL::INTEGER
    ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, cpa.total_citations::numeric)) * 16 ))::INTEGER
  END                                          AS citations_score,
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
    COALESCE(
      CASE WHEN cpa.total_citations IS NULL OR cpa.total_citations = 0 THEN 0
           ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, cpa.total_citations::numeric)) * 16 ))
      END, 0
    )                                                              * 0.15 +
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
      COALESCE(
        CASE WHEN cpa.total_citations IS NULL OR cpa.total_citations = 0 THEN 0
             ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, cpa.total_citations::numeric)) * 16 ))
        END, 0
      ) * 0.15 +
      0 * 0.10
    ) DESC
  )::INTEGER                                   AS rank_in_model_family,

  -- Signals available count: HF + derivatives + LMArena + citations + (social NULL)
  (
    (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN cpa.total_citations IS NOT NULL AND cpa.total_citations > 0 THEN 1 ELSE 0 END) +
    0    -- social_score IS NOT NULL
  )::INTEGER                                   AS signals_available_count,

  -- Evidence-ready rule unchanged:
  --   3 of 5 signals AND >=1 of (derivatives, LMArena, citations)
  (
    (
      (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN cpa.total_citations IS NOT NULL AND cpa.total_citations > 0 THEN 1 ELSE 0 END) +
      0
    ) >= 3
    AND (
      (dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0)
      OR lma.lmarena_top_score IS NOT NULL
      OR (cpa.total_citations IS NOT NULL AND cpa.total_citations > 0)
    )
  )                                            AS evidence_ready_for_public_rank,

  'v1.3-hf+lmarena+derivatives+citations'::TEXT AS methodology_version

FROM public.agents a
LEFT JOIN hf_basket hb               ON hb.author     = a.hf_author
LEFT JOIN lmarena_per_agent lma      ON lma.agent_id  = a.id
LEFT JOIN derivatives_per_author dpa ON dpa.author    = a.hf_author
LEFT JOIN citations_per_agent cpa    ON cpa.agent_id  = a.id
WHERE a.primary_category = 'model_family';

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model-family scoring view, methodology v1.3. Plumbs HF + LMArena + derivatives + citations. Social still NULL. evidence_ready_for_public_rank requires 3-of-5 signals AND >=1 capability signal (derivatives/LMArena/citations). citations_score = LOG10(SUM(citation_count))*16 from paper_citations.';
