-- agent_docs_quality_latest: latest documentation quality observation per agent.
-- Read-only analysis view. Does not write agent rows or affect rankings.

CREATE VIEW agent_docs_quality_latest AS
WITH ranked AS (
  SELECT
    agent_docs_quality_signals.*,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id
      ORDER BY snapshot_date DESC, observed_at DESC, created_at DESC
    ) AS rn
  FROM agent_docs_quality_signals
)
SELECT
  agent_id,
  github_full_name,
  github_repo_url,
  website_url,
  snapshot_date,
  observed_at,
  default_branch,
  repo_pushed_at,
  last_release_tag,
  last_release_published_at,
  docs_quality_score,
  docs_quality_tier,
  score_components,
  readme_exists,
  readme_bytes,
  has_install_section,
  has_usage_section,
  has_api_or_config_section,
  has_run_or_demo_command,
  has_docs_dir,
  docs_file_count,
  has_examples_dir,
  examples_file_count,
  has_package_json,
  has_pyproject_toml,
  has_license,
  license_name,
  has_security_md,
  has_changelog,
  mentions_agent_concepts,
  mentions_llm_concepts,
  has_external_docs_link,
  evidence,
  errors,
  raw,
  updated_at
FROM ranked
WHERE rn = 1;
