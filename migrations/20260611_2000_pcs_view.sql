-- Migration: 20260611_2000_pcs_view.sql
-- Purpose: B7 — Protocol Compatibility Score (PCS). One 0-4 integer per agent:
--          how many of the four live protocol rails (ERC-8004 / x402 / A2A / MCP)
--          the agent verifiably supports. "Which agents are maximally
--          interoperable?" answered with data, first time anywhere.
--
-- Rail evidence (all already collected — this is a view, no new collection):
--   erc8004 — agent_erc8004_registrations with match_confidence >= 0.75
--             (per the 2026-05-14 data-quality rule: name-only matches don't count)
--   x402    — scanner-detected /.well-known/x402 OR verified payment_rails entry
--   a2a     — scanner-detected agent card
--   mcp     — scanner-detected MCP manifest OR mcp_server category OR verified rail entry
--
-- Evidence tier: scanner = public webpage; erc8004 = onchain (confidence-gated);
-- payment_rails_supported entries carry their own evidence_tier.
--
-- View is SECURITY DEFINER (Postgres default) with anon SELECT — PCS is free,
-- open data (the /api/pcs/v1 endpoint and agent profiles read it).
--
-- Apply: Supabase SQL editor (copy-paste)

CREATE OR REPLACE VIEW agent_protocol_compatibility_v1 AS
SELECT
  a.id AS agent_id,
  a.handle,
  a.display_name,
  a.primary_category,
  a.tier,
  a.activity_status,
  rails.erc8004,
  rails.x402,
  rails.a2a,
  rails.mcp,
  (rails.erc8004 + rails.x402 + rails.a2a + rails.mcp) AS pcs
FROM agents a
CROSS JOIN LATERAL (
  SELECT
    (EXISTS (
      SELECT 1 FROM agent_erc8004_registrations r
      WHERE r.agent_id = a.id AND r.match_confidence >= 0.75
    ))::int AS erc8004,
    (
      COALESCE((a.bot_fetch_friendliness->>'has_well_known_x402')::boolean, false)
      OR a.payment_rails_supported @> '[{"rail": "x402"}]'::jsonb
    )::int AS x402,
    COALESCE((a.bot_fetch_friendliness->>'has_agent_card')::boolean, false)::int AS a2a,
    (
      COALESCE((a.bot_fetch_friendliness->>'has_mcp_manifest')::boolean, false)
      OR a.primary_category = 'mcp_server'
      OR a.payment_rails_supported @> '[{"rail": "mcp"}]'::jsonb
    )::int AS mcp
) rails;

GRANT SELECT ON agent_protocol_compatibility_v1 TO anon, authenticated;
