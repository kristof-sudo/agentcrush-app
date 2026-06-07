-- Migration: 20260607_1400_ghost_index.sql
-- Purpose: Ghost Index infrastructure — daily liveness score storage + views
--
-- The Ghost Index measures what % of indexed agents show signs of life.
-- "Alive" = activity_status = 'active' OR last_event_at within last 30 days.
-- Published daily. Only AgentCrush can produce this — it requires the full index.
--
-- Apply: Supabase SQL editor (copy-paste)

-- ── 1. Daily snapshot table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ghost_index_daily (
  id                  BIGSERIAL PRIMARY KEY,
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  liveness_score      NUMERIC(5,1) NOT NULL,   -- % alive, 0–100
  total_agents        INTEGER NOT NULL,
  alive_agents        INTEGER NOT NULL,
  ghost_agents        INTEGER NOT NULL,
  -- per-category breakdown (JSONB for flexibility)
  category_breakdown  JSONB NOT NULL DEFAULT '{}',
  -- tier breakdown
  evidence_ranked     INTEGER,
  indexed_only        INTEGER,
  -- methodology version
  methodology_version TEXT NOT NULL DEFAULT 'v1.0',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date)
);

ALTER TABLE ghost_index_daily ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ghost_index_daily' AND policyname = 'anon_read_ghost_index'
  ) THEN
    CREATE POLICY "anon_read_ghost_index" ON ghost_index_daily FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ghost_index_daily' AND policyname = 'service_write_ghost_index'
  ) THEN
    CREATE POLICY "service_write_ghost_index" ON ghost_index_daily FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ── 2. Live computation view ──────────────────────────────────────────────────
-- Used by the worker to INSERT the daily snapshot and by the API for real-time.
CREATE OR REPLACE VIEW ghost_index_live AS
WITH counts AS (
  SELECT
    COUNT(*)                                                        AS total_agents,
    COUNT(*) FILTER (
      WHERE activity_status = 'active'
         OR (last_event_at IS NOT NULL
             AND last_event_at > NOW() - INTERVAL '30 days')
    )                                                               AS alive_agents,
    COUNT(*) FILTER (
      WHERE (activity_status IS DISTINCT FROM 'active')
        AND (last_event_at IS NULL
             OR last_event_at <= NOW() - INTERVAL '30 days')
    )                                                               AS ghost_agents
  FROM agents
),
by_category AS (
  SELECT
    primary_category,
    COUNT(*)                                                        AS total,
    COUNT(*) FILTER (
      WHERE activity_status = 'active'
         OR (last_event_at IS NOT NULL
             AND last_event_at > NOW() - INTERVAL '30 days')
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

-- ── 3. Seed today's snapshot ──────────────────────────────────────────────────
INSERT INTO ghost_index_daily (
  snapshot_date, liveness_score, total_agents, alive_agents, ghost_agents,
  category_breakdown, evidence_ranked, indexed_only
)
SELECT
  CURRENT_DATE,
  liveness_score,
  total_agents,
  alive_agents,
  ghost_agents,
  category_breakdown,
  evidence_ranked,
  indexed_only
FROM ghost_index_live
ON CONFLICT (snapshot_date) DO UPDATE SET
  liveness_score     = EXCLUDED.liveness_score,
  total_agents       = EXCLUDED.total_agents,
  alive_agents       = EXCLUDED.alive_agents,
  ghost_agents       = EXCLUDED.ghost_agents,
  category_breakdown = EXCLUDED.category_breakdown,
  evidence_ranked    = EXCLUDED.evidence_ranked,
  indexed_only       = EXCLUDED.indexed_only,
  computed_at        = NOW();

-- ── 4. Notify PostgREST ───────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT snapshot_date, liveness_score, total_agents, alive_agents, ghost_agents
-- FROM ghost_index_daily ORDER BY snapshot_date DESC LIMIT 5;
