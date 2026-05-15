-- Create lmarena_models table for daily LMArena leaderboard mirror
-- Date: 2026-05-15
-- Purpose: Mirror the canonical LMArena (Chatbot Arena) Bradley-Terry leaderboard
--          into AgentCrush. Step (c.1) of the Category Index Pivot.
--
-- LMArena's BT-aggregated chat-arena ratings are the most respected model
-- capability ranking in the AI ecosystem and are the priority source signal
-- for the `model_family` agent category (column: lmarena_score in
-- agent_score_model_family_v1).
--
-- Read-only mirror. One row per model_name (canonical/normalized — lowercased,
-- date-suffix-stripped). Promotion / linkage into the `agents` table is a
-- SEPARATE downstream migration (see runtime/README.md for the planned wiring
-- of `agents.lmarena_model_keys` text[] and the view's lmarena_score
-- aggregation).
--
-- Data source:
--   Dataset: lmarena-ai/leaderboard-dataset (HuggingFace)
--   Config:  text   Split: latest
--   Schema:  model_name, organization, license, rating, rating_lower,
--            rating_upper, variance, vote_count, rank, category,
--            leaderboard_publish_date
--   Multiple rows per model — one per category (overall, hard, coding, vision,
--   style_control, etc.). We collapse on model_name and store the per-category
--   ranks in `category_ranks` JSONB; the canonical `arena_score`/`arena_rank`
--   come from the "overall" category row.
--
-- Sync worker: runtime/lmarena-adapter.mjs
-- Cron:        ops/systemd/agentcrush-lmarena-sync.{service,timer}
--              (daily 04:45 Budapest local)

CREATE TABLE IF NOT EXISTS lmarena_models (
  model_name         TEXT PRIMARY KEY,              -- normalized: lowercased, date-suffix stripped
  display_name       TEXT,                          -- original LMArena-published name
  organization       TEXT,
  arena_score        NUMERIC,                       -- Bradley-Terry rating (overall, ~700..1500)
  arena_rank         INTEGER,                       -- overall rank
  votes              INTEGER,                       -- total arena battles (overall)
  license            TEXT,
  model_url          TEXT,                          -- model card URL if available
  category_ranks     JSONB,                         -- {style_control:{rank,rating,votes}, hard:..., coding:..., vision:..., ...}
  leaderboard_publish_date TEXT,                    -- LMArena-side publish date (string from feed)

  -- Change detection + full record
  raw_payload        JSONB NOT NULL,
  payload_hash       TEXT NOT NULL,                 -- sha256 of canonical raw_payload

  -- Lifecycle timestamps
  first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at         TIMESTAMPTZ,                   -- set when row missing from current fetch
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_arena_score
  ON lmarena_models (arena_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_arena_rank
  ON lmarena_models (arena_rank ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_organization
  ON lmarena_models (organization);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_votes
  ON lmarena_models (votes DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_last_seen_at
  ON lmarena_models (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_lmarena_models_payload_hash
  ON lmarena_models (payload_hash);

-- updated_at auto-bump (mirrors pattern in hf_models / virtuals_agents migrations)
CREATE OR REPLACE FUNCTION trg_lmarena_models_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lmarena_models_touch ON lmarena_models;
CREATE TRIGGER lmarena_models_touch
  BEFORE UPDATE ON lmarena_models
  FOR EACH ROW EXECUTE FUNCTION trg_lmarena_models_touch();

COMMENT ON TABLE lmarena_models IS
  'Read-only mirror of the canonical LMArena (Chatbot Arena) Bradley-Terry leaderboard. One row per normalized model_name (lowercased, date-suffix stripped). Populated daily by runtime/lmarena-adapter.mjs from the lmarena-ai/leaderboard-dataset HF dataset (config=text, split=latest). The arena_score/arena_rank/votes columns come from the "overall" category; per-category ranks live in category_ranks JSONB. Step (c.1) of Category Index Pivot — feeds the `lmarena_score` column in agent_score_model_family_v1. No scoring impact until a separate migration plumbs the linkage via agents.lmarena_model_keys.';
