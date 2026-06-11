-- Migration: 20260611_1800_api_key_usage.sql
-- Purpose: B6 — per-key Pro API usage telemetry. Daily counts per key prefix
--          per endpoint: proves value to subscribers, catches abuse, feeds the
--          morning-brief Telegram line and the weekly digest revenue section.
--
-- Only the key PREFIX (ac_live_ + 7 chars, 15 total) is stored — never the
-- key or its hash. Written fire-and-forget by src/lib/telemetry.js
-- (trackKeyUsage) from the x402 gate and /api/agents/bulk. Read by
-- runtime/telemetry/telemetry-export-worker.mjs. Service-role only.
--
-- Apply: Supabase SQL editor (copy-paste)

CREATE TABLE IF NOT EXISTS api_key_usage_daily (
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  key_prefix TEXT NOT NULL,           -- e.g. 'ac_live_c3e5da7'
  endpoint   TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, key_prefix, endpoint)
);

ALTER TABLE api_key_usage_daily ENABLE ROW LEVEL SECURITY;
-- service-role only, no anon policies

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_key_usage_daily' AND policyname = 'service_all_api_key_usage'
  ) THEN
    CREATE POLICY "service_all_api_key_usage" ON api_key_usage_daily
      FOR ALL TO service_role USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION bump_key_usage(p_prefix TEXT, p_endpoint TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO api_key_usage_daily (day, key_prefix, endpoint, count)
  VALUES (CURRENT_DATE, LEFT(p_prefix, 20), LEFT(p_endpoint, 120), 1)
  ON CONFLICT (day, key_prefix, endpoint)
  DO UPDATE SET count = api_key_usage_daily.count + 1, updated_at = NOW();
$$;

REVOKE ALL ON FUNCTION bump_key_usage(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_key_usage(TEXT, TEXT) TO service_role;
