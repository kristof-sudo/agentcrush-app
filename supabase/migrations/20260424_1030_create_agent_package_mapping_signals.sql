-- agent_package_mapping_signals: package identity/mapping evidence per agent.
-- Evidence only. Ranking/RPC processing will be added separately.

CREATE TABLE agent_package_mapping_signals (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  registry                        TEXT NOT NULL,
  package_name                    TEXT NOT NULL,
  package_version                 TEXT,
  mapping_status                  TEXT NOT NULL DEFAULT 'candidate',
  confidence                      INTEGER NOT NULL DEFAULT 0,
  match_reason                    TEXT,
  warning                         TEXT,
  evidence_source                 TEXT,
  github_full_name                TEXT,
  github_repo_url                 TEXT,
  website_url                     TEXT,
  registry_url                    TEXT,
  package_homepage                TEXT,
  package_repository_url          TEXT,
  registry_exists                 BOOLEAN NOT NULL DEFAULT FALSE,
  name_matches_repo               BOOLEAN,
  repo_url_matches_registry_metadata BOOLEAN,
  homepage_matches_agent          BOOLEAN,
  raw_package_file                JSONB NOT NULL DEFAULT '{}',
  raw_registry_metadata           JSONB NOT NULL DEFAULT '{}',
  errors                          JSONB NOT NULL DEFAULT '[]',
  observed_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date                   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_package_mapping_signals_registry_check
    CHECK (registry IN ('npm', 'pypi')),
  CONSTRAINT agent_package_mapping_signals_status_check
    CHECK (mapping_status IN ('candidate', 'high_auto', 'good_warn', 'manual_review', 'rejected', 'hard_reject')),
  CONSTRAINT agent_package_mapping_signals_confidence_check
    CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT agent_package_mapping_signals_unique_day
    UNIQUE (agent_id, registry, package_name, snapshot_date)
);

CREATE INDEX agent_package_mapping_signals_agent_id_idx ON agent_package_mapping_signals (agent_id);
CREATE INDEX agent_package_mapping_signals_registry_package_idx ON agent_package_mapping_signals (registry, package_name);
CREATE INDEX agent_package_mapping_signals_status_idx ON agent_package_mapping_signals (mapping_status);
CREATE INDEX agent_package_mapping_signals_confidence_idx ON agent_package_mapping_signals (confidence DESC);
CREATE INDEX agent_package_mapping_signals_snapshot_date_idx ON agent_package_mapping_signals (snapshot_date DESC);
CREATE INDEX agent_package_mapping_signals_observed_at_idx ON agent_package_mapping_signals (observed_at DESC);
