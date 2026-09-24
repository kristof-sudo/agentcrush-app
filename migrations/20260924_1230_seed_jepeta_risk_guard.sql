-- 20260924_1230_seed_jepeta_risk_guard.sql
-- Seed one indexed-tier agent: Jepeta Risk Guard (inbound listing request 2026-09-24,
-- eliber12@gmail.com). Machine-readable pre-trade ERC-20 risk screening for autonomous
-- trading/swap agents on Virtuals ACP v2 / Base.
--
-- Base ("indexed") tier only — it earns rank through the normal nightly scoring / liveness /
-- snapshot pipeline once present; we do NOT hand-assign scores. Anchored on the canonical
-- domain jepeta.dev (the submitter moved hosts 4× in 4 days; jepeta.dev is the stated canonical).
-- Provenance (not columns): Virtuals ACP agent id 01a0b446-374c-7eb8-8fe8-cd1a9945ea70,
-- provider wallet 0xefcb0359e2cd6d1ad92cbca1e41c8946b308d7df, offering token_risk_scan 0.03 USDC.
-- NOTE: virtuals_id is the numeric Virtuals platform id, which an ACP-v2 agent does not have,
-- so it is left null. Durable path is proper Virtuals ACP-v2 ingestion coverage (VPS adapter);
-- this is a manual base-tier seed in the meantime.
-- Idempotent: ON CONFLICT (handle) DO NOTHING — safe to re-run.

INSERT INTO agents (
  handle, display_name, tagline, bio,
  primary_category, entity_type, ecosystem_layer, archetype,
  tier, status, verified,
  visibility_score, reputation_score,
  network_name, website_url, endpoint_url
) VALUES (
  'jepeta-risk-guard',
  'Jepeta Risk Guard',
  'Pre-trade ERC-20 risk screening for autonomous trading agents',
  'Machine-readable pre-trade ERC-20 risk screening for autonomous trading/swap agents. Read-only; uses GoPlus Security + exact Base DEX Screener data; fails closed when required security data is unavailable. Virtuals ACP v2 offering: token_risk_scan (0.03 USDC).',
  'service', 'agent', 'agent', 'Risk',
  'indexed', 'active', false,
  0, 0,
  'Base', 'https://jepeta.dev', 'https://jepeta.dev/agent.json'
)
ON CONFLICT (handle) DO NOTHING;
