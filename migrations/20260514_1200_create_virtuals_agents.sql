-- Create virtuals_agents table for daily Virtuals Protocol agent index sync
-- Date: 2026-05-14
-- Purpose: Mirror the public Virtuals Protocol agent index
--          (https://api.virtuals.io/api/virtuals) into AgentCrush so we can
--          surface Virtuals-ecosystem agent tokens (price, mcap, holders,
--          TVL, volume) alongside the rest of our discovery index.
--
-- Read-only mirror. No scoring impact. One row per Virtuals `id`.
-- NOTE on denomination: Virtuals API expresses market_cap, TVL, and price
--      in their native VIRTUAL token (mcapInVirtual, virtualTokenValue,
--      totalValueLocked). `liquidity` is reported in USD. We persist the
--      raw VIRTUAL-denominated columns AS-IS — converting to USD is a
--      downstream concern (needs a VIRTUAL/USD price feed). The columns
--      named *_usd below intentionally store USD figures only when the
--      upstream API reports them in USD; otherwise NULL. The raw payload
--      preserves every original field.
--
-- Sync worker: runtime/virtuals-agents-adapter.mjs
-- Cron:        ops/systemd/agentcrush-virtuals-agents-sync.{service,timer}
--              (daily 05:00 Budapest local)

CREATE TABLE IF NOT EXISTS virtuals_agents (
  virtuals_id        BIGINT PRIMARY KEY,            -- Virtuals canonical numeric id
  uid                TEXT,                          -- Virtuals uuid (secondary)
  name               TEXT,
  ticker             TEXT,                          -- symbol on Virtuals
  description        TEXT,
  token_address      TEXT,
  chain              TEXT NOT NULL DEFAULT 'base',
  status             TEXT,                          -- AVAILABLE, etc.

  -- Pricing & market metrics
  -- Virtuals reports these in VIRTUAL token, not USD. Stored as numeric.
  token_price_virtual    NUMERIC,                   -- virtualTokenValue (raw)
  market_cap_virtual     NUMERIC,                   -- mcapInVirtual
  fdv_virtual            NUMERIC,                   -- fdvInVirtual
  tvl_virtual            NUMERIC,                   -- totalValueLocked (string→numeric)

  -- USD-denominated fields (only those the API reports directly in USD)
  token_price_usd        NUMERIC,                   -- reserved; not populated yet
  market_cap_usd         NUMERIC,                   -- reserved; not populated yet
  tvl_usd                NUMERIC,                   -- reserved; not populated yet
  liquidity_usd          NUMERIC,                   -- liquidityUsd (USD)
  volume_24h_usd         NUMERIC,                   -- volume24h (treated as USD per Virtuals UI)

  -- Holders & activity
  holders                INTEGER,                   -- holderCount
  top10_holder_pct       NUMERIC,                   -- top10HolderPercentage
  price_change_pct_24h   NUMERIC,                   -- priceChangePercent24h
  net_volume_24h         NUMERIC,                   -- netVolume24h

  -- Classification
  category               TEXT,                      -- e.g. "IP MIRROR"
  archetype              TEXT,                      -- mapped from `role` (e.g. "ENTERTAINMENT")

  -- Links / media
  image_url              TEXT,
  website_url            TEXT,
  twitter_url            TEXT,
  github_url             TEXT,

  -- Change detection + full record
  payload_hash           TEXT,                      -- sha256 of canonical raw_payload
  raw_payload            JSONB NOT NULL,

  -- Timestamps
  first_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_name
  ON virtuals_agents (name);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_token_address
  ON virtuals_agents (token_address);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_market_cap_virtual
  ON virtuals_agents (market_cap_virtual DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_market_cap_usd
  ON virtuals_agents (market_cap_usd DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_last_seen_at
  ON virtuals_agents (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_virtuals_agents_ticker
  ON virtuals_agents (ticker);

-- updated_at auto-bump (mirrors pattern in erc8004_registry migration)
CREATE OR REPLACE FUNCTION trg_virtuals_agents_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS virtuals_agents_touch ON virtuals_agents;
CREATE TRIGGER virtuals_agents_touch
  BEFORE UPDATE ON virtuals_agents
  FOR EACH ROW EXECUTE FUNCTION trg_virtuals_agents_touch();

COMMENT ON TABLE virtuals_agents IS
  'Read-only mirror of the public Virtuals Protocol agent index (api.virtuals.io/api/virtuals). One row per Virtuals numeric id. Populated daily by runtime/virtuals-agents-adapter.mjs. Market cap / TVL / price are denominated in VIRTUAL token unless the column name ends in _usd. No scoring impact.';
