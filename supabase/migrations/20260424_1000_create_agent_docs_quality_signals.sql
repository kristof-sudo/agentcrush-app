-- agent_docs_quality_signals: raw/evaluated documentation quality evidence per agent.
-- Evidence only. Ranking/RPC processing will be added separately.

CREATE TABLE agent_docs_quality_signals (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                   UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  github_full_name           TEXT,
  github_repo_url            TEXT,
  website_url                TEXT,
  observed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date              DATE NOT NULL DEFAULT CURRENT_DATE,

  default_branch             TEXT,
  repo_pushed_at             TIMESTAMPTZ,
  last_release_tag           TEXT,
  last_release_published_at  TIMESTAMPTZ,

  docs_quality_score         NUMERIC NOT NULL DEFAULT 0,
  docs_quality_tier          TEXT,
  score_components           JSONB NOT NULL DEFAULT '{}',

  readme_exists              BOOLEAN NOT NULL DEFAULT FALSE,
  readme_bytes               INTEGER DEFAULT 0,
  readme_sections            JSONB NOT NULL DEFAULT '[]',
  has_install_section        BOOLEAN NOT NULL DEFAULT FALSE,
  has_usage_section          BOOLEAN NOT NULL DEFAULT FALSE,
  has_api_or_config_section  BOOLEAN NOT NULL DEFAULT FALSE,
  has_run_or_demo_command    BOOLEAN NOT NULL DEFAULT FALSE,

  has_docs_dir               BOOLEAN NOT NULL DEFAULT FALSE,
  docs_file_count            INTEGER DEFAULT 0,
  has_examples_dir           BOOLEAN NOT NULL DEFAULT FALSE,
  examples_file_count        INTEGER DEFAULT 0,
  has_package_json           BOOLEAN NOT NULL DEFAULT FALSE,
  has_pyproject_toml         BOOLEAN NOT NULL DEFAULT FALSE,
  package_name               TEXT,
  package_version            TEXT,

  has_license                BOOLEAN NOT NULL DEFAULT FALSE,
  license_name               TEXT,
  has_security_md            BOOLEAN NOT NULL DEFAULT FALSE,
  has_changelog              BOOLEAN NOT NULL DEFAULT FALSE,

  mentions_agent_concepts    BOOLEAN NOT NULL DEFAULT FALSE,
  mentions_llm_concepts      BOOLEAN NOT NULL DEFAULT FALSE,
  has_external_docs_link     BOOLEAN NOT NULL DEFAULT FALSE,

  evidence                   JSONB NOT NULL DEFAULT '{}',
  errors                     JSONB NOT NULL DEFAULT '[]',
  raw                        JSONB NOT NULL DEFAULT '{}',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_docs_quality_signals_unique_day UNIQUE (agent_id, snapshot_date)
);

CREATE INDEX agent_docs_quality_signals_agent_id_idx ON agent_docs_quality_signals (agent_id);
CREATE INDEX agent_docs_quality_signals_snapshot_date_idx ON agent_docs_quality_signals (snapshot_date DESC);
CREATE INDEX agent_docs_quality_signals_score_idx ON agent_docs_quality_signals (docs_quality_score DESC);
CREATE INDEX agent_docs_quality_signals_tier_idx ON agent_docs_quality_signals (docs_quality_tier);
CREATE INDEX agent_docs_quality_signals_observed_at_idx ON agent_docs_quality_signals (observed_at DESC);
