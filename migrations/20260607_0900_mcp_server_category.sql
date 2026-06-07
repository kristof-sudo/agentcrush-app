-- Migration: 20260607_0900_mcp_server_category.sql  (v3 — extend check constraint)
-- Purpose: Add mcp_server as a valid primary_category + seed top MCP servers
--
-- Fixed vs v1: agents table uses display_name/bio/primary_category/website_url,
-- not name/description/category/homepage_url. github_stars/forks/follower_count
-- live in agent_snapshots, not agents — scoring view joins the latest snapshot.
--
-- Fixed vs v2: DROP + recreate agents_primary_category_check to include 'mcp_server'
-- before any INSERT.
--
-- Apply: Supabase SQL editor (copy-paste)

-- ── 0. Extend primary_category check constraint ───────────────────────────────
-- Original constraint allows: model_family | tokenized | service | developer
-- We extend it to also allow: mcp_server
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_primary_category_check;
ALTER TABLE agents ADD CONSTRAINT agents_primary_category_check
  CHECK (primary_category IN ('model_family', 'tokenized', 'service', 'developer', 'mcp_server'));

-- ── 1. Create mcp_server_metadata table ──────────────────────────────────────
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mcp_server_metadata' AND policyname = 'anon_read_mcp_server_metadata'
  ) THEN
    CREATE POLICY "anon_read_mcp_server_metadata" ON mcp_server_metadata FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mcp_server_metadata' AND policyname = 'service_write_mcp_server_metadata'
  ) THEN
    CREATE POLICY "service_write_mcp_server_metadata" ON mcp_server_metadata FOR ALL TO service_role USING (true);
  END IF;
END $$;

-- ── 2. Seed top MCP servers into agents table ─────────────────────────────────
-- Correct column names: display_name, bio, primary_category, website_url, github_url, tier
INSERT INTO agents (handle, display_name, bio, primary_category, tier, website_url, github_url, created_at)
VALUES
  ('filesystem-mcp', 'Filesystem MCP', 'Official Anthropic filesystem MCP server. Read/write files in allowed directories. Bundled with Claude Desktop.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('memory-mcp', 'Memory MCP', 'Official Anthropic memory server. Persistent key-value memory using knowledge graphs.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('brave-search-mcp', 'Brave Search MCP', 'Web and local search via Brave Search API. One of the most-installed MCP servers.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('github-mcp', 'GitHub MCP', 'Official GitHub MCP server. Repository management, PR review, issue tracking via Claude.', 'mcp_server', 'evidence_ranked', 'https://github.com/github/github-mcp-server', 'https://github.com/github/github-mcp-server', NOW()),
  ('postgres-mcp', 'PostgreSQL MCP', 'Direct PostgreSQL database access. Read-only query execution, schema inspection.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('puppeteer-mcp', 'Puppeteer MCP', 'Browser automation via Puppeteer. Screenshot, click, fill forms, extract content.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('sequential-thinking-mcp', 'Sequential Thinking MCP', 'Dynamic problem-solving via structured thought sequences. Official Anthropic server.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('slack-mcp', 'Slack MCP', 'Slack workspace integration. Channel management, messaging, search.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('agentcrush-mcp', 'AgentCrush MCP', 'AI agent economy index. Rankings, trust scores, protocol adoption, ecosystem trends. 12 tools.', 'mcp_server', 'evidence_ranked', 'https://agentcrush.xyz', 'https://github.com/kristof-sudo/agentcrush-app', NOW()),
  ('fetch-mcp', 'Fetch MCP', 'HTTP fetch tool for MCP. Retrieve and transform web content into LLM-friendly markdown.', 'mcp_server', 'evidence_ranked', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('google-maps-mcp', 'Google Maps MCP', 'Places, geocoding, directions via Google Maps API.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('sentry-mcp', 'Sentry MCP', 'Error monitoring integration. Retrieve Sentry issues and error reports via Claude.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('everart-mcp', 'EverArt MCP', 'AI image generation via EverArt models.', 'mcp_server', 'indexed', 'https://github.com/modelcontextprotocol/servers', 'https://github.com/modelcontextprotocol/servers', NOW()),
  ('base-mcp', 'Base MCP (Coinbase)', 'Coinbase Base blockchain interactions. Smart contracts, tokens, wallet operations via Claude.', 'mcp_server', 'evidence_ranked', 'https://github.com/coinbase/agentkit', 'https://github.com/coinbase/agentkit', NOW()),
  ('stripe-agent-toolkit-mcp', 'Stripe Agent Toolkit MCP', 'Stripe payments, customers, invoices, and billing via agent toolkit.', 'mcp_server', 'evidence_ranked', 'https://github.com/stripe/agent-toolkit', 'https://github.com/stripe/agent-toolkit', NOW())
ON CONFLICT (handle) DO UPDATE SET
  primary_category = EXCLUDED.primary_category,
  tier             = EXCLUDED.tier,
  bio              = EXCLUDED.bio,
  display_name     = EXCLUDED.display_name;

-- ── 3. Seed mcp_server_metadata ──────────────────────────────────────────────
INSERT INTO mcp_server_metadata (handle, tool_count, transport_types, registry_listings, npx_install)
VALUES
  ('filesystem-mcp',         8,  ARRAY['stdio'],        ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-filesystem'),
  ('memory-mcp',             6,  ARRAY['stdio'],        ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-memory'),
  ('brave-search-mcp',       2,  ARRAY['stdio'],        ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-brave-search'),
  ('github-mcp',             25, ARRAY['stdio','http'], ARRAY['official', 'smithery'],           'github-mcp-server'),
  ('postgres-mcp',           3,  ARRAY['stdio'],        ARRAY['official', 'smithery'],           '@modelcontextprotocol/server-postgres'),
  ('puppeteer-mcp',          7,  ARRAY['stdio'],        ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-puppeteer'),
  ('sequential-thinking-mcp',1,  ARRAY['stdio'],        ARRAY['official', 'smithery'],           '@modelcontextprotocol/server-sequential-thinking'),
  ('slack-mcp',              8,  ARRAY['stdio'],        ARRAY['official', 'smithery'],           '@modelcontextprotocol/server-slack'),
  ('agentcrush-mcp',         12, ARRAY['http'],         ARRAY['official', 'smithery', 'mcp_so'], NULL),
  ('fetch-mcp',              2,  ARRAY['stdio'],        ARRAY['official', 'smithery', 'mcp_so'], '@modelcontextprotocol/server-fetch'),
  ('base-mcp',               15, ARRAY['stdio','http'], ARRAY['smithery'],                       'coinbase-agentkit'),
  ('stripe-agent-toolkit-mcp',20,ARRAY['stdio','http'], ARRAY['smithery'],                       '@stripe/agent-toolkit')
ON CONFLICT (handle) DO UPDATE SET
  tool_count        = EXCLUDED.tool_count,
  transport_types   = EXCLUDED.transport_types,
  registry_listings = EXCLUDED.registry_listings,
  npx_install       = EXCLUDED.npx_install,
  updated_at        = NOW();

-- ── 4. Scoring view — joins agents + latest snapshot + mcp_server_metadata ───
-- agent_snapshots has: agent_id (FK to agents.id), github_stars, github_forks,
-- follower_count, score, rank. We take the most recent snapshot per agent.
CREATE OR REPLACE VIEW agent_score_mcp_server_v1 AS
WITH latest_snap AS (
  SELECT DISTINCT ON (agent_id)
    agent_id,
    github_stars,
    github_forks,
    follower_count,
    score AS snapshot_score,
    rank  AS snapshot_rank,
    created_at AS snapped_at
  FROM agent_snapshots
  ORDER BY agent_id, created_at DESC
)
SELECT
  a.handle,
  a.display_name                         AS name,
  a.bio                                  AS description,
  a.primary_category                     AS category,
  a.tier,
  COALESCE(ls.github_stars, 0)           AS github_stars,
  COALESCE(ls.github_forks, 0)           AS github_forks,
  COALESCE(ls.follower_count, 0)         AS follower_count,
  m.tool_count,
  m.registry_listings,
  m.transport_types,
  m.npx_install,
  -- Score: stars 30% + tool_count 25% + registry_count 20% + forks 15% + followers 10%
  ROUND(
    (LEAST(COALESCE(ls.github_stars,   0), 50000)::NUMERIC / 50000) * 30 +
    (LEAST(COALESCE(m.tool_count,      0), 30   )::NUMERIC / 30   ) * 25 +
    (LEAST(COALESCE(ARRAY_LENGTH(m.registry_listings, 1), 0), 5)::NUMERIC / 5) * 20 +
    (LEAST(COALESCE(ls.github_forks,   0), 5000 )::NUMERIC / 5000 ) * 15 +
    (LEAST(COALESCE(ls.follower_count, 0), 100000)::NUMERIC / 100000) * 10
  , 1) AS score,
  a.website_url                          AS homepage_url,
  ls.snapped_at                          AS updated_at
FROM agents a
LEFT JOIN latest_snap ls ON ls.agent_id = a.id
LEFT JOIN mcp_server_metadata m ON m.handle = a.handle
WHERE a.primary_category = 'mcp_server'
ORDER BY score DESC NULLS LAST;

-- ── 5. Notify PostgREST ───────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Verify: SELECT handle, name, score, tool_count, registry_listings FROM agent_score_mcp_server_v1 LIMIT 5;
