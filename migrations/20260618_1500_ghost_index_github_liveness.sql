-- Recompute the Ghost Index from REAL liveness. The old definition used
-- activity_status (a stale cached flag) + last_event_at, which is null for ~88%
-- of agents — so it badly UNDERSTATED liveness (17.4%). We now have
-- github_pushed_at (real code activity, refreshed daily by the
-- github-liveness-refresh worker). Add it to the "alive" signal.
--
-- "Alive" = github pushed in last 30 days  OR  activity_status='active'
--            OR  last_event_at within last 30 days. Honest figure ≈ 44%.
--
-- Date: 2026-06-18. Recreates the ghost_index_live view only. Non-destructive.

CREATE OR REPLACE VIEW ghost_index_live AS
WITH counts AS (
  SELECT
    COUNT(*)                                                        AS total_agents,
    COUNT(*) FILTER (
      WHERE (github_pushed_at IS NOT NULL AND github_pushed_at > NOW() - INTERVAL '30 days')
         OR activity_status = 'active'
         OR (last_event_at IS NOT NULL AND last_event_at > NOW() - INTERVAL '30 days')
    )                                                               AS alive_agents,
    COUNT(*) FILTER (
      WHERE (github_pushed_at IS NULL OR github_pushed_at <= NOW() - INTERVAL '30 days')
        AND (activity_status IS DISTINCT FROM 'active')
        AND (last_event_at IS NULL OR last_event_at <= NOW() - INTERVAL '30 days')
    )                                                               AS ghost_agents
  FROM agents
),
by_category AS (
  SELECT
    primary_category,
    COUNT(*)                                                        AS total,
    COUNT(*) FILTER (
      WHERE (github_pushed_at IS NOT NULL AND github_pushed_at > NOW() - INTERVAL '30 days')
         OR activity_status = 'active'
         OR (last_event_at IS NOT NULL AND last_event_at > NOW() - INTERVAL '30 days')
    )                                                               AS alive
  FROM agents
  WHERE primary_category IS NOT NULL
  GROUP BY primary_category
),
tier_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE tier = 'evidence_ranked')               AS evidence_ranked,
    COUNT(*) FILTER (WHERE tier = 'indexed')                       AS indexed_only
  FROM agents
)
SELECT
  c.total_agents,
  c.alive_agents,
  c.ghost_agents,
  ROUND(c.alive_agents::NUMERIC / NULLIF(c.total_agents,0) * 100, 1) AS liveness_score,
  (
    SELECT jsonb_object_agg(
      bc.primary_category,
      jsonb_build_object(
        'total', bc.total,
        'alive', bc.alive,
        'liveness', ROUND(bc.alive::NUMERIC / NULLIF(bc.total,0) * 100, 1)
      )
    )
    FROM by_category bc
  )                                                                 AS category_breakdown,
  t.evidence_ranked,
  t.indexed_only,
  NOW()                                                             AS computed_at
FROM counts c, tier_counts t;
