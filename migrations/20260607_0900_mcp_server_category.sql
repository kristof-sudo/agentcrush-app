-- Migration: 20260607_0900_mcp_server_category.sql
-- Purpose: Add mcp_server as a valid category + seed top MCP servers
--
-- Context: R-4.3 MCP Server Index — new category ranking for MCP servers.
-- MCP servers are infrastructure that extends LLM capabilities. They're a
-- distinct agent class: not end-user agents but capability providers.
-- This index tracks which MCP servers have the most traction, quality, and
-- real-world adoption — distinct from the developer agent ranking which covers
-- AI agents themselves.
--
-- Scoring methodology (mcp_server v1.0):
--   github_stars  30% — proxy for developer trust + discoverability
--   tool_count    25% — breadth of capability (fetched from registry metadata)
--   registry_listings 20% — presence on Smithery/mcp.so/Official = verified quality
--   github_forks  15% — actual integrations (fork = someone using it)
--   social_signal 10% — follower count, engagement
--
-- Apply: Supabase SQL editor (copy-paste)

-- ── 1. Add mcp_server to category check constraint ───────────────────────────
-- (Only if a CHECK constraint exists on the category column. Most Supabase
-- schemas use an enum or a text column with no constraint — check first.)
-- If this fails, ignore it: the column is likely unconstrained text.
DO $$
BEGIN
  -- Try to add mcp_server to the agents category enum if it's a pg enum
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agent_category'
  ) THEN
    ALTER TYPE agent_category ADD VALUE IF NOT EXISTS 'mcp_server';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Not an enum, category is text — no action needed
  RAISE NOTICE 'Category is not an enum type — no ALTER needed';
END $$;

-- ── 2. Create mcp_server_metadata table for MCP-specific fields ──────────────
CREATE TABLE IF NOT EXISTS mcp_server_metadata (
  handle             TEXT PRIMARY KEY REFERENCES agents(handle) ON DELETE CASCADE,
  tool_count         INTEGER,
  resource_count     INTEGER,
  transport_types    TEXT[],  -- ['http', 'stdio', 'sse']
  registry_listings  TEXT[],  -- ['smithery', 'mcp_so', 'official', 'glama', 'continue']
  mcp_spec_version   TEXT,
  server_url         TEXT,
  npm_package        TEXT,
  pypi_package       TEXT,
  npx_install        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mcp_server_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_mcp_server_metadata" ON mcp_server_metadata FOR SELECT TO anon USING (true);
CREATE POLICY "service_write_mcp_server_metadata" ON mcp_server_metadata FOR ALL TO service_role USING (true);

-- ── 3. Seed top MCP servers (evidence-ranked seed, June 2026) ────────────────
-- These are the most-referenced MCP servers in real deployments.
-- Source: Official MCP registry + Smithery top installs + mcp.so trending

INSERT INTO agents (handle, name, description, category, tier, homepage_url, github_url, created_at, updated_at)
VALUES
  ('filesystem-mcp', 'Filesystem MCP', 'Official Anthropic filesystem MCP server. Read/write files in allowed directories. Bundled with Claude Desktop.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('memory-mcp', 'Memory MCP', 'Official Anthropic memory server. Persistent key-value memory using knowledge graphs.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('brave-search-mcp', 'Brave Search MCP', 'Web and local search via Brave Search API. One of the most-installed MCP servers.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('github-mcp', 'GitHub MCP', 'Official GitHub MCP server. Repository management, PR review, issue tracking via Claude.', 'mcp_server', 'evidence_ranked', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', NOW(), NOW()),
  ('postgres-mcp', 'PostgreSQL MCP', 'Direct PostgreSQL database access. Read-only query execution, schema inspection.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('puppeteer-mcp', 'Puppeteer MCP', 'Browser automation via Puppeteer. Screenshot, click, fill forms, extract content.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('sequential-thinking-mcp', 'Sequential Thinking MCP', 'Dynamic problem-solving via structured thought sequences. Official Anthropic server.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('slack-mcp', 'Slack MCP', 'Slack workspace integration. Channel management, messaging, search.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('agentcrush-mcp', 'AgentCrush MCP', 'AI agent economy index. Rankings, trust scores, protocol adoption, ecosystem trends. 12 tools.', 'mcp_server', 'evidence_ranked', 'https://agentcrush.xyz', 'https://github.com/kristof-sudo/agentcrush-app', NOW(), NOW()),
  ('fetch-mcp', 'Fetch MCP', 'HTTP fetch tool for MCP. Retrieve and transform web content into LLM-friendly markdown.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('google-maps-mcp', 'Google Maps MCP', 'Places, geocoding, directions via Google Maps API.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('sentry-mcp', 'Sentry MCP', 'Error monitoring integration. Retrieve Sentry issues and error reports via Claude.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('everart-mcp', 'EverArt MCP', 'AI image generation via EverArt models.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW(), NOW()),
  ('base-mcp', 'Base MCP (Coinbase)', 'Coinbase Base blockchain interactions. Smart contracts, tokens, wallet operations via Claude.', 'mcp_server', 'evidence_ranked', 'https://github.com/coinbase/agentkit', 'https://github.com/coinbase/agentkit', NOW(), NOW()),
  ('stripe-agent-toolkit-mcp', 'Stripe Agent Toolkit MCP', 'Stripe payments, customers, invoices, and billing via agent toolkit.', 'mcp_server', 'evidence_ranked', 'https://github.com/stripe/agent-toolkit', 'https://github.com/stripe/agent-toolkit', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ── 4. Seed mcp_server_metadata for known servers ───────────────────────────
INSERT INTO mcp_server_metadata (handle, tool_count, transport_types, registry_listings, npx_install)
VALUES
  ('filesystem-mcp', 8, ARRAY['stdio'], ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-filesystem'),
  ('memory-mcp', 6, ARRAY['stdio'], ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-memory'),
  ('brave-search-mcp', 2, ARRAY['stdio'], ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-brave-search'),
  ('github-mcp', 25, ARRAY['stdio', 'http'], ARRAY['official', 'smithery'], 'github-mcp-server'),
  ('postgres-mcp', 3, ARRAY['stdio'], ARRAY['official', 'smithery'], '@modelcontextprotocol/server-postgres'),
  ('puppeteer-mcp', 7, ARRAY['stdio'], ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-puppeteer'),
  ('sequential-thinking-mcp', 1, ARRAY['stdio'], ARRAY['official', 'smithery'], '@modelcontextprotocol/server-sequential-thinking'),
  ('slack-mcp', 8, ARRAY['stdio'], ARRAY['official', 'smithery'], '@modelcontextprotocol/server-slack'),
  ('agentcrush-mcp', 12, ARRAY['http'], ARRAY['official', 'smithery', 'mcp_so'], NULL),
  ('fetch-mcp', 2, ARRAY['stdio'], ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-fetch'),
  ('base-mcp', 15, ARRAY['stdio', 'http'], ARRAY['smithery'], 'coinbase-agentkit'),
  ('stripe-agent-toolkit-mcp', 20, ARRAY['stdio', 'http'], ARRAY['smithery'], '@stripe/agent-toolkit')
ON CONFLICT (handle) DO UPDATE SET
  tool_count = EXCLUDED.tool_count,
  transport_types = EXCLUDED.transport_types,
  registry_listings = EXCLUDED.registry_listings,
  npx_install = EXCLUDED.npx_install,
  updated_at = NOW();

-- ── 5. Create scoring view for mcp_server category ──────────────────────────
CREATE OR REPLACE VIEW agent_score_mcp_server_v1 AS
SELECT
  a.handle,
  a.name,
  a.description,
  a.category,
  a.tier,
  a.github_stars,
  a.github_forks,
  a.follower_count,
  m.tool_count,
  m.registry_listings,
  m.transport_types,
  m.npx_install,
  -- Score: stars 30% + tool_count 25% + registry_count 20% + forks 15% + followers 10%
  ROUND(
    COALESCE(
      (LEAST(a.github_stars, 50000)::NUMERIC / 50000) * 30, 0
    ) +
    COALESCE(
      (LEAST(m.tool_count, 30)::NUMERIC / 30) * 25, 0
    ) +
    COALESCE(
      (ARRAY_LENGTH(m.registry_listings, 1)::NUMERIC / 5) * 20, 0
    ) +
    COALESCE(
      (LEAST(a.github_forks, 5000)::NUMERIC / 5000) * 15, 0
    ) +
    COALESCE(
      (LEAST(a.follower_count, 100000)::NUMERIC / 100000) * 10, 0
    )
  , 1) AS score,
  a.homepage_url,
  a.updated_at
FROM agents a
LEFT JOIN mcp_server_metadata m ON m.handle = a.handle
WHERE a.category = 'mcp_server'
ORDER BY score DESC NULLS LAST;

-- ── 6. Notify PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Done ──────────────────────────────────────────────────────────────────────
-- To apply: paste this SQL in the Supabase SQL editor.
-- After apply: verify with SELECT * FROM agent_score_mcp_server_v1 LIMIT 5;
