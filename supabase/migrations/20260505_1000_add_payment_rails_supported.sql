-- Add payment_rails_supported to agents table
-- v1: JSONB array, not null, default empty array
-- No scoring impact. Evidence tier required per entry.
--
-- Schema for each array element:
-- {
--   "rail":            string  — rail identifier, e.g. "x402", "mcp", "erc8004", "ap2",
--                               "stripe_link_spt", "kite_passport", "erc8183_acp",
--                               "agentic_market_bazaar", "visa_stablecoin", "other"
--   "status":         string  — "verified" | "detected" | "self_reported" | "planned" | "unknown"
--   "evidence_tier":  string  — "verified_api" | "onchain" | "marketplace" | "public_docs" | "self_reported"
--   "source_url":     string? — optional link to evidence
--   "last_checked_at":string? — ISO 8601 datetime
--   "notes":          string? — free-form context
-- }
--
-- Population: manual only via scripts/seed-examples/payment-rails-example.json pattern.
-- Do not auto-populate from self-reported sources without evidence_tier = "self_reported" label.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS payment_rails_supported jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN agents.payment_rails_supported IS
  'Protocol and payment rail coverage per agent. JSONB array of rail objects. No scoring impact. Each entry must carry an evidence_tier. Manual population only — no auto-ingest without verified source.';
