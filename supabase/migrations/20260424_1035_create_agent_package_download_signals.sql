-- agent_package_download_signals: package download observations per agent.
-- Evidence only. Ranking/RPC processing will be added separately.

CREATE TABLE agent_package_download_signals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  registry           TEXT NOT NULL,
  package_name       TEXT NOT NULL,
  download_window    TEXT NOT NULL,
  period_start       DATE,
  period_end         DATE,
  downloads          INTEGER NOT NULL DEFAULT 0,
  source_url         TEXT,
  mapping_confidence INTEGER,
  mapping_status     TEXT,
  raw                JSONB NOT NULL DEFAULT '{}',
  observed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_package_download_signals_registry_check
    CHECK (registry IN ('npm', 'pypi')),
  CONSTRAINT agent_package_download_signals_window_check
    CHECK (download_window IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT agent_package_download_signals_unique_period
    UNIQUE (agent_id, registry, package_name, download_window, period_start, period_end)
);

CREATE INDEX agent_package_download_signals_agent_id_idx ON agent_package_download_signals (agent_id);
CREATE INDEX agent_package_download_signals_registry_package_idx ON agent_package_download_signals (registry, package_name);
CREATE INDEX agent_package_download_signals_window_idx ON agent_package_download_signals (download_window);
CREATE INDEX agent_package_download_signals_downloads_idx ON agent_package_download_signals (downloads DESC);
CREATE INDEX agent_package_download_signals_snapshot_date_idx ON agent_package_download_signals (snapshot_date DESC);
CREATE INDEX agent_package_download_signals_observed_at_idx ON agent_package_download_signals (observed_at DESC);
