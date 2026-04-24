-- Package usage signal views.
-- Read-only analysis views. Do not write agent rows or affect rankings.

CREATE VIEW agent_package_mapping_latest AS
WITH ranked AS (
  SELECT
    agent_package_mapping_signals.*,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id, registry, package_name
      ORDER BY snapshot_date DESC, observed_at DESC, created_at DESC
    ) AS rn
  FROM agent_package_mapping_signals
)
SELECT
  agent_id,
  registry,
  package_name,
  package_version,
  mapping_status,
  confidence,
  match_reason,
  warning,
  evidence_source,
  github_full_name,
  github_repo_url,
  website_url,
  registry_url,
  package_homepage,
  package_repository_url,
  registry_exists,
  name_matches_repo,
  repo_url_matches_registry_metadata,
  homepage_matches_agent,
  observed_at,
  snapshot_date,
  updated_at
FROM ranked
WHERE rn = 1;

CREATE VIEW agent_package_download_latest AS
WITH ranked AS (
  SELECT
    agent_package_download_signals.*,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id, registry, package_name, download_window
      ORDER BY period_end DESC, snapshot_date DESC, observed_at DESC, created_at DESC
    ) AS rn
  FROM agent_package_download_signals
)
SELECT
  agent_id,
  registry,
  package_name,
  download_window,
  period_start,
  period_end,
  downloads,
  source_url,
  mapping_confidence,
  mapping_status,
  observed_at,
  snapshot_date,
  updated_at
FROM ranked
WHERE rn = 1;

CREATE VIEW agent_package_usage_rollups AS
WITH high_auto_mappings AS (
  SELECT
    agent_id,
    registry,
    package_name
  FROM agent_package_mapping_latest
  WHERE mapping_status = 'high_auto'
),
weekly_downloads AS (
  SELECT
    agent_id,
    registry,
    package_name,
    downloads,
    period_end
  FROM agent_package_download_latest
  WHERE download_window = 'weekly'
)
SELECT
  high_auto_mappings.agent_id,
  COUNT(*) AS package_count,
  COUNT(*) FILTER (WHERE high_auto_mappings.registry = 'npm') AS npm_package_count,
  COUNT(*) FILTER (WHERE high_auto_mappings.registry = 'pypi') AS pypi_package_count,
  COALESCE(SUM(weekly_downloads.downloads), 0) AS weekly_downloads_total,
  COALESCE(SUM(weekly_downloads.downloads) FILTER (WHERE high_auto_mappings.registry = 'npm'), 0) AS npm_weekly_downloads,
  COALESCE(SUM(weekly_downloads.downloads) FILTER (WHERE high_auto_mappings.registry = 'pypi'), 0) AS pypi_weekly_downloads,
  MAX(weekly_downloads.period_end) AS latest_period_end,
  COUNT(*) FILTER (WHERE weekly_downloads.package_name IS NULL) AS missing_download_count,
  ROUND(LN(1 + COALESCE(SUM(weekly_downloads.downloads), 0))::numeric, 4) AS usage_log_downloads,
  LEAST(
    100,
    ROUND((LN(1 + COALESCE(SUM(weekly_downloads.downloads), 0)) / LN(1 + 2000000) * 100)::numeric, 2)
  ) AS usage_score_candidate
FROM high_auto_mappings
LEFT JOIN weekly_downloads
  ON weekly_downloads.agent_id = high_auto_mappings.agent_id
  AND weekly_downloads.registry = high_auto_mappings.registry
  AND weekly_downloads.package_name = high_auto_mappings.package_name
GROUP BY high_auto_mappings.agent_id;
