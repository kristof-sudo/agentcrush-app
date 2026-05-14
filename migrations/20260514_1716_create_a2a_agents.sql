-- A2A (Agent-to-Agent Protocol) external activity crawler — v0 (GitHub-based discovery)
-- Date: 2026-05-14
-- Purpose: Read-only mirror of GitHub repos that declare A2A protocol support
--          (via topics, dependencies, or description keywords). One row per
--          `repo_full_name` (owner/repo). Source-of-truth GitHub payload is
--          preserved in `raw_payload`; common fields are projected for indexing.
--          No scoring impact. Populated by `runtime/a2a-crawler.mjs`.
--
-- v0 scope: GitHub discovery only.
-- v1 (deferred): live A2A endpoint pinging (agent-card.json fetches, capability probes).
--
-- Evidence tier: discovery-reported (we infer A2A support from public GitHub signals).
-- Idempotent: unique on repo_full_name. Subsequent runs upsert and bump last_seen_at.

CREATE TABLE IF NOT EXISTS a2a_agents (
  id                  BIGSERIAL     PRIMARY KEY,
  repo_full_name      TEXT          UNIQUE NOT NULL,          -- "owner/repo"
  repo_url            TEXT          NOT NULL,
  name                TEXT,                                    -- repo name
  owner               TEXT,                                    -- repo owner
  description         TEXT,
  stars               INTEGER,
  forks               INTEGER,
  language            TEXT,
  topics              JSONB,                                   -- github topic list
  homepage_url        TEXT,
  discovery_method    TEXT          NOT NULL,                  -- e.g. 'topic:a2a', 'topic:agent2agent', 'dep:@google/a2a-sdk', 'description-keyword'
  last_pushed_at      TIMESTAMPTZ,                             -- github pushed_at
  signal_strength     SMALLINT,                                -- heuristic score 0-100
  raw_payload         JSONB         NOT NULL,
  payload_hash        TEXT          NOT NULL,                  -- sha256(raw_payload canonical JSON)
  first_seen_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  removed_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS a2a_agents_signal_strength_idx  ON a2a_agents (signal_strength DESC);
CREATE INDEX IF NOT EXISTS a2a_agents_stars_idx            ON a2a_agents (stars DESC);
CREATE INDEX IF NOT EXISTS a2a_agents_last_seen_idx        ON a2a_agents (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS a2a_agents_discovery_method_idx ON a2a_agents (discovery_method);

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION a2a_agents_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS a2a_agents_touch_updated_at_trg ON a2a_agents;
CREATE TRIGGER a2a_agents_touch_updated_at_trg
  BEFORE UPDATE ON a2a_agents
  FOR EACH ROW
  EXECUTE FUNCTION a2a_agents_touch_updated_at();
