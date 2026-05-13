-- Create erc8004_registry table for daily on-chain registry sync
-- Date: 2026-05-13
-- Purpose: Walk the full ERC-8004 AgentRegistry contract on Base mainnet
--          (0x8004a169fb4a3325136eb29fa0ceb6d2e539a432) and persist every
--          token's metadata with registered_at / last_seen_at so we can
--          report on "new registrations this week" and surface protocol-level
--          discovery signals.
--
-- This is a NEW table — distinct from agent_erc8004_registrations (which holds
-- AgentCrush-agent ↔ ERC-8004-token matches found via 8004scan API). This
-- table is the raw on-chain truth: every token, regardless of whether we have
-- a matched AgentCrush agent for it.
--
-- Sync worker: runtime/erc8004-registry-sync.mjs
-- Cron:        ops/systemd/agentcrush-erc8004-registry-sync.{service,timer}
--              (daily 06:00 Budapest local)

CREATE TABLE IF NOT EXISTS erc8004_registry (
  token_id           BIGINT PRIMARY KEY,
  owner_address      TEXT NOT NULL,
  metadata_uri       TEXT,
  agent_name         TEXT,
  endpoints          JSONB,
  x402_supported     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_hash      TEXT,                       -- sha256 of canonical metadata JSON
  chain              TEXT NOT NULL DEFAULT 'base',
  registered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- set on insert, never updated
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- bumped every successful sync
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erc8004_registry_agent_name
  ON erc8004_registry (agent_name);

CREATE INDEX IF NOT EXISTS idx_erc8004_registry_owner_address
  ON erc8004_registry (owner_address);

CREATE INDEX IF NOT EXISTS idx_erc8004_registry_x402_supported
  ON erc8004_registry (x402_supported)
  WHERE x402_supported = TRUE;

CREATE INDEX IF NOT EXISTS idx_erc8004_registry_registered_at
  ON erc8004_registry (registered_at DESC);

-- updated_at auto-bump (mirrors pattern in other AgentCrush migrations)
CREATE OR REPLACE FUNCTION trg_erc8004_registry_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erc8004_registry_touch ON erc8004_registry;
CREATE TRIGGER erc8004_registry_touch
  BEFORE UPDATE ON erc8004_registry
  FOR EACH ROW EXECUTE FUNCTION trg_erc8004_registry_touch();

COMMENT ON TABLE erc8004_registry IS
  'Raw on-chain ERC-8004 AgentRegistry contents on Base mainnet. Populated daily by runtime/erc8004-registry-sync.mjs. Distinct from agent_erc8004_registrations (which holds AC-agent ↔ token matches).';
