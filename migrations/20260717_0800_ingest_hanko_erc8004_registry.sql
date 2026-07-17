-- Migration: 20260717_0800_ingest_hanko_erc8004_registry
-- Ingest HANKO as a service-category agent entity.
--
-- Context (Inbox/2026-07-10-build-suggestions.md, item 2):
--   HANKO launched on Solana mainnet in early July 2026. It is an ERC-8004 agent
--   trust registry on Solana — Ed25519-typed attestations, bonded registration,
--   karma scoring (0–1000). This is the ERC-8004 pattern ported to a new chain,
--   expanding the trust-layer signal family beyond Base/EVM. Noted in the strategy
--   review 2026-07-14 (SR-G3) as a gap: we track ERC-8004 on Base but were blind
--   to the Solana implementation that launched the same week.
--
-- Evidence tier: verified_onchain — HANKO is live on Solana mainnet per the
--   source tweet (@hanko_registry, 2026-07-10). tier=evidence_ranked reflects this.
--
-- GitHub URL: NULL — needs verification from @hanko_registry X profile bio.
--   Update with: UPDATE agents SET github_url='...' WHERE handle='hanko_registry';
--   after confirming via their X bio.
--
-- STATUS: PENDING APPLY by Kris.

-- ── HANKO (Solana ERC-8004 agent trust registry) ────────────────────────────
INSERT INTO agents (
  handle,
  display_name,
  bio,
  primary_category,
  tier,
  activity_status,
  visibility_score,
  reputation_score,
  weekly_delta,
  claim_status,
  verified,
  website_url,
  github_url,
  x_handle,
  last_event_at,
  created_at
) VALUES (
  'hanko_registry',
  'HANKO',
  'Solana''s ERC-8004 agent trust registry. Implements the ERC-8004 agent identity standard on Solana with Ed25519-typed attestations, bonded registration, and karma scoring (0–1000). Agents register on-chain and earn reputation through verifiable interactions — providing identity, liveness, and trust primitives for the agent economy on Solana mainnet. Launched July 2026.',
  'service',
  'evidence_ranked',
  'active',
  52,
  48,
  0,
  'unclaimed',
  true,
  NULL,
  NULL,
  'hanko_registry',
  NOW(),
  NOW()
)
ON CONFLICT (handle) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  bio              = EXCLUDED.bio,
  primary_category = EXCLUDED.primary_category,
  tier             = EXCLUDED.tier,
  activity_status  = EXCLUDED.activity_status,
  visibility_score = EXCLUDED.visibility_score,
  reputation_score = EXCLUDED.reputation_score,
  x_handle         = EXCLUDED.x_handle,
  last_event_at    = EXCLUDED.last_event_at;

-- Seed initial agent_snapshots row so the scoring pipeline can rank HANKO.
-- Score 52 matches visibility_score — conservative for a newly-launched on-chain
-- registry with no historical performance data yet.
INSERT INTO agent_snapshots (agent_id, snapshot_date, score, rank, github_stars, follower_count, created_at)
SELECT
  id,
  CURRENT_DATE,
  52,   -- initial score (evidence_ranked baseline, no historical data)
  NULL, -- rank assigned by Sunday scoring run
  0,    -- github_stars: to verify once github_url is confirmed
  0,    -- follower_count: not tracked for service agents
  NOW()
FROM agents
WHERE handle = 'hanko_registry'
ON CONFLICT DO NOTHING;
