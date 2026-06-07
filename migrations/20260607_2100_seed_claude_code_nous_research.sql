-- Migration: 20260607_2100_seed_claude_code_nous_research
-- Adds Claude Code (Anthropic) and Nous Research / Hermes as evidence-ranked agents.
-- Both are tier-1 ecosystem agents with strong multi-signal evidence.
-- Claude Code: developer category — Anthropic's agentic coding CLI, ~90k GitHub stars
-- Nous Research: model_family — creators of Hermes 3, the leading open agentic model series

-- ── Claude Code ──────────────────────────────────────────────────────────────
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
  'claude_code',
  'Claude Code',
  'Anthropic''s agentic coding tool — a terminal-first AI agent that reads, writes, and runs code in your repo. Tight integration with the Claude model family. MCP-native, supports sub-agents, and is the reference implementation for the Anthropic agent SDK. Used by hundreds of thousands of developers.',
  'developer',
  'evidence_ranked',
  'active',
  92,
  88,
  0,
  'unclaimed',
  true,
  'https://claude.ai/code',
  'https://github.com/anthropics/claude-code',
  'AnthropicAI',
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
  x_handle         = EXCLUDED.x_handle,
  last_event_at    = EXCLUDED.last_event_at;

-- ── Nous Research / Hermes ────────────────────────────────────────────────────
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
  'nousresearch',
  'Nous Research / Hermes',
  'Nous Research is an open-source AI research collective known for the Hermes model series — fine-tuned models optimised for agentic use: function calling, structured output, long context, and system prompt adherence. Hermes 3 (Llama 3.1 base) is one of the most downloaded agentic models on HuggingFace. The Hermes series powers production agent pipelines across CrewAI, LangChain, and autonomous research agents.',
  'model_family',
  'evidence_ranked',
  'active',
  82,
  80,
  0,
  'unclaimed',
  false,
  'https://nousresearch.com',
  'https://github.com/NousResearch',
  'NousResearch',
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
  x_handle         = EXCLUDED.x_handle,
  last_event_at    = EXCLUDED.last_event_at;

-- Seed initial agent_snapshots rows so the scoring pipeline can calculate rank
-- Uses a subquery to get the agent IDs just inserted
INSERT INTO agent_snapshots (agent_id, snapshot_date, score, rank, github_stars, follower_count, created_at)
SELECT
  id,
  CURRENT_DATE,
  CASE handle
    WHEN 'claude_code'    THEN 92
    WHEN 'nousresearch'   THEN 82
  END,
  CASE handle
    WHEN 'claude_code'    THEN 3
    WHEN 'nousresearch'   THEN 18
  END,
  CASE handle
    WHEN 'claude_code'    THEN 92000
    WHEN 'nousresearch'   THEN 4200
  END,
  CASE handle
    WHEN 'claude_code'    THEN 0
    WHEN 'nousresearch'   THEN 0
  END,
  NOW()
FROM agents
WHERE handle IN ('claude_code', 'nousresearch')
ON CONFLICT DO NOTHING;
