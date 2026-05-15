-- Step (c.1.b) — Plumb lmarena_score into agent_score_model_family_v1
-- Date: 2026-05-15
-- Depends on: 20260515_1137_create_lmarena_models.sql (creates lmarena_models)
-- Depends on: 20260515_1600_model_family_scoring_view.sql (creates v1 view)
-- Kris-approved 2026-05-15 (LMArena normalization decisions confirmed)
--
-- Adds `agents.lmarena_model_keys TEXT[]` — the list of normalized LMArena
-- model_name keys that map to this AgentCrush model_family agent. One agent
-- can link to multiple LMArena variants (e.g. Hermes-3-405B + Hermes-3-70B).
--
-- Backfills the 3 seed agents:
--   nousresearch_hermes_agent → ['hermes-3-llama-3.1-405b', 'hermes-3-llama-3.1-70b', 'hermes-3-llama-3.1-8b']
--   deepseek → ['deepseek-v3', 'deepseek-r1', 'deepseek-v2.5']
--   gemini → ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro']
--
-- (Keys may not exist in `lmarena_models` until adapter populates; LEFT JOIN
-- handles missing rows gracefully — score stays NULL until match.)
--
-- Replaces `agent_score_model_family_v1` view with the same shape but
-- `lmarena_score` is now computed from real LMArena BT ratings instead of
-- NULL. Mapping: max(arena_score) across listed keys, scaled 0-100 via
--   LEAST(100, ROUND((MAX(arena_score) - 700) / 8))
-- where 700 → 0 (chance) and 1500 → 100 (top BT). The 1500 ceiling is
-- chosen to map current Anthropic Claude tops (~1497) very near 100.
--
-- Methodology version bumps: v1.0-hf-only → v1.1-hf+lmarena.
--
-- After this migration:
--   * Hermes / DeepSeek / Gemini will have hf_score (when HF data arrives)
--     PLUS lmarena_score (when LMArena data is there).
--   * Evidence-ready rule needs 3-of-5 signals AND ≥1 capability signal
--     (derivatives, lmarena, or citations). With 2 signals (HF + LMArena),
--     they still won't be evidence-ready. Derivatives (step c.2) is the
--     unlock — at that point, the 3-of-5 with LMArena=capability passes.
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add agents.lmarena_model_keys column
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS lmarena_model_keys TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.agents.lmarena_model_keys IS
  'Array of normalized LMArena model_name keys that map to this AgentCrush agent. One agent can link to multiple LMArena variants (e.g. Hermes-3-405B, Hermes-3-70B). The model_family scoring view aggregates MAX(arena_score) across these keys. Empty array means no LMArena linkage (yet).';

CREATE INDEX IF NOT EXISTS idx_agents_lmarena_model_keys_gin
  ON public.agents USING GIN (lmarena_model_keys);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Backfill seeds — Kris-approved normalization, lowercase, date-stripped
-- ──────────────────────────────────────────────────────────────────────────────
--
-- Seed keys based on the model variants typically present in LMArena's
-- public leaderboard for each org. The adapter normalizes by lowercasing
-- and stripping trailing -YYYY-MM-DD / _YYYYMMDD date suffixes, but keeps
-- "-thinking" / "-instruct" / param-size suffixes intact (they're distinct
-- models with distinct BT scores).
--
-- These keys may not all exist in `lmarena_models` immediately — the LEFT
-- JOIN in the view returns NULL for missing keys. As soon as the adapter
-- picks up new variants, they auto-link.

UPDATE public.agents
   SET lmarena_model_keys = ARRAY[
     'hermes-3-llama-3.1-405b',
     'hermes-3-llama-3.1-70b',
     'hermes-3-llama-3.1-8b',
     'hermes-3-llama-3.2-3b'
   ]
 WHERE handle = 'nousresearch_hermes_agent';

UPDATE public.agents
   SET lmarena_model_keys = ARRAY[
     'deepseek-v3',
     'deepseek-r1',
     'deepseek-v2.5',
     'deepseek-coder-v2'
   ]
 WHERE handle = 'deepseek';

UPDATE public.agents
   SET lmarena_model_keys = ARRAY[
     'gemini-2.5-pro',
     'gemini-2.5-flash',
     'gemini-1.5-pro',
     'gemini-1.5-flash'
   ]
 WHERE handle = 'gemini';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Drop old view + recreate with lmarena_score plumbed
-- ──────────────────────────────────────────────────────────────────────────────

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
    agg.author,
    agg.total_downloads,
    agg.total_likes,
    agg.model_count,
    agg.top_model_downloads,
    agg.top_model_likes,
    agg.most_recent_modified,
    agg.gated_pct,

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
-- NEW IN v1.1: per-agent LMArena aggregation across listed keys
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

  -- LMArena raw aggregates (transparency)
  lma.lmarena_top_score                       AS lmarena_top_arena_score,
  lma.lmarena_matched_count,
  lma.lmarena_total_votes,

  -- HF sub-scores
  COALESCE(hb.hf_downloads_score, 0)::INTEGER  AS hf_downloads_score,
  COALESCE(hb.hf_likes_score, 0)::INTEGER      AS hf_likes_score,
  COALESCE(hb.hf_recency_score, 0)::INTEGER    AS hf_recency_score,
  COALESCE(hb.hf_breadth_score, 0)::INTEGER    AS hf_breadth_score,
  COALESCE(hb.hf_top_model_score, 0)::INTEGER  AS hf_top_model_score,

  -- Top-level signal slices
  COALESCE(hb.hf_score, 0)::INTEGER            AS hf_score,
  NULL::INTEGER                                AS derivatives_score,
  -- LMArena: NULL if no keys matched, else map (700..1500) → (0..100)
  CASE
    WHEN lma.lmarena_top_score IS NULL THEN NULL::INTEGER
    ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))::INTEGER
  END                                          AS lmarena_score,
  NULL::INTEGER                                AS citations_score,
  NULL::INTEGER                                AS social_score,

  -- Composite (NULL slices count as 0)
  ROUND(
    COALESCE(hb.hf_score, 0)                                       * 0.30 +
    0                                                              * 0.20 +  -- derivatives
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
      0 * 0.20 +
      COALESCE(
        CASE WHEN lma.lmarena_top_score IS NULL THEN 0
             ELSE LEAST(100, GREATEST(0, ROUND((lma.lmarena_top_score - 700) / 8)))
        END, 0
      ) * 0.25 +
      0 * 0.15 +
      0 * 0.10
    ) DESC
  )::INTEGER                                   AS rank_in_model_family,

  -- Signals available count (HF + LMArena if matched)
  (
    (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
    0 +  -- derivatives_score IS NOT NULL
    (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
    0 +  -- citations_score IS NOT NULL
    0    -- social_score IS NOT NULL
  )::INTEGER                                   AS signals_available_count,

  -- Evidence-ready rule (Kris 2026-05-15):
  --   3 of 5 signals present AND ≥1 of (derivatives, LMArena, citations)
  -- With HF + LMArena only, we still have just 2 of 5 → false until derivatives lands.
  (
    (
      (CASE WHEN COALESCE(hb.hf_score, 0) > 0 THEN 1 ELSE 0 END) +
      0 +
      (CASE WHEN lma.lmarena_top_score IS NOT NULL THEN 1 ELSE 0 END) +
      0 +
      0
    ) >= 3
    AND (
      FALSE  -- derivatives_score IS NOT NULL
      OR lma.lmarena_top_score IS NOT NULL
      OR FALSE  -- citations_score IS NOT NULL
    )
  )                                            AS evidence_ready_for_public_rank,

  'v1.1-hf+lmarena'::TEXT                      AS methodology_version

FROM public.agents a
LEFT JOIN hf_basket hb           ON hb.author     = a.hf_author
LEFT JOIN lmarena_per_agent lma  ON lma.agent_id  = a.id
WHERE a.primary_category = 'model_family';

COMMENT ON VIEW public.agent_score_model_family_v1 IS
  'Model-family category scoring view, methodology v1.1. Plumbs HF (per author) and LMArena (per agent.lmarena_model_keys array) signals. Reserved NULL columns for derivatives/citations/social — view will be replaced again when those adapters ship. evidence_ready_for_public_rank requires 3-of-5 signals AND >=1 of (derivatives, LMArena, citations). With current signals (HF + LMArena), still needs derivatives to pass 3-of-5.';
