-- Service methodology v1.1: replace cross_protocol_score with forks_score
-- Date: 2026-05-16
-- Depends on: 20260516_1700_service_scoring_view.sql
--
-- Replaces the v1.0 cross_protocol_score placeholder (which counted distinct
-- surfaces × 25 and was uniformly 25 for all 28 service agents because they
-- all came from A2A only) with forks_score — community engagement vs passive
-- starring.
--
-- Why forks > cross-protocol for v1.1:
--   Forks ≠ stars. Star = "interested." Fork = "actively using or modifying."
--   For service agents that expose callable code, fork count is a better
--   adoption signal than star count. Top 15 A2A repos range 38 → 2,399 forks.
--
-- Scoring formula:
--   forks_score = LEAST(100, ROUND( LOG(10, GREATEST(1, forks)) * 22 ))
--   10 → 22,  100 → 44,  1000 → 66,  10000 → 88
--
-- Composite weights unchanged (adoption 25 / quality 20 / activity 15 /
-- protocols 15 / forks 15 / social 10). Forks takes the 15% slot previously
-- labeled cross-protocol. Cross-protocol presence parked as v1.2+ signal.
--
-- Methodology version: v1.0-service-v0 → v1.1-service-forks.
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
  WHERE primary_category = 'service' OR 'service' = ANY(secondary_categories)
),
joined AS (
  SELECT
    s.*,
    a.stars                AS a2a_stars,
    a.forks                AS a2a_forks,
    a.signal_strength      AS a2a_signal_strength,
    a.last_pushed_at       AS a2a_last_pushed_at,
    a.topics               AS a2a_topics,
    v.interactions_count   AS av_interactions,
    v.rating               AS av_rating,
    v.uptime_pct           AS av_uptime_pct,
    v.is_active            AS av_is_active,
    v.protocols            AS av_protocols,
    v.last_seen_at         AS av_last_seen_at
  FROM service_agents s
  LEFT JOIN public.a2a_agents a       ON a.repo_full_name = s.github_full_name
  LEFT JOIN public.agentverse_agents v ON v.agentverse_id  = s.agentverse_id
),
sub_scores AS (
  SELECT
    j.*,

    GREATEST(
      CASE WHEN a2a_stars IS NULL OR a2a_stars <= 0 THEN 0
           ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, a2a_stars::numeric)) * 18))::INTEGER
      END,
      CASE WHEN av_interactions IS NULL OR av_interactions <= 0 THEN 0
           ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, av_interactions::numeric)) * 22))::INTEGER
      END
    ) AS adoption_score_raw,

    GREATEST(
      COALESCE(a2a_signal_strength, 0),
      COALESCE(ROUND(av_rating * 20)::INTEGER, 0)
    ) AS source_quality_score_raw,

    CASE
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '7 days'   THEN 100
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '30 days'  THEN 80
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '90 days'  THEN 60
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '180 days' THEN 40
      WHEN GREATEST(a2a_last_pushed_at, av_last_seen_at) > NOW() - INTERVAL '365 days' THEN 20
      ELSE NULL::INTEGER
    END AS activity_score_raw,

    GREATEST(
      LEAST(100, COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(a2a_topics) = 'array' THEN a2a_topics ELSE '[]'::jsonb END), 0) * 25),
      LEAST(100, COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(av_protocols) = 'array' THEN av_protocols ELSE '[]'::jsonb END), 0) * 25)
    ) AS protocol_breadth_score_raw,

    -- NEW v1.1: Forks score — replaces cross-protocol placeholder
    CASE WHEN a2a_forks IS NULL OR a2a_forks <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, a2a_forks::numeric)) * 22))::INTEGER
    END AS forks_score_raw,

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

  NULLIF(adoption_score_raw, 0)         AS adoption_score,
  NULLIF(source_quality_score_raw, 0)   AS source_quality_score,
  activity_score_raw                    AS activity_score,
  NULLIF(protocol_breadth_score_raw, 0) AS protocol_breadth_score,
  forks_score_raw                       AS forks_score,
  social_score_raw                      AS social_score,

  -- Composite (weights: adoption 25, quality 20, recency 15, protocols 15, forks 15, social 10)
  ROUND(
    COALESCE(NULLIF(adoption_score_raw, 0), 0)         * 0.25 +
    COALESCE(NULLIF(source_quality_score_raw, 0), 0)   * 0.20 +
    COALESCE(activity_score_raw, 0)                    * 0.15 +
    COALESCE(NULLIF(protocol_breadth_score_raw, 0), 0) * 0.15 +
    COALESCE(forks_score_raw, 0)                       * 0.15 +
    COALESCE(social_score_raw, 0)                      * 0.10
  )::INTEGER AS service_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(NULLIF(adoption_score_raw, 0), 0)         * 0.25 +
      COALESCE(NULLIF(source_quality_score_raw, 0), 0)   * 0.20 +
      COALESCE(activity_score_raw, 0)                    * 0.15 +
      COALESCE(NULLIF(protocol_breadth_score_raw, 0), 0) * 0.15 +
      COALESCE(forks_score_raw, 0)                       * 0.15 +
      COALESCE(social_score_raw, 0)                      * 0.10
    ) DESC
  )::INTEGER AS rank_in_service,

  (
    (CASE WHEN NULLIF(adoption_score_raw, 0)         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NULLIF(source_quality_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN activity_score_raw                    IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NULLIF(protocol_breadth_score_raw, 0) IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN forks_score_raw                       IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN social_score_raw                      IS NOT NULL THEN 1 ELSE 0 END)
  )::INTEGER AS signals_available_count,

  (
    (
      (CASE WHEN NULLIF(adoption_score_raw, 0)         IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NULLIF(source_quality_score_raw, 0)   IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN activity_score_raw                    IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NULLIF(protocol_breadth_score_raw, 0) IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN forks_score_raw                       IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN social_score_raw                      IS NOT NULL THEN 1 ELSE 0 END)
    ) >= 3
    AND (
      (a2a_stars IS NOT NULL AND a2a_stars > 0)
      OR (av_interactions IS NOT NULL AND av_interactions > 0)
      OR (a2a_forks IS NOT NULL AND a2a_forks > 0)
    )
  ) AS evidence_ready_for_public_rank,

  'v1.1-service-forks'::TEXT AS methodology_version

FROM sub_scores;

COMMENT ON VIEW public.agent_score_service_v1 IS
  'Service agent scoring view, methodology v1.1. Replaces v1.0 cross-protocol placeholder with forks_score (community engagement vs passive starring). Weights: adoption 25% + source quality 20% + activity recency 15% + protocol breadth 15% + forks 15% + social 10%. Cross-protocol presence is tracked separately in cross_protocol_presence table for future use.';
