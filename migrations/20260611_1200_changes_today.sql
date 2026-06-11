-- Migration: 20260611_1200_changes_today.sql
-- Purpose: B14 — "What changed today" surface. One public view unioning the five
--          daily change types, computed entirely from data we already collect:
--
--   rank_up / rank_down  — day-over-day global_rank moves (agent_snapshots)
--   new_agent            — agents indexed in the window (agents.created_at)
--   tier_promotion       — promoted to evidence_ranked (agents.tier_promoted_at)
--   died                 — 30-day liveness window expired in the window (agents.last_event_at)
--   resurrected          — first event after a 30+ day silence (events)
--
-- Window is 7 days; consumers (/changes page, /api/changes/v1, /changes.xml,
-- homepage strip) filter to 1 day for "today" sections.
--
-- The view is intentionally SECURITY DEFINER (Postgres view default): it exposes
-- a public aggregate over agent_snapshots, which is service-role-only at the row
-- level. Anon gets SELECT on the view only.
--
-- Apply: Supabase SQL editor (copy-paste)

-- ── 1. Supporting index for resurrection lookups ─────────────────────────────
CREATE INDEX IF NOT EXISTS events_agent_created_idx
  ON events (agent_id, created_at DESC);

-- ── 2. The view ───────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW changes_today_v1 AS
WITH
-- Day-over-day rank moves across the last 8 snapshot days.
-- LAG pairs each snapshot with the agent's previous one, so the feed has one
-- entry per move per day. Noise gates: score > 0 and |delta| >= 5.
rank_pairs AS (
  SELECT
    s.agent_id,
    s.snapshot_date,
    s.rank,
    s.score,
    LAG(s.rank)          OVER (PARTITION BY s.agent_id ORDER BY s.snapshot_date) AS prev_rank,
    LAG(s.snapshot_date) OVER (PARTITION BY s.agent_id ORDER BY s.snapshot_date) AS prev_date
  FROM agent_snapshots s
  WHERE s.snapshot_date >= CURRENT_DATE - 8
),
rank_moves AS (
  SELECT *
  FROM rank_pairs
  WHERE prev_rank IS NOT NULL
    AND rank IS NOT NULL
    AND rank <> prev_rank
    AND score > 0
    AND ABS(prev_rank - rank) >= 5
    AND snapshot_date >= CURRENT_DATE - 7
),
-- First event per agent inside the window…
recent_first_event AS (
  SELECT e.agent_id, MIN(e.created_at) AS first_recent
  FROM events e
  WHERE e.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY e.agent_id
),
-- …that follows a 30+ day silence (and the agent had a prior life to return from).
resurrections AS (
  SELECT rf.agent_id, rf.first_recent
  FROM recent_first_event rf
  WHERE EXISTS (
          SELECT 1 FROM events p
          WHERE p.agent_id = rf.agent_id AND p.created_at < rf.first_recent)
    AND NOT EXISTS (
          SELECT 1 FROM events p
          WHERE p.agent_id = rf.agent_id
            AND p.created_at < rf.first_recent
            AND p.created_at > rf.first_recent - INTERVAL '30 days')
)

-- rank moves ------------------------------------------------------------------
SELECT
  CASE WHEN m.rank < m.prev_rank THEN 'rank_up' ELSE 'rank_down' END AS change_type,
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  jsonb_build_object(
    'rank_from', m.prev_rank,
    'rank_to',   m.rank,
    'delta',     m.prev_rank - m.rank,
    'score',     m.score
  ) AS detail,
  (m.snapshot_date::timestamptz + INTERVAL '2 hours') AS happened_at
FROM rank_moves m
JOIN agents a ON a.id = m.agent_id

UNION ALL

-- new agents indexed ------------------------------------------------------------
SELECT
  'new_agent',
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  jsonb_build_object('source', a.verified_source),
  a.created_at
FROM agents a
WHERE a.created_at >= NOW() - INTERVAL '7 days'

UNION ALL

-- tier promotions ----------------------------------------------------------------
SELECT
  'tier_promotion',
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  jsonb_build_object('promoted_to', a.tier),
  a.tier_promoted_at
FROM agents a
WHERE a.tier = 'evidence_ranked'
  AND a.tier_promoted_at >= NOW() - INTERVAL '7 days'

UNION ALL

-- died: the 30-day liveness window (Ghost Index rule) expired inside the window --
SELECT
  'died',
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  jsonb_build_object('last_event_at', a.last_event_at),
  a.last_event_at + INTERVAL '30 days'
FROM agents a
WHERE (a.activity_status IS DISTINCT FROM 'active')
  AND a.last_event_at IS NOT NULL
  AND a.last_event_at + INTERVAL '30 days' >= NOW() - INTERVAL '7 days'
  AND a.last_event_at + INTERVAL '30 days' < NOW()

UNION ALL

-- resurrected: new event after 30+ days of silence --------------------------------
SELECT
  'resurrected',
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  jsonb_build_object('returned_at', r.first_recent),
  r.first_recent
FROM resurrections r
JOIN agents a ON a.id = r.agent_id;

-- ── 3. Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT ON changes_today_v1 TO anon, authenticated;
