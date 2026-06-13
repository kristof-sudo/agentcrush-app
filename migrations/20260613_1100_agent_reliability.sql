-- Migration: 20260613_1100_agent_reliability.sql
-- Purpose: Agent Reliability Score — per-agent rolling uptime, computed HONESTLY.
--
-- Design note (why it's built this way): the original idea assumed reliability
-- could be computed from existing data. Investigation (2026-06-13) showed it
-- can't, without lying:
--   - agent_snapshots has NO per-day liveness flag (only score/rank/signals)
--   - ghost_index_daily is aggregate-only (one liveness % for the whole index)
--   - the events table is too sparse/bursty to mean "alive" (CrewAI, the #1
--     dev agent, has zero events for a month — building reliability from events
--     would make the best agents read ~0%, the soft-404 mistake all over again)
--
-- So reliability is collected FORWARD from a real per-agent daily liveness
-- signal (the Ghost Index rule, recorded each day by the snapshot worker).
-- Today is seeded honestly (today's liveness == current liveness). The view
-- exposes a `coverage` field so consumers never present a misleading number
-- before enough history has accrued.
--
-- Apply: Supabase SQL editor (copy-paste). Degrades gracefully — the column is
-- nullable and the snapshot worker fills it from the next run.

-- ── 1. Per-day liveness flag on the snapshot table ────────────────────────────
ALTER TABLE agent_snapshots
  ADD COLUMN IF NOT EXISTS is_alive BOOLEAN;

-- Seed TODAY's already-written rows honestly: today's liveness IS current
-- liveness (Ghost Index rule). Historical rows stay NULL — we have no honest
-- liveness for past days, and the view ignores NULLs.
UPDATE agent_snapshots s
SET is_alive = (
  a.activity_status = 'active'
  OR (a.last_event_at IS NOT NULL AND a.last_event_at > NOW() - INTERVAL '30 days')
)
FROM agents a
WHERE s.agent_id = a.id
  AND s.snapshot_date = CURRENT_DATE
  AND s.is_alive IS NULL;

-- ── 2. Reliability view ───────────────────────────────────────────────────────
-- reliability_Nd = days the agent was alive / days tracked, within the window.
-- "Days tracked" counts only days with a recorded is_alive (forward collection),
-- so the metric is honest from day one and fully meaningful once coverage='full'.
CREATE OR REPLACE VIEW agent_reliability_v1 AS
WITH windows AS (
  SELECT
    s.agent_id,
    COUNT(*) FILTER (WHERE s.is_alive IS NOT NULL AND s.snapshot_date > CURRENT_DATE - 30)                        AS tracked_30d,
    COUNT(*) FILTER (WHERE s.is_alive IS TRUE     AND s.snapshot_date > CURRENT_DATE - 30)                        AS alive_30d,
    COUNT(*) FILTER (WHERE s.is_alive IS NOT NULL AND s.snapshot_date > CURRENT_DATE - 90)                        AS tracked_90d,
    COUNT(*) FILTER (WHERE s.is_alive IS TRUE     AND s.snapshot_date > CURRENT_DATE - 90)                        AS alive_90d,
    MAX(s.snapshot_date) FILTER (WHERE s.is_alive IS TRUE)                                                        AS last_alive_date
  FROM agent_snapshots s
  GROUP BY s.agent_id
)
SELECT
  a.id            AS agent_id,
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  -- Honest TODAY signals (single-valued, from the live agents row):
  (a.activity_status = 'active'
   OR (a.last_event_at IS NOT NULL AND a.last_event_at > NOW() - INTERVAL '30 days')) AS currently_alive,
  CASE WHEN a.last_event_at IS NULL THEN NULL
       ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - a.last_event_at)) / 86400)::int END      AS days_since_active,
  -- Accruing rolling uptime (forward-collected):
  COALESCE(w.tracked_30d, 0) AS days_tracked_30d,
  COALESCE(w.alive_30d, 0)   AS days_alive_30d,
  CASE WHEN COALESCE(w.tracked_30d,0) > 0
       THEN ROUND(w.alive_30d::numeric / w.tracked_30d * 100, 1) END                   AS reliability_30d,
  COALESCE(w.tracked_90d, 0) AS days_tracked_90d,
  CASE WHEN COALESCE(w.tracked_90d,0) > 0
       THEN ROUND(w.alive_90d::numeric / w.tracked_90d * 100, 1) END                   AS reliability_90d,
  w.last_alive_date,
  -- Transparency: never let a consumer present a shallow number as if it were full.
  CASE
    WHEN COALESCE(w.tracked_30d,0) >= 28 THEN 'full'
    WHEN COALESCE(w.tracked_30d,0) >= 7  THEN 'partial'
    ELSE 'building'
  END AS coverage
FROM agents a
LEFT JOIN windows w ON w.agent_id = a.id;

GRANT SELECT ON agent_reliability_v1 TO anon, authenticated;
