-- Step (f) — Service scoring view
-- Date: 2026-05-16
-- Depends on: 20260515_1200_add_agent_categories.sql
-- Depends on: 20260514_0530_create_agentverse_agents.sql
-- Depends on: 20260514_1716_create_a2a_agents.sql
--
-- Third category index of the Category Index Pivot. Service agents expose
-- callable endpoints — they're functional, not economic, and not knowledge
-- artefacts. The methodology measures adoption, source quality, activity,
-- protocol breadth, and cross-protocol presence.
--
-- Composite weights (Kris-approved 2026-05-16):
--   Adoption (stars OR interactions, log)     25%
--   Source quality (signal_strength OR rating) 20%
--   Activity recency                          15%
--   Protocol breadth                          15%
--   Cross-protocol presence                   15%
--   Discourse / social                        10%
--   ──────────────────────────────────────────
--   Total                                    100%
--
-- Cross-protocol presence is the moat signal (mirrors model-family deployment):
-- count of distinct service surfaces an agent appears on (A2A, Agentverse,
-- ERC-8004 registry, Bazaar). For v0, mostly 1 (the source they were promoted
-- from). v1.1 will scan ERC-8004 and Bazaar by name/repo match.
--
-- Sources:
--   agents.github_full_name → a2a_agents.repo_full_name (A2A protocol agents)
--   agents.agentverse_id   → agentverse_agents.agentverse_id (Fetch.ai)
--
-- Evidence-ready rule:
--   3 of 6 signals AND ≥1 adoption signal (stars > 0 OR interactions_count > 0).
--
-- Methodology version: v1.0-service-v0.
-- Idempotent.

DROP VIEW IF EXISTS public.agent_score_service_v1 CASCADE;

CREATE VIEW public.agent_score_service_v1 AS
WITH service_agents AS (
  SELECT
    id, handle, display_name, primary_category, secondary_categories,
    github_full_name, github_repo_url, agentverse_id,
    avatar_url, custom_background_url, website_url,
    socially_visible
  FROM public.agents
  WHERE primary_category = 'service'
     OR 'service' = ANY(secondary_categories)
),
joined AS (
  SELECT
    s.*,
    -- A2A side
    a.stars                AS a2a_stars,
    a.forks                AS a2a_forks,
    a.signal_strength      AS a2a_signal_strength,
    a.last_pushed_at       AS a2a_last_pushed_at,
    a.topics               AS a2a_topics,
    a.description          AS a2a_description,
    -- Agentverse side
    v.interactions_count   AS av_interactions,
    v.rating               AS av_rating,
    v.uptime_pct           AS av_uptime_pct,
    v.is_active            AS av_is_active,
    v.protocols            AS av_protocols,
    v.last_seen_at         AS av_last_seen_at,
    v.description          AS av_description
  FROM service_agents s
  LEFT JOIN public.a2a_agents a       ON a.repo_full_name = s.github_full_name
  LEFT JOIN public.agentverse_agents v ON v.agentverse_id  = s.agentverse_id
),
sub_scores AS (
  SELECT
    j.*,

    -- Adoption: GH stars (log) OR Agentverse interactions (log). Higher wins.
    --   a2a stars: 10 → 18, 100 → 36, 1000 → 54, 10000 → 72 (coef 18)
    --   av  interactions: 10 → 22, 100 → 44, 1000 → 66 (coef 22)
    GREATEST(
      CASE WHEN a2a_stars IS NULL OR a2a_stars <= 0 THEN 0
           ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, a2a_stars::numeric)) * 18))::INTEGER
      END,
      CASE WHEN av_interactions IS NULL OR av_interactions <= 0 THEN 0
           ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, av_interactions::numeric)) * 22))::INTEGER
      END
    ) AS adoption_score_raw,

    -- Source-quality: A2A signal_strength (0-100 already) OR Agentverse rating (0-5 → 0-100)
    GREATEST(
      COALESCE(a2a_signal_strength, 0),
      COALESCE(ROUND(av_rating * 20)::INTEGER, 0)
    ) AS source_quality_score_raw,

    -- Activity recency: log-decay since most recent activity
    CASE
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '7 days'   THEN 100
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '30 days'  THEN 80
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '90 days'  THEN 60
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '180 days' THEN 40
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '365 days' THEN 20
      ELSE NULL::INTEGER
    END AS activity_score_raw,

    -- Protocol breadth: count of topics (A2A) OR protocols (Agentverse), each up to 100
    --   1 protocol  → 25,  2 → 50,  3 → 75,  4+ → 100
    GREATEST(
      LEAST(100, COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(a2a_topics) = 'array' THEN a2a_topics ELSE '[]'::jsonb END), 0) * 25),
      LEAST(100, COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(av_protocols) = 'array' THEN av_protocols ELSE '[]'::jsonb END), 0) * 25)
    ) AS protocol_breadth_score_raw,

    -- Cross-protocol presence: count of distinct sources (A2A, Agentverse, ...)
    --   1 source → 25,  2 → 50,  3 → 75,  4 → 100
    LEAST(100, (
      (CASE WHEN a2a_signal_strength IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN av_interactions IS NOT NULL OR av_rating IS NOT NULL THEN 1 ELSE 0 END)
      -- + ERC-8004 and Bazaar will be added in v1.1 (scan by repo/name match)
    ) * 25) AS cross_protocol_score_raw,

    -- Social: v0 binary placeholder (NULL for most service agents)
    CASE
      WHEN socially_visible IS NULL THEN NULL::INTEGER
      WHEN socially_visible = TRUE THEN 100
      ELSE NULL::INTEGER
    END AS social_score_raw

  FROM joined j
)
SELECT
  id                                                  AS agent_id,
  handle,
  display_name,
  primary_category,
  secondary_categories,
  github_full_name,
  github_repo_url,
  agentverse_id,

  -- Raw service data
  a2a_stars,
  a2a_forks,
  a2a_signal_strength,
  a2a_last_pushed_at,
  av_interactions,
  av_rating,
  av_uptime_pct,
  av_is_active,
  av_protocols,
  av_last_seen_at,

  -- Sub-scores (NULL where genuinely absent so signals_available_count works)
  NULLIF(adoption_score_raw, 0)         AS adoption_score,
  NULLIF(source_quality_score_raw, 0)   AS source_quality_score,
  activity_score_raw                    AS activity_score,
  NULLIF(protocol_breadth_score_raw, 0) AS protocol_breadth_score,
  NULLIF(cross_protocol_score_raw, 0)   AS cross_protocol_score,
  social_score_raw                      AS social_score,

  -- Composite (weights: adoption 25, quality 20, recency 15, protocols 15, cross 15, social 10)
  ROUND(
    COALESCE(NULLIF(adoption_score_raw, 0), 0)         * 0.25 +
    COALESCE(NULLIF(source_quality_score_raw, 0), 0)   * 0.20 +
    COALESCE(activity_score_raw, 0)                    * 0.15 +
    COALESCE(NULLIF(protocol_breadth_score_raw, 0), 0) * 0.15 +
    COALESCE(NULLIF(cross_protocol_score_raw, 0), 0)   * 0.15 +
    COALESCE(social_score_raw, 0)                      * 0.10
  )::INTEGER AS service_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(NULLIF(adoption_score_raw, 0), 0)         * 0.25 +
      COALESCE(NULLIF(source_quality_score_raw, 0), 0)   * 0.20 +
      COALESCE(activity_score_raw, 0)                    * 0.15 +
      COALESCE(NULLIF(protocol_breadth_score_raw, 0), 0) * 0.15 +
      COALESCE(NULLIF(cross_protocol_score_raw, 0), 0)   * 0.15 +
      COALESCE(social_score_raw, 0)                      * 0.10
    ) DESC
  )::INTEGER AS rank_in_service,

  (
    (CASE WHEN NULLIF(adoption_score_raw, 0)         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NULLIF(source_quality_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN activity_score_raw                    IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NULLIF(protocol_breadth_score_raw, 0) IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NULLIF(cross_protocol_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN social_score_raw                      IS NOT NULL THEN 1 ELSE 0 END)
  )::INTEGER AS signals_available_count,

  -- Evidence-ready: 3-of-6 AND ≥1 adoption signal (stars > 0 OR interactions > 0)
  (
    (
      (CASE WHEN NULLIF(adoption_score_raw, 0)         IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NULLIF(source_quality_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN activity_score_raw                    IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NULLIF(protocol_breadth_score_raw, 0) IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NULLIF(cross_protocol_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN social_score_raw                      IS NOT NULL THEN 1 ELSE 0 END)
    ) >= 3
    AND (
      (a2a_stars IS NOT NULL AND a2a_stars > 0)
      OR (av_interactions IS NOT NULL AND av_interactions > 0)
    )
  ) AS evidence_ready_for_public_rank,

  'v1.0-service-v0'::TEXT AS methodology_version

FROM sub_scores;

COMMENT ON VIEW public.agent_score_service_v1 IS
  'Service agent scoring view, methodology v1.0. Adoption (25%) + source quality (20%) + activity recency (15%) + protocol breadth (15%) + cross-protocol presence (15%) + social (10%). Sources: A2A protocol agents (GitHub-discovered) and Agentverse (Fetch.ai). v1.1 will add ERC-8004 registry agents and Bazaar x402 endpoints as cross-protocol signals.';
