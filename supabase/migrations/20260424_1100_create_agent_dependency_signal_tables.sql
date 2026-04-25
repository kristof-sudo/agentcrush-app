-- Dependency graph signal tables.
-- Raw evidence only. Ranking/RPC processing will be added separately.

CREATE TABLE agent_dependency_scans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_repo          TEXT NOT NULL,
  scanned_repo_url      TEXT,
  scanned_repo_stars    INTEGER,
  scanned_repo_language TEXT,
  source_tier           TEXT NOT NULL,
  source_preset         TEXT,
  source_query          TEXT,
  dep_file              TEXT NOT NULL,
  scan_status           TEXT NOT NULL,
  raw_deps              JSONB NOT NULL DEFAULT '[]',
  fetch_error           TEXT,
  parse_error           TEXT,
  observed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_dependency_scans_source_tier_check
    CHECK (source_tier IN ('indexed', 'search')),
  CONSTRAINT agent_dependency_scans_source_preset_check
    CHECK (source_preset IN ('indexed', 'general', 'python', 'javascript', 'multiagent')),
  CONSTRAINT agent_dependency_scans_scan_status_check
    CHECK (scan_status IN ('ok', 'no_file', 'fetch_error', 'parse_error')),
  CONSTRAINT agent_dependency_scans_unique_day
    UNIQUE (scanned_repo, dep_file, snapshot_date)
);

CREATE INDEX agent_dependency_scans_scanned_repo_idx ON agent_dependency_scans (scanned_repo);
CREATE INDEX agent_dependency_scans_source_tier_idx ON agent_dependency_scans (source_tier);
CREATE INDEX agent_dependency_scans_source_preset_idx ON agent_dependency_scans (source_preset);
CREATE INDEX agent_dependency_scans_scan_status_idx ON agent_dependency_scans (scan_status);
CREATE INDEX agent_dependency_scans_snapshot_date_idx ON agent_dependency_scans (snapshot_date DESC);
CREATE INDEX agent_dependency_scans_observed_at_idx ON agent_dependency_scans (observed_at DESC);
CREATE INDEX agent_dependency_scans_stars_idx ON agent_dependency_scans (scanned_repo_stars DESC);

CREATE TABLE agent_dependency_edges (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id                        UUID REFERENCES agent_dependency_scans(id) ON DELETE CASCADE,
  scanned_repo                   TEXT NOT NULL,
  scanned_repo_url               TEXT,
  scanned_repo_stars             INTEGER,
  scanned_repo_language          TEXT,
  source_tier                    TEXT NOT NULL,
  source_preset                  TEXT,
  matched_agent_id               UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  matched_agent_handle           TEXT,
  matched_agent_display_name     TEXT,
  matched_agent_github_full_name TEXT,
  registry                       TEXT NOT NULL,
  package_name                   TEXT NOT NULL,
  dep_file                       TEXT NOT NULL,
  dep_type                       TEXT NOT NULL,
  match_source                   TEXT NOT NULL,
  mapping_confidence             INTEGER NOT NULL,
  same_repo                      BOOLEAN NOT NULL DEFAULT FALSE,
  same_owner                     BOOLEAN NOT NULL DEFAULT FALSE,
  evidence                       JSONB NOT NULL DEFAULT '{}',
  observed_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_dependency_edges_source_tier_check
    CHECK (source_tier IN ('indexed', 'search')),
  CONSTRAINT agent_dependency_edges_source_preset_check
    CHECK (source_preset IN ('indexed', 'general', 'python', 'javascript', 'multiagent')),
  CONSTRAINT agent_dependency_edges_registry_check
    CHECK (registry IN ('npm', 'pypi')),
  CONSTRAINT agent_dependency_edges_dep_type_check
    CHECK (dep_type IN ('dependency', 'dev_dependency', 'peer_dependency')),
  CONSTRAINT agent_dependency_edges_match_source_check
    CHECK (match_source IN ('exact', 'normalized')),
  CONSTRAINT agent_dependency_edges_mapping_confidence_check
    CHECK (mapping_confidence BETWEEN 0 AND 100),
  CONSTRAINT agent_dependency_edges_unique_day
    UNIQUE (scanned_repo, matched_agent_id, registry, package_name, dep_file, dep_type, snapshot_date)
);

CREATE INDEX agent_dependency_edges_matched_agent_id_idx ON agent_dependency_edges (matched_agent_id);
CREATE INDEX agent_dependency_edges_registry_package_idx ON agent_dependency_edges (registry, package_name);
CREATE INDEX agent_dependency_edges_scanned_repo_idx ON agent_dependency_edges (scanned_repo);
CREATE INDEX agent_dependency_edges_source_tier_idx ON agent_dependency_edges (source_tier);
CREATE INDEX agent_dependency_edges_source_preset_idx ON agent_dependency_edges (source_preset);
CREATE INDEX agent_dependency_edges_dep_type_idx ON agent_dependency_edges (dep_type);
CREATE INDEX agent_dependency_edges_same_owner_idx ON agent_dependency_edges (same_owner);
CREATE INDEX agent_dependency_edges_snapshot_date_idx ON agent_dependency_edges (snapshot_date DESC);
CREATE INDEX agent_dependency_edges_observed_at_idx ON agent_dependency_edges (observed_at DESC);
CREATE INDEX agent_dependency_edges_stars_idx ON agent_dependency_edges (scanned_repo_stars DESC);
