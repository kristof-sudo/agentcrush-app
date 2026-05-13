-- Multi-chain + checkpoint support for erc8004_registry
-- Date: 2026-05-13
-- Depends on: 20260513_1948_create_erc8004_registry_sync.sql
--
-- Changes:
-- 1. Add mint_block column to erc8004_registry so we can resume from a checkpoint
--    instead of re-scanning all blocks every run.
-- 2. Change PK from (token_id) to (token_id, chain). Same token_id can exist on
--    multiple chains (Base + Ethereum) and represent different agents.
-- 3. Create erc8004_sync_state — one row per chain — tracking last_scanned_block,
--    contract address, run history, and error state.
--
-- Safe to run on an empty table (no data yet). If the table already had data,
-- the PK change would coerce all existing rows to chain='base' (the existing
-- DEFAULT), which matches reality since v1 was Base-only.

-- 1. Add mint_block column
ALTER TABLE erc8004_registry
  ADD COLUMN IF NOT EXISTS mint_block BIGINT;

CREATE INDEX IF NOT EXISTS idx_erc8004_registry_chain_mint_block
  ON erc8004_registry (chain, mint_block DESC);

-- 2. Change primary key to (token_id, chain)
ALTER TABLE erc8004_registry
  DROP CONSTRAINT IF EXISTS erc8004_registry_pkey;

ALTER TABLE erc8004_registry
  ADD PRIMARY KEY (token_id, chain);

-- 3. erc8004_sync_state — per-chain checkpoint + run metadata
CREATE TABLE IF NOT EXISTS erc8004_sync_state (
  chain                TEXT PRIMARY KEY,
  contract_address     TEXT NOT NULL,
  rpc_url              TEXT,
  last_scanned_block   BIGINT NOT NULL,
  total_tokens_seen    INTEGER NOT NULL DEFAULT 0,
  last_run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_status      TEXT,                            -- 'ok' | 'partial' | 'error'
  last_run_error       TEXT,
  last_run_duration_ms BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_erc8004_sync_state_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS erc8004_sync_state_touch ON erc8004_sync_state;
CREATE TRIGGER erc8004_sync_state_touch
  BEFORE UPDATE ON erc8004_sync_state
  FOR EACH ROW EXECUTE FUNCTION trg_erc8004_sync_state_touch();

COMMENT ON TABLE erc8004_sync_state IS
  'Per-chain checkpoint for runtime/erc8004-registry-sync.mjs. last_scanned_block lets daily runs resume from where they left off instead of re-scanning the full block range. One row per chain (base, ethereum, ...).';
