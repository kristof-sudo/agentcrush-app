-- Watchlist Phase 3: webhook alert subscriptions (monitoring product v1)
-- Design: agentcrush-brain Notes/2026-07-02-monitoring-product-design.md
--
-- One row per webhook subscription. The secret signs OUTBOUND payloads
-- (HMAC-SHA256), so it is stored plaintext like Stripe's webhook signing
-- secrets — the table is service-role-only (RLS enabled, no policies).
-- Free pilot limits enforced in the API layer (<=50 handles, https-only).

CREATE TABLE IF NOT EXISTS watch_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handles               text[] NOT NULL,
  channel               text NOT NULL DEFAULT 'webhook' CHECK (channel IN ('webhook')),
  target_url            text NOT NULL,
  secret                text NOT NULL,
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  consecutive_failures  integer NOT NULL DEFAULT 0,
  last_alerted_at       timestamptz NOT NULL DEFAULT now(),  -- watermark: only events after this are sent
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_subscriptions_status_idx ON watch_subscriptions (status);

ALTER TABLE watch_subscriptions ENABLE ROW LEVEL SECURITY;
-- no policies on purpose: service-role only (same pattern as api_keys)
