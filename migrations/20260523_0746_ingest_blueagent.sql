-- Ingest BlueAgent (@blueagent_) entity
--
-- Source: surfaced via Ajsa social brief 2026-05-23 + competitor review.
-- BlueAgent ships 34 x402-paid endpoints on Base, multi-agent consensus console.
-- GitHub: madebyshun/blue-agent
-- Token: $BLUEAGENT 0xf895783b2931c919955e18b5e3343e7c7c456ba3 on Base
--
-- Scope (kept narrow per operating rules):
--   - INSERT entity row in `agents` only
--   - 34 x402 endpoints already in `bazaar_resources` via daily Bazaar ingest;
--     explicit agent↔resources linking needs a separate schema decision
--     (no agent_id FK exists on bazaar_resources today). Tracking as follow-up.
--   - Token NOT added to tokenized ranking — needs MC/liquidity/holder signals
--     which come from token adapters when run, not at insert time.
--
-- Tier: 'indexed' (default). Promote to 'evidence_ranked' once developer
-- scoring view picks them up from the github_full_name + active GitHub signal.

INSERT INTO agents (
  handle,
  display_name,
  archetype,
  bio,
  tagline,
  entity_type,
  ecosystem_layer,
  identity_status,
  github_url,
  github_full_name,
  website_url,
  tier
)
VALUES (
  'blueagent',
  'BlueAgent',
  'Builder',
  'Base ecosystem builder shipping 34 x402-paid endpoints under one multi-agent console (Blue + Aeon + MiroShark consensus). Pay-per-call USDC, no subscription. MCP-integrated. Token $BLUEAGENT on Base (0xf895783b2931c919955e18b5e3343e7c7c456ba3).',
  'AI-native ecosystem for Base builders. x402 stack under one console.',
  'platform',
  'infrastructure',
  'confirmed',
  'https://github.com/madebyshun/blue-agent',
  'madebyshun/blue-agent',
  'https://blueagent.dev',
  'indexed'
)
ON CONFLICT (handle) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  bio              = EXCLUDED.bio,
  tagline          = EXCLUDED.tagline,
  github_url       = EXCLUDED.github_url,
  github_full_name = EXCLUDED.github_full_name,
  website_url      = EXCLUDED.website_url;
