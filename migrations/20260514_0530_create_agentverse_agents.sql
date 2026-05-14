-- Agentverse (Fetch.ai) /v1/search/agents normalized source table
-- Date: 2026-05-14
-- Purpose: Read-only mirror of Agentverse public agent listing
--          (POST https://agentverse.ai/v1/search/agents).
--          One row per agent (keyed by bech32 address). Source-of-truth
--          payload is preserved in `raw_payload`; common fields are projected
--          for indexing. No scoring impact. Populated by
--          runtime/agentverse-agents-adapter.mjs.
--
-- Evidence tier: marketplace-reported (Agentverse is a self-listing registry).
-- Idempotent: unique on agentverse_id. Subsequent runs upsert and bump last_seen_at.

CREATE TABLE IF NOT EXISTS agentverse_agents (
  agentverse_id        TEXT          PRIMARY KEY,         -- Fetch.ai bech32 address (e.g. agent1q...)
  name                 TEXT,
  description          TEXT,
  category             TEXT,                              -- "community" | "fetch-ai"
  address              TEXT,                              -- bech32 address (mirrors id today, kept separate for forward-compat)
  endpoint_url         TEXT,                              -- agent HTTP endpoint when published in metadata
  is_active            BOOLEAN       NOT NULL DEFAULT FALSE,
  status               TEXT,                              -- "active" / "inactive" / "unresponsive" composite
  protocols            JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- declared protocols (name, version, digest)
  runtime              TEXT,                              -- agent type: "hosted" | "local" | "mailbox" | "proxy" | "custom"
  interactions_count   INTEGER,                           -- total_interactions
  rating               NUMERIC,
  uptime_pct           NUMERIC,                           -- derived from recent_success_rate (0..100)
  tags                 JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- system_wide_tags
  raw_payload          JSONB         NOT NULL,            -- full original Agentverse agent record
  payload_hash         TEXT          NOT NULL,            -- sha256(raw_payload canonical JSON)
  first_seen_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS agentverse_agents_name_idx          ON agentverse_agents (name);
CREATE INDEX IF NOT EXISTS agentverse_agents_address_idx       ON agentverse_agents (address);
CREATE INDEX IF NOT EXISTS agentverse_agents_is_active_idx     ON agentverse_agents (is_active);
CREATE INDEX IF NOT EXISTS agentverse_agents_last_seen_idx     ON agentverse_agents (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS agentverse_agents_payload_hash_idx  ON agentverse_agents (payload_hash);

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION agentverse_agents_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agentverse_agents_touch_updated_at_trg ON agentverse_agents;
CREATE TRIGGER agentverse_agents_touch_updated_at_trg
  BEFORE UPDATE ON agentverse_agents
  FOR EACH ROW
  EXECUTE FUNCTION agentverse_agents_touch_updated_at();
