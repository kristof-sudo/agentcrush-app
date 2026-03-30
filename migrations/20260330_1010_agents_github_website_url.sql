-- Add github_url and website_url columns to agents table
-- Date: 2026-03-30
-- Purpose: Support GitHub-sourced agents with direct repo and homepage links.
--          Also enables ↗ external link icon in rankings table.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS github_url  TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;
