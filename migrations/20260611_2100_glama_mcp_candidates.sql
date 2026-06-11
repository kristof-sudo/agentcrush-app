-- Migration: 20260611_2100_glama_mcp_candidates.sql
-- Purpose: B8 — MCP server v2 ingestion, staging layer.
--
-- Glama's list API exposes no quality discriminator (every listing has a repo
-- + description; tool counts are detail-only), so raw ingestion into `agents`
-- would flood the index and move the Ghost Index denominator. Per house
-- precedent (Virtuals -> virtuals_agents -> Kris-approved promotion), Glama
-- discoveries land in a staging table; a separate promoter (Kris-gated
-- --write) joins GitHub evidence and promotes only repos that clear the
-- stars/activity bar into agents as indexed mcp_server rows.
--
-- Populated by runtime/glama-mcp-fetcher.mjs (weekly on VPS; local-runnable).
-- Service-role only.
--
-- Apply: Supabase SQL editor (copy-paste)

CREATE TABLE IF NOT EXISTS glama_mcp_candidates (
  id               BIGSERIAL PRIMARY KEY,
  handle           TEXT NOT NULL UNIQUE,        -- mcp_<namespace>_<slug>
  display_name     TEXT,
  description      TEXT,
  github_url       TEXT,
  github_full_name TEXT,
  website_url      TEXT,
  tool_count       INTEGER,                     -- null until detail data exists
  license          TEXT,
  attributes       JSONB NOT NULL DEFAULT '[]',
  glama_namespace  TEXT,
  glama_slug       TEXT,
  github_stars     INTEGER,                     -- filled by the promoter's evidence join
  github_pushed_at TIMESTAMPTZ,
  github_archived  BOOLEAN,
  github_checked_at TIMESTAMPTZ,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_at      TIMESTAMPTZ,                 -- set by the promoter when moved into agents
  promoted_agent_id UUID REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS glama_mcp_candidates_repo_idx ON glama_mcp_candidates (github_full_name);
CREATE INDEX IF NOT EXISTS glama_mcp_candidates_promoted_idx ON glama_mcp_candidates (promoted_at);

ALTER TABLE glama_mcp_candidates ENABLE ROW LEVEL SECURITY;
-- service-role only

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'glama_mcp_candidates' AND policyname = 'service_all_glama_candidates'
  ) THEN
    CREATE POLICY "service_all_glama_candidates" ON glama_mcp_candidates
      FOR ALL TO service_role USING (true);
  END IF;
END $$;
