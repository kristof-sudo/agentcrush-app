-- x402 payer scan results table (B23)
-- Date: 2026-06-16
-- Purpose: Store on-chain evidence of x402 payments: which EOAs paid which payTo
--          addresses via USDC on Base. Populated daily by
--          runtime/x402-payer-scan-worker.mjs.
--
-- Evidence tier: verified_onchain (USDC Transfer events from Base, decoded from
--               public eth_getLogs — the highest-confidence evidence tier we have).
--
-- Design notes:
--   - UNIQUE on tx_hash: one payment tx produces one row. If a single tx contains
--     multiple USDC transfers to different payTo addresses (unusual but possible),
--     each gets its own row — the UNIQUE is per-tx, not per-transfer within a tx.
--     If you later need per-log granularity, add a log_index column.
--   - payer_wallet is the FROM address in the USDC Transfer event. In direct
--     settlement this equals tx.from. If facilitator-mediated, it equals the
--     facilitator — see topology-checker.mjs for how to determine which applies.
--   - amount_usdc: stored as NUMERIC(20,6) — USDC has 6 decimal places.
--   - matched_agent_id: NULL until an identity-matching pass (B19 phase 2) links
--     payer wallets to indexed agents. FK to agents with SET NULL on delete.
--   - network: stored as EIP-155 chain id string (e.g. 'eip155:8453') to support
--     future multi-chain expansion.

CREATE TABLE IF NOT EXISTS x402_payers (
  id                 BIGSERIAL     PRIMARY KEY,
  payer_wallet       TEXT          NOT NULL,
  payee_address      TEXT          NOT NULL,
  resource_url       TEXT,                       -- matched from Bazaar (nullable)
  tx_hash            TEXT          NOT NULL,
  block_number       BIGINT        NOT NULL,
  amount_usdc        NUMERIC(20,6) NOT NULL,
  network            TEXT          NOT NULL DEFAULT 'eip155:8453',
  tx_timestamp       TIMESTAMPTZ,               -- block time; NULL if not resolved
  matched_agent_id   BIGINT        REFERENCES agents(id) ON DELETE SET NULL,
  first_seen_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT x402_payers_tx_hash_key UNIQUE (tx_hash)
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS x402_payers_payer_wallet_idx   ON x402_payers (payer_wallet);
CREATE INDEX IF NOT EXISTS x402_payers_payee_address_idx  ON x402_payers (payee_address);
CREATE INDEX IF NOT EXISTS x402_payers_block_number_idx   ON x402_payers (block_number DESC);
CREATE INDEX IF NOT EXISTS x402_payers_tx_timestamp_idx   ON x402_payers (tx_timestamp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS x402_payers_matched_agent_idx  ON x402_payers (matched_agent_id) WHERE matched_agent_id IS NOT NULL;

-- RLS: read-only for anon (aggregate intelligence, no sensitive wallet info beyond what's
-- already public on-chain); service-role for writes from the scan worker.
ALTER TABLE x402_payers ENABLE ROW LEVEL SECURITY;

CREATE POLICY x402_payers_anon_read ON x402_payers
  FOR SELECT TO anon USING (true);

CREATE POLICY x402_payers_service_write ON x402_payers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
