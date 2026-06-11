-- Migration: 20260611_1500_api_telemetry.sql
-- Purpose: B13 — machine-traffic telemetry. The real distribution KPI:
--          daily counts of API/MCP hits by endpoint, UA class (agent vs
--          browser), and outcome (free / 402-quoted / paid / pro).
--
-- Written by src/lib/telemetry.js (fire-and-forget RPC from routes + the
-- x402 gate in src/proxy.js). Read by the daily export worker
-- (runtime/telemetry/telemetry-export-worker.mjs) and the weekly digest
-- revenue line (B9). Service-role only — not public.
--
-- Apply: Supabase SQL editor (copy-paste)

CREATE TABLE IF NOT EXISTS api_telemetry_daily (
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint   TEXT NOT NULL,           -- e.g. '/api/agents/find', '/api/mcp/v1#find_agents'
  ua_class   TEXT NOT NULL,           -- 'agent' | 'browser' | 'unknown'
  outcome    TEXT NOT NULL,           -- 'free_200' | 'free_4xx' | 'gated_402' | 'paid_pass' | 'pro_pass' | 'error_5xx'
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, endpoint, ua_class, outcome)
);

ALTER TABLE api_telemetry_daily ENABLE ROW LEVEL SECURITY;
-- no anon policies on purpose: service-role only

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_telemetry_daily' AND policyname = 'service_all_api_telemetry'
  ) THEN
    CREATE POLICY "service_all_api_telemetry" ON api_telemetry_daily
      FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- Atomic increment. SECURITY DEFINER so the single RPC grant is the whole
-- write surface; execution restricted to service_role.
CREATE OR REPLACE FUNCTION bump_api_telemetry(p_endpoint TEXT, p_ua TEXT, p_outcome TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO api_telemetry_daily (day, endpoint, ua_class, outcome, count)
  VALUES (CURRENT_DATE, LEFT(p_endpoint, 120), LEFT(p_ua, 16), LEFT(p_outcome, 24), 1)
  ON CONFLICT (day, endpoint, ua_class, outcome)
  DO UPDATE SET count = api_telemetry_daily.count + 1, updated_at = NOW();
$$;

REVOKE ALL ON FUNCTION bump_api_telemetry(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_api_telemetry(TEXT, TEXT, TEXT) TO service_role;
