-- 20260704_0430_agent_bt_scores.sql
--
-- B29 — BT Phase 1: shadow Bradley-Terry scoring infrastructure
-- Kris-approved 2026-07-02. Deliverable: rank confidence intervals, not a rival rank.
--
-- Creates:
--   agent_bt_scores        — weekly BT fit results per agent per category
--   agent_score_v3_bt_preview — shadow view: v2.c rank vs BT rank, delta column
--
-- Zero public surface. Shadow period: 4 Sundays, then Kris decides on publishing
-- error bars. No /methodology changes until shadow validates.
--
-- Populated by: runtime/bt-scoring-worker.mjs (weekly Sunday 09:30 UTC)
-- Timer: ops/systemd/agentcrush-bt-scoring.timer
--
-- Safe to re-run (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE VIEW).
-- Apply: paste into Supabase SQL editor and run.

-- 1) the scores table ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_bt_scores (
  id          bigserial PRIMARY KEY,
  agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  category    text NOT NULL,
  bt_score    numeric(8, 4),    -- normalized to [0, 100]; higher = stronger
  bt_rank     integer,          -- 1 = strongest in category fit
  pair_count  integer,          -- total pairwise comparison days involving this agent
  fit_date    date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_bt_scores_agent_cat_date_idx
  ON agent_bt_scores (agent_id, category, fit_date);

CREATE INDEX IF NOT EXISTS agent_bt_scores_category_date_idx
  ON agent_bt_scores (category, fit_date DESC);

-- Row-level security: anon cannot read (internal shadow table only).
-- Service-role key bypasses RLS, which is the only writer/reader.
ALTER TABLE agent_bt_scores ENABLE ROW LEVEL SECURITY;

-- 2) the shadow preview view -----------------------------------------------------------
-- Joins the latest BT fit (most-recent fit_date for developer category) with the
-- existing v2.c rank comparison view so a Kris query can instantly see divergence.
-- Internal only — no route or API surfaces this.
CREATE OR REPLACE VIEW agent_score_v3_bt_preview AS
SELECT
  v.agent_id,
  v.handle,
  ROUND(v.score_v2_c_candidate, 2)            AS score_v2c,
  v.rank_v2_c::integer                         AS rank_v2c,
  ROUND(b.bt_score, 4)                         AS bt_score,
  b.bt_rank,
  b.pair_count,
  b.fit_date,
  b.bt_rank - v.rank_v2_c::integer             AS bt_vs_v2c_delta
FROM agent_score_v2_rank_comparison v
LEFT JOIN agent_bt_scores b
  ON  b.agent_id = v.agent_id
  AND b.category = 'developer'
  AND b.fit_date = (
    SELECT MAX(fit_date) FROM agent_bt_scores WHERE category = 'developer'
  )
ORDER BY b.bt_rank NULLS LAST, v.rank_v2_c NULLS LAST;
