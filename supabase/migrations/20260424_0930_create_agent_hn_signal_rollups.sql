-- agent_hn_signal_rollups: read-only Hacker News evidence rollups per agent.
-- Analysis only. Does not write agent rows or affect rankings.

CREATE VIEW agent_hn_signal_rollups AS
WITH relevant AS (
  SELECT
    agent_id,
    source_url,
    title,
    hn_created_at,
    COALESCE(points, 0) AS points,
    COALESCE(num_comments, 0) AS num_comments,
    COALESCE(strength, 0) AS strength
  FROM agent_hn_signals
  WHERE is_relevant = TRUE
),
rollups AS (
  SELECT
    agent_id,
    COUNT(*) AS relevant_mentions,
    COALESCE(SUM(points), 0) AS total_points,
    COALESCE(SUM(num_comments), 0) AS total_comments,
    COALESCE(SUM(strength), 0) AS raw_strength,
    ROUND(LN(1 + COALESCE(SUM(strength), 0))::numeric, 4) AS log_strength,
    COUNT(*) FILTER (
      WHERE hn_created_at >= NOW() - INTERVAL '90 days'
    ) AS recent_90d_mentions,
    COALESCE(SUM(points) FILTER (
      WHERE hn_created_at >= NOW() - INTERVAL '90 days'
    ), 0) AS recent_90d_points,
    COALESCE(SUM(num_comments) FILTER (
      WHERE hn_created_at >= NOW() - INTERVAL '90 days'
    ), 0) AS recent_90d_comments,
    COALESCE(SUM(strength) FILTER (
      WHERE hn_created_at >= NOW() - INTERVAL '90 days'
    ), 0) AS recent_90d_strength,
    ROUND(LN(1 + COALESCE(SUM(strength) FILTER (
      WHERE hn_created_at >= NOW() - INTERVAL '90 days'
    ), 0))::numeric, 4) AS recent_90d_log_strength,
    MAX(hn_created_at) AS newest_hn_item_at
  FROM relevant
  GROUP BY agent_id
),
false_positives AS (
  SELECT
    agent_id,
    COUNT(*) AS false_positive_mentions
  FROM agent_hn_signals
  WHERE is_relevant = FALSE
  GROUP BY agent_id
),
strongest AS (
  SELECT
    agent_id,
    hn_created_at AS strongest_hn_item_at,
    title AS strongest_hn_item_title,
    source_url AS strongest_hn_item_url,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id
      ORDER BY strength DESC, hn_created_at DESC NULLS LAST, title ASC NULLS LAST
    ) AS rn
  FROM relevant
)
SELECT
  rollups.agent_id,
  rollups.relevant_mentions,
  COALESCE(false_positives.false_positive_mentions, 0) AS false_positive_mentions,
  rollups.total_points,
  rollups.total_comments,
  rollups.raw_strength,
  rollups.log_strength,
  rollups.recent_90d_mentions,
  rollups.recent_90d_points,
  rollups.recent_90d_comments,
  rollups.recent_90d_strength,
  rollups.recent_90d_log_strength,
  rollups.newest_hn_item_at,
  strongest.strongest_hn_item_at,
  strongest.strongest_hn_item_title,
  strongest.strongest_hn_item_url,
  LEAST(
    100,
    ROUND((rollups.recent_90d_log_strength * 20 + rollups.log_strength * 5)::numeric, 2)
  ) AS hn_signal_score_candidate
FROM rollups
LEFT JOIN false_positives ON false_positives.agent_id = rollups.agent_id
LEFT JOIN strongest ON strongest.agent_id = rollups.agent_id AND strongest.rn = 1;
