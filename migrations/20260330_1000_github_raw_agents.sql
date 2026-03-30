-- GitHub raw agent ingestion table
-- Date: 2026-03-30
-- Purpose: Store raw GitHub repo data from indexer before normalization into agents table.
--          Unique constraint on repo_url prevents duplicate inserts (idempotent runs).

CREATE TABLE IF NOT EXISTS github_raw_agents (
  id            BIGSERIAL PRIMARY KEY,
  repo_id       BIGINT        NOT NULL,
  name          TEXT          NOT NULL,
  full_name     TEXT          NOT NULL,
  owner         TEXT,
  description   TEXT,
  stars         INTEGER       DEFAULT 0,
  language      TEXT,
  repo_url      TEXT          NOT NULL,
  homepage_url  TEXT,
  topics        TEXT,
  created_at_gh TIMESTAMPTZ,
  pushed_at     TIMESTAMPTZ,
  source        TEXT          NOT NULL DEFAULT 'github',
  imported      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT github_raw_agents_repo_url_key UNIQUE (repo_url)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS github_raw_agents_stars_idx ON github_raw_agents (stars DESC);
CREATE INDEX IF NOT EXISTS github_raw_agents_imported_idx ON github_raw_agents (imported);
