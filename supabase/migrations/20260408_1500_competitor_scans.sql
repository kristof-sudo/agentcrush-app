-- competitor_scans: structured log of manual competitor intelligence observations
-- Populated via: node tools/competitor-scan.mjs
-- Queried via: GET /api/mission-control/competitor-scans

CREATE TABLE competitor_scans (
  id           BIGSERIAL PRIMARY KEY,
  competitor   TEXT NOT NULL,                    -- e.g. 'aiagentsdirectory.com'
  scan_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  changes      JSONB NOT NULL DEFAULT '[]',      -- array of strings: observed changes
  signals      JSONB NOT NULL DEFAULT '[]',      -- array of strings: strategic signals
  recommendation TEXT CHECK (recommendation IN ('copy', 'explore', 'watch', 'ignore')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX competitor_scans_competitor_idx ON competitor_scans (competitor);
CREATE INDEX competitor_scans_created_at_idx ON competitor_scans (created_at DESC);
