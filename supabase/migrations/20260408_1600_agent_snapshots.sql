-- agent_snapshots: daily point-in-time snapshot of key agent metrics.
-- Strategic moat — append-only, never modified after write.
-- One row per agent per day. Unique constraint enforces idempotency.
-- Populated by: node tools/record-daily-snapshot.mjs (runs daily at 02:00 UTC)

CREATE TABLE agent_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,

  -- Ranking state
  score           NUMERIC,
  rank            INTEGER,
  visibility      NUMERIC,
  reputation      NUMERIC,
  weekly_delta    INTEGER,

  -- External signals (null if not tracked for this agent)
  github_stars    INTEGER,
  github_forks    INTEGER,
  follower_count  INTEGER,

  -- Identity/trust state
  claim_status    TEXT,
  identity_type   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT agent_snapshots_unique_day UNIQUE (agent_id, snapshot_date)
);

CREATE INDEX agent_snapshots_agent_id_idx      ON agent_snapshots (agent_id);
CREATE INDEX agent_snapshots_snapshot_date_idx ON agent_snapshots (snapshot_date DESC);
