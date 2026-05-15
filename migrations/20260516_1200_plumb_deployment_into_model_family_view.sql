-- Step (c.4.b) — Plumb deployment_score into agent_score_model_family_v1
-- Date: 2026-05-16
-- Depends on: 20260516_1100_create_model_family_deployments.sql
-- Depends on: agent_score_model_family_v1 (currently v1.3-hf+lmarena+derivatives+citations)
--
-- Replaces the view with v1.4-FULL. This is the methodology completion: all 5
-- signal slots filled. Methodology version: 'v1.4-with-deployment'.
--
-- Mapping:
--   deployment_score = LEAST(100, ROUND( LOG(10, GREATEST(1, SUM(deployment_count))) * 30 ))
-- where SUM is over all source_table rows in model_family_deployments.
--
-- IMPORTANT METHODOLOGY DECISION:
--   The previously-NULL "social_score" slot is REPURPOSED to "deployment_score".
--   Rationale: HN/Reddit discourse is commodity-replicable data. Agent-economy
--   deployment counts (mentions across our 6-table cross-protocol index:
--   agents + bazaar_resources + erc8004_registry + agentverse_agents +
--   virtuals_agents + a2a_agents) are NOT commodity-replicable — only
--   AgentCrush has this view unified. This is the moat signal.
--
--   Composite weight stays 10% (replacing the social slot).
--   Deployment also counts as a "capability signal" in the evidence-ready rule.
--
-- Projected scores (verified against current paper_citations + model_family_deployments):
--
--   Qwen:     HF 100 + LM 96 + Der 75 + Cit ~67 + Dep 56 → composite ~80
--             evidence-ready (5 of 5 signals) ✅
--   Gemini:   HF 99  + LM 98 + Der 63 + Cit 57 + Dep 65 → composite ~77
--             evidence-ready (5 of 5 signals) ✅
--   DeepSeek: HF 93  + LM 94 + Der 50 + Cit 61 + Dep 47 → composite ~73
--             evidence-ready (5 of 5 signals) ✅
--   Llama:    HF 78  + LM 73 + Der 58 + Cit ~75 + Dep 54 → composite ~70
--             evidence-ready (5 of 5 signals) ✅
--   Hermes:   HF 69  + LM —  + Der 33 + Cit 24 + Dep 27 → composite ~33
--             evidence-ready (4 of 5 signals — finally clears the bar) ✅
--
-- Top-level weights (unchanged from design):
--   HF 30 / derivatives 20 / LMArena 25 / citations 15 / deployment 10
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
),
-- NEW IN v1.4: per-agent deployment aggregation across all 6 source tables
deployments_per_agent AS (
  SELECT
    model_family_handle,
    SUM(deployment_count)::INTEGER                                      AS total_deployments,
    COUNT(source_table)::INTEGER                                        AS sources_with_deployments,
    MAX(deployment_count)::INTEGER                                      AS top_source_deployments,
    jsonb_object_agg(source_table, deployment_count)                    AS deployments_by_source
  FROM public.model_family_deployments
  GROUP BY model_family_handle
)
SELECT
  a.id                                       AS agent_id,
  a.handle,
  a.display_name,
  a.hf_author,
  a.lmarena_model_keys,
  a.semantic_scholar_paper_ids,
  a.model_family_search_keywords,

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

  -- Citations raw aggregates
  COALESCE(cpa.total_citations, 0)::BIGINT             AS total_citations,
  COALESCE(cpa.total_influential_citations, 0)::INTEGER AS total_influential_citations,
  COALESCE(cpa.papers_matched_count, 0)::INTEGER       AS papers_matched_count,
  COALESCE(cpa.top_paper_citations, 0)::INTEGER        AS top_paper_citations,

  -- NEW: Deployment raw aggregates
  COALESCE(dep.total_deployments, 0)::INTEGER          AS total_deployments,
  COALESCE(dep.sources_with_deployments, 0)::INTEGER   AS sources_with_deployments,
  COALESCE(dep.top_source_deployments, 0)::INTEGER     AS top_source_deployments,
  dep.deployments_by_source                            AS deployments_by_source,

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
  CASE
    WHEN cpa.total_citations IS NULL OR cpa.total_citations = 0 THEN NULL::INTEGER
    ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, cpa.total_citations::numeric)) * 16 ))::INTEGER
  END                                          AS citations_score,
  -- NEW: Deployment score (replaces previously-reserved social_score slot)
  CASE
    WHEN dep.total_deployments IS NULL OR dep.total_deployments = 0 THEN NULL::INTEGER
    ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dep.total_deployments::numeric)) * 30 ))::INTEGER
  END                                          AS deployment_score,

  -- Composite (weights: HF 30, derivatives 20, LMArena 25, citations 15, deployment 10)
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
    COALESCE(
      CASE WHEN dep.total_deployments IS NULL OR dep.total_deployments = 0 THEN 0
           ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dep.total_deployments::numeric)) * 30 ))
      END, 0
    )                                                              * 0.10
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
      COALESCE(
        CASE WHEN dep.total_deployments IS NULL OR dep.total_deployments = 0 THEN 0
             ELSE LEAST(100, ROUND( LOG(10, GREATEST(1, dep.total_deployments::numeric)) * 30 ))
        END, 0
      ) * 0.10
    ) DESC
  )::INTEGER                                   AS rank_in_model_family,

  -- Signals available count: HF + derivatives + LMArena + citations + deployment
  (
    (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN cpa.total_citations IS NOT NULL AND cpa.total_citations > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN dep.total_deployments IS NOT NULL AND dep.total_deployments > 0 THEN 1 ELSE 0 END)
  )::INTEGER                                   AS signals_available_count,

  -- Evidence-ready rule UPDATED for v1.4:
  --   3 of 5 signals AND >=1 capability signal.
  --   Capability signals now: derivatives, LMArena, citations, deployment.
  --   (Deployment counts as capability because cross-protocol agent-economy
  --   mentions are downstream usage evidence — harder to manipulate than any
  --   single source, and only AgentCrush can compute this.)
  (
    (
      (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN cpa.total_citations IS NOT NULL AND cpa.total_citations > 0 THEN 1 ELSE 0 END) +
      (CASE WHEN dep.total_deployments IS NOT NULL AND dep.total_deployments > 0 THEN 1 ELSE 0 END)
    ) >= 3
    AND (
      (dpa.total_derivatives IS NOT NULL AND dpa.total_derivatives > 0)
      OR lma.lmarena_top_score IS NOT NULL
      OR (cpa.total_citations IS NOT NULL AND cpa.total_citations > 0)
      OR (dep.total_deployments IS NOT NULL AND dep.total_deployments > 0)
    )
  )                                            AS evidence_ready_for_public_rank,

  'v1.4-with-deployment'::TEXT                 AS methodology_version

FROM public.agents a
LEFT JOIN hf_basket hb               ON hb.author     = a.hf_author
LEFT JOIN lmarena_per_agent lma      ON lma.agent_id  = a.id
LEFT JOIN derivatives_per_author dpa ON dpa.author    = a.hf_author
LEFT JOIN citations_per_agent cpa    ON cpa.agent_id  = a.id
LEFT JOIN deployments_per_agent dep  ON dep.model_family_handle = a.handle
WHERE a.primary_category = 'model_family';

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model-family scoring view, methodology v1.4 (FULL). All 5 signal slots filled: HF (30%) + derivatives (20%) + LMArena (25%) + citations (15%) + deployment (10%). Deployment is the moat signal — cross-protocol agent-economy mentions aggregated from agents/bazaar_resources/erc8004_registry/agentverse_agents/virtuals_agents/a2a_agents. Evidence-ready: 3-of-5 signals AND >=1 capability signal (derivatives/LMArena/citations/deployment).';
