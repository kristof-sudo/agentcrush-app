-- Store fresh GitHub liveness on agents so the Ghost Check (and Ghost Index) can
-- show REAL activity without a per-request GitHub fetch. Populated by the
-- github-liveness-refresh worker (VPS GitHub token, daily).
--
-- Why: our last_event_at is null for ~88% of agents, so liveness read months-old
-- even for active projects. github_pushed_at is the agent's true last code activity.
--
-- Date: 2026-06-17. Scope: agents table only. Idempotent. Non-destructive.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS github_pushed_at   timestamptz;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS github_stars_live  integer;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS github_checked_at  timestamptz;

COMMENT ON COLUMN agents.github_pushed_at  IS 'Repo last push (real liveness), refreshed daily from GitHub';
COMMENT ON COLUMN agents.github_stars_live IS 'Live GitHub star count, refreshed daily';
COMMENT ON COLUMN agents.github_checked_at IS 'When github_pushed_at/stars were last refreshed';
