-- agent_erc8004_registrations: read-only storage of ERC-8004 identity registry
-- matches for existing AgentCrush agents.
--
-- Populated by: node scripts/sync-erc8004-registrations.mjs --write
-- External source: 8004scan.io public API (https://8004scan.io/api/v1/agents)
-- No scoring impact. No public UI yet. Phase 1 reader only.
-- See docs/ERC8004_INTEGRATION_EXPLORATION.md

CREATE TABLE agent_erc8004_registrations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- AgentCrush agent link
  agent_id             UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_handle         TEXT        NOT NULL,

  -- ERC-8004 on-chain identity
  chain_id             TEXT        NOT NULL,  -- 'eip155:1', 'eip155:8453', etc.
  chain_name           TEXT,                  -- 'ethereum', 'base', etc.
  registry_address     TEXT        NOT NULL,  -- contract address, lowercased
  token_id             TEXT        NOT NULL,  -- ERC-721 token ID as string
  agent_uri            TEXT,                  -- off-chain metadata URI (not yet fetched)

  -- ERC-8004 off-chain metadata (from 8004scan summary)
  erc8004_name         TEXT,
  owner_address        TEXT,
  controller_address   TEXT,
  endpoints            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  supported_trust      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  x402_supported       BOOLEAN,

  -- Match metadata
  match_confidence     NUMERIC     NOT NULL,  -- 0.0–1.0: 1.0=high 0.75=medium-high 0.5=medium
  match_reasons        TEXT[]      NOT NULL DEFAULT '{}',
  source               TEXT        NOT NULL DEFAULT '8004scan',

  -- Full raw record from source API
  raw_reference        JSONB,

  -- Housekeeping
  last_checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_erc8004_registrations_unique_registration
    UNIQUE (agent_id, chain_id, registry_address, token_id)
);

CREATE INDEX agent_erc8004_registrations_agent_id_idx
  ON agent_erc8004_registrations (agent_id);

CREATE INDEX agent_erc8004_registrations_agent_handle_idx
  ON agent_erc8004_registrations (agent_handle);

CREATE INDEX agent_erc8004_registrations_x402_supported_idx
  ON agent_erc8004_registrations (x402_supported)
  WHERE x402_supported IS TRUE;

CREATE INDEX agent_erc8004_registrations_last_checked_at_idx
  ON agent_erc8004_registrations (last_checked_at DESC);

CREATE INDEX agent_erc8004_registrations_chain_id_idx
  ON agent_erc8004_registrations (chain_id);

CREATE INDEX agent_erc8004_registrations_match_confidence_idx
  ON agent_erc8004_registrations (match_confidence DESC);
