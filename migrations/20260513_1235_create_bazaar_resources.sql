-- CDP Bazaar /discovery/resources normalized source table
-- Date: 2026-05-13
-- Purpose: Read-only mirror of Coinbase CDP Bazaar (`/platform/v2/x402/discovery/resources`).
--          Each row is one x402-payable resource as advertised by Bazaar. Source-of-truth
--          payload is preserved in `raw_payload`; common fields are projected for indexing.
--          No scoring impact. Populated by runtime/bazaar-resources-adapter.mjs.
--
-- Evidence tier: marketplace-reported (Bazaar is a self-listing index, not protocol-verified).
-- Idempotent: unique on resource_url. Subsequent runs upsert and bump last_seen_at.

CREATE TABLE IF NOT EXISTS bazaar_resources (
  id                BIGSERIAL PRIMARY KEY,
  resource_url      TEXT          NOT NULL,
  type              TEXT,                          -- e.g. 'http'
  x402_version      INTEGER,                       -- declared x402Version
  description       TEXT,
  accepts           JSONB         NOT NULL DEFAULT '[]'::jsonb,   -- array of {amount, asset, network, payTo, scheme, extra, ...}
  declared_schema   JSONB,                         -- extensions.bazaar.info.schema, if present
  bazaar_info       JSONB,                         -- extensions.bazaar.info (input/output/schema bundle)
  quality           JSONB,                         -- {l30DaysTotalCalls, l30DaysUniquePayers, lastCalledAt}
  last_updated_at   TIMESTAMPTZ,                   -- upstream `lastUpdated`
  raw_payload       JSONB         NOT NULL,        -- full original Bazaar item
  payload_hash      TEXT          NOT NULL,        -- sha256(raw_payload canonical JSON) for change detection
  first_seen_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  removed_at        TIMESTAMPTZ,                   -- set when resource disappears from Bazaar between runs

  CONSTRAINT bazaar_resources_resource_url_key UNIQUE (resource_url)
);

-- Indexes
CREATE INDEX IF NOT EXISTS bazaar_resources_last_seen_idx     ON bazaar_resources (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS bazaar_resources_last_updated_idx  ON bazaar_resources (last_updated_at DESC);
CREATE INDEX IF NOT EXISTS bazaar_resources_removed_at_idx    ON bazaar_resources (removed_at);
CREATE INDEX IF NOT EXISTS bazaar_resources_payload_hash_idx  ON bazaar_resources (payload_hash);
