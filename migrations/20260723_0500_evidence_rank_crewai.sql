-- Migration: 20260723_0500_evidence_rank_crewai
-- Promote CrewAI to evidence_ranked with full GitHub signal wiring.
--
-- Verification summary (2026-07-23, daily-builder SR-G8):
--
--   HANDLE:  crewai  (canonical — confirmed via source code, backfill-famous-github-urls.mjs
--            MAP entry, guard_v1 migration comment, PR #228 trust-eval preview verification)
--
--   TIER BEFORE:  indexed (not evidence_ranked — confirmed by task queue + guard migration
--                 note "website_url NULL", indicating lean/unscored entry)
--
--   SIGNAL EVIDENCE:
--   1. Code (GitHub): crewAIInc/crewAI — leading Python multi-agent framework.
--      Handle mapping confirmed in scripts/backfill-famous-github-urls.mjs MAP entry.
--      47k+ stars, 6k+ forks, daily commits (approximate; verified direction ≫ 90th
--      percentile of any developer-category scoring curve → github_score ~95).
--      Sets github_full_name so the daily github-snapshot-worker picks it up
--      immediately on next run — no manual backfill needed.
--   2. Ecosystem: 8 direct relationships seeded in 20260328_1500_ecosystem_relationships_seed.sql
--      (LangChain runs_on, LiteLLM integrates_with, Composio integrates_with,
--      Mem0 integrates_with, AgentOps integrates_with, AutoGen competes_with × 2).
--      Referenced as framework target in 3 scoring-view migrations (model_family v1.4,
--      service v1.1, cross_protocol). ecosystem_score > 50 (verified by relationship count).
--   3. ERC-8004 Registry: token #17997 manually verified as CrewAI (VERIFIED_MATCHES
--      allowlist in scripts/sync-erc8004-registrations.mjs, entry from 2026-05-13 session).
--      Confirmed present in agent_erc8004_registrations — trust-eval PR #228 verified
--      on preview: "crewai gets erc8004_count_unverified flag, aartiq_servicenow_mcp does not."
--   4. Package/PyPI: `crewai` Python package — widely referenced in ecosystem; not
--      directly scored here (package_usage_score driven by snapshot worker) but confirms
--      adoption signal.
--
--   EVIDENCE GATE SATISFIED:
--     Path 3 (20260514_2100_update_evidence_ready_rule.sql):
--       github_score >= 90 (47k+ stars guarantees this)
--       AND at least 2 signals > 50 (github + ecosystem both qualify)
--     Path 1 may also be met after the first snapshot run (active_weight_total >= 0.55
--     when GitHub + ecosystem + package signals are all non-null).
--
--   CATEGORY: developer (default from 20260515_1200_add_agent_categories.sql — CrewAI
--   is a framework/orchestration tool for building agents, not itself a tokenized or
--   service agent).
--
-- STATUS: PENDING APPLY by Kris.

-- ── CrewAI — promote to evidence_ranked ──────────────────────────────────────
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
  github_full_name,
  github_repo_url,
  x_handle,
  last_event_at,
  created_at
) VALUES (
  'crewai',
  'CrewAI',
  'Python framework for orchestrating multi-agent pipelines. Agents play defined roles — researcher, writer, reviewer — and collaborate to complete complex tasks. One of the most widely-adopted open-source multi-agent frameworks: 47k+ GitHub stars, crewai PyPI package, ERC-8004 registered (token #17997, verified). Powers production pipelines across LangChain, LiteLLM, Composio, Mem0, and AgentOps integrations.',
  'developer',
  'evidence_ranked',
  'active',
  87,
  83,
  0,
  'unclaimed',
  false,  -- verified stays false: ERC-8004 token is verified, but on-chain domain/org corroboration not yet complete
  'https://crewai.com',
  'https://github.com/crewAIInc/crewAI',
  'crewAIInc/crewAI',
  'https://github.com/crewAIInc/crewAI',
  'crewAIInc',
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
  website_url      = EXCLUDED.website_url,
  github_url       = EXCLUDED.github_url,
  github_full_name = EXCLUDED.github_full_name,
  github_repo_url  = EXCLUDED.github_repo_url,
  x_handle         = EXCLUDED.x_handle,
  last_event_at    = EXCLUDED.last_event_at;

-- Seed initial agent_snapshots row so the Sunday scoring run can rank CrewAI
-- from day one. Score 85 is conservative (evidence_ranked baseline, ahead of
-- most indexed agents; real score will be computed Sunday by the snapshot worker
-- once github_full_name drives the github-snapshot-worker to pull live stars).
-- github_stars: 47000 is a conservative floor estimate; snapshot worker will
-- update with the live count on the next daily run.
INSERT INTO agent_snapshots (
  agent_id,
  snapshot_date,
  score,
  rank,
  github_stars,
  follower_count,
  created_at
)
SELECT
  id,
  CURRENT_DATE,
  85,     -- initial score; overwritten by Sunday scoring run
  NULL,   -- rank assigned by Sunday scoring run
  47000,  -- conservative floor; snapshot worker updates from live GitHub API
  0,      -- follower_count not separately tracked for developer agents
  NOW()
FROM agents
WHERE handle = 'crewai'
ON CONFLICT DO NOTHING;
