-- Add bot_fetch_friendliness fields to agents table
-- Date: 2026-05-13
-- Purpose: Track per-agent machine-discoverable signals — does this agent's
--          domain publish .well-known/x402, agent-card, MCP manifest,
--          OpenAPI spec, and a permissive robots.txt?
--
-- This is DISPLAY-ONLY. Not a ranking signal. Used to surface a
-- "Machine-discoverable" badge on the agent profile.
--
-- Structure of bot_fetch_friendliness jsonb:
--   {
--     "has_well_known_x402": bool,
--     "has_agent_card":      bool,
--     "has_mcp_manifest":    bool,
--     "has_openapi":         bool,
--     "has_robots_txt_allow":bool,
--     "score":               int (0..5, sum of true flags),
--     "scanned_at":          iso8601 timestamp
--   }
--
-- bot_fetch_friendliness_score is mirrored at the column level so we can
-- index it for sorting / filtering without extracting from jsonb.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS bot_fetch_friendliness        JSONB,
  ADD COLUMN IF NOT EXISTS bot_fetch_friendliness_score  SMALLINT;

CREATE INDEX IF NOT EXISTS idx_agents_bot_fetch_friendliness_score
  ON agents (bot_fetch_friendliness_score DESC NULLS LAST);
