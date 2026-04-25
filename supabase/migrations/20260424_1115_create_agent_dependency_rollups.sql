-- Dependency graph rollup views.
-- Read-only analysis views. Do not write agent rows or affect rankings.

CREATE VIEW agent_dependency_edge_latest AS
WITH ranked AS (
  SELECT
    agent_dependency_edges.*,
    ROW_NUMBER() OVER (
      PARTITION BY scanned_repo, source_tier, source_preset, matched_agent_id, registry, package_name, dep_file, dep_type
      ORDER BY snapshot_date DESC, observed_at DESC, created_at DESC
    ) AS rn
  FROM agent_dependency_edges
)
SELECT
  id,
  scan_id,
  scanned_repo,
  scanned_repo_url,
  scanned_repo_stars,
  scanned_repo_language,
  source_tier,
  source_preset,
  matched_agent_id,
  matched_agent_handle,
  matched_agent_display_name,
  matched_agent_github_full_name,
  registry,
  package_name,
  dep_file,
  dep_type,
  match_source,
  mapping_confidence,
  same_repo,
  same_owner,
  evidence,
  observed_at,
  snapshot_date,
  updated_at
FROM ranked
WHERE rn = 1;

CREATE VIEW agent_dependency_repo_rollups AS
SELECT
  matched_agent_id AS agent_id,
  scanned_repo,
  MAX(scanned_repo_url) AS scanned_repo_url,
  MAX(scanned_repo_stars) AS scanned_repo_stars,
  MAX(scanned_repo_language) AS scanned_repo_language,
  MAX(snapshot_date) AS latest_snapshot_date,
  MAX(observed_at) AS latest_observed_at,
  BOOL_OR(same_owner) AS same_owner,
  BOOL_OR(same_repo) AS same_repo,
  COUNT(*) AS raw_edge_count,
  ARRAY_AGG(DISTINCT registry || ':' || package_name ORDER BY registry || ':' || package_name) AS matched_packages,
  ARRAY_AGG(DISTINCT dep_file ORDER BY dep_file) AS dep_files,
  ARRAY_AGG(DISTINCT dep_type ORDER BY dep_type) AS dep_types,
  MAX(mapping_confidence) AS max_mapping_confidence,
  MAX(scanned_repo_stars) AS repo_stars_for_rollup
FROM agent_dependency_edge_latest
GROUP BY matched_agent_id, scanned_repo;

CREATE VIEW agent_dependency_signal_rollups AS
WITH repo_rollups AS (
  SELECT
    *,
    COALESCE(repo_stars_for_rollup, 0) AS repo_stars
  FROM agent_dependency_repo_rollups
),
agent_rollups AS (
  SELECT
    agent_id,
    COUNT(*) AS unique_dependent_repos,
    COUNT(*) FILTER (WHERE same_owner = FALSE AND same_repo = FALSE) AS external_dependent_repos,
    COUNT(*) FILTER (WHERE same_owner = TRUE AND same_repo = FALSE) AS same_owner_dependent_repos,
    COUNT(*) FILTER (WHERE same_repo = TRUE) AS same_repo_repos,
    COALESCE(SUM(raw_edge_count), 0) AS raw_edge_count,
    COALESCE(SUM(repo_stars), 0) AS total_dependent_repo_stars,
    COALESCE(SUM(repo_stars) FILTER (WHERE same_owner = FALSE AND same_repo = FALSE), 0) AS external_dependent_repo_stars,
    COALESCE(SUM(repo_stars) FILTER (WHERE same_owner = TRUE AND same_repo = FALSE), 0) AS same_owner_dependent_repo_stars,
    MAX(latest_observed_at) AS latest_observed_at
  FROM repo_rollups
  GROUP BY agent_id
),
strongest_repos AS (
  SELECT
    agent_id,
    scanned_repo AS strongest_dependent_repo,
    repo_stars AS strongest_dependent_repo_stars,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id
      ORDER BY repo_stars DESC, latest_observed_at DESC, scanned_repo ASC
    ) AS rn
  FROM repo_rollups
),
strongest_external_repos AS (
  SELECT
    agent_id,
    scanned_repo AS strongest_external_dependent_repo,
    repo_stars AS strongest_external_dependent_repo_stars,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id
      ORDER BY repo_stars DESC, latest_observed_at DESC, scanned_repo ASC
    ) AS rn
  FROM repo_rollups
  WHERE same_owner = FALSE AND same_repo = FALSE
),
scored AS (
  SELECT
    agent_rollups.*,
    (
      external_dependent_repo_stars +
      same_owner_dependent_repo_stars * 0.25 +
      external_dependent_repos * 100 +
      same_owner_dependent_repos * 25
    ) AS weighted_strength
  FROM agent_rollups
)
SELECT
  scored.agent_id,
  scored.unique_dependent_repos,
  scored.external_dependent_repos,
  scored.same_owner_dependent_repos,
  scored.same_repo_repos,
  scored.raw_edge_count,
  scored.total_dependent_repo_stars,
  scored.external_dependent_repo_stars,
  scored.same_owner_dependent_repo_stars,
  strongest_repos.strongest_dependent_repo,
  strongest_repos.strongest_dependent_repo_stars,
  strongest_external_repos.strongest_external_dependent_repo,
  strongest_external_repos.strongest_external_dependent_repo_stars,
  scored.latest_observed_at,
  scored.weighted_strength,
  ROUND(LN(1 + scored.weighted_strength)::numeric, 4) AS dependency_log_strength,
  LEAST(
    100,
    ROUND((LN(1 + scored.weighted_strength) / LN(1 + 50000) * 100)::numeric, 2)
  ) AS dependency_score_candidate
FROM scored
LEFT JOIN strongest_repos
  ON strongest_repos.agent_id = scored.agent_id
  AND strongest_repos.rn = 1
LEFT JOIN strongest_external_repos
  ON strongest_external_repos.agent_id = scored.agent_id
  AND strongest_external_repos.rn = 1;
