-- Create hf_models table for daily HuggingFace model index mirror
-- Date: 2026-05-15
-- Purpose: Mirror the public HuggingFace model index
--          (https://huggingface.co/api/models) into AgentCrush so we can
--          surface the model_family category. Step (b) of the Category
--          Index Pivot.
--
-- Read-only mirror. No scoring impact. One row per HF model_id ("owner/name").
-- Promotion of model_family rows into the `agents` table is a SEPARATE step,
-- gated on Kris-approved thresholds (currently planned:
--   downloads > 100,000 AND author in known-model-family allowlist).
--
-- Sync worker: runtime/hf-models-adapter.mjs
-- Cron:        ops/systemd/agentcrush-hf-models-sync.{service,timer}
--              (daily 04:30 Budapest local)

CREATE TABLE IF NOT EXISTS hf_models (
  model_id           TEXT PRIMARY KEY,              -- "owner/name" canonical HF id
  author             TEXT,                          -- org or user (left side of "/")
  pipeline_tag       TEXT,                          -- e.g. "text-generation", "image-generation"
  tags               JSONB,                         -- array of tags
  downloads          INTEGER,                       -- last 30d downloads (HF reported)
  likes              INTEGER,
  library_name       TEXT,                          -- e.g. "transformers"
  gated              BOOLEAN,                       -- gated model (still included)

  -- HF-side timestamps
  created_at_hf      TIMESTAMPTZ,                   -- HF createdAt
  last_modified_at   TIMESTAMPTZ,                   -- HF lastModified

  -- Change detection + full record
  raw_payload        JSONB NOT NULL,
  payload_hash       TEXT NOT NULL,                 -- sha256 of canonical raw_payload

  -- Lifecycle timestamps
  first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at         TIMESTAMPTZ,                   -- set when row falls out of top-N fetch
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hf_models_downloads
  ON hf_models (downloads DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_hf_models_likes
  ON hf_models (likes DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_hf_models_author
  ON hf_models (author);

CREATE INDEX IF NOT EXISTS idx_hf_models_pipeline_tag
  ON hf_models (pipeline_tag);

CREATE INDEX IF NOT EXISTS idx_hf_models_last_modified_at
  ON hf_models (last_modified_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_hf_models_last_seen_at
  ON hf_models (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_hf_models_payload_hash
  ON hf_models (payload_hash);

-- updated_at auto-bump (mirrors pattern in virtuals_agents migration)
CREATE OR REPLACE FUNCTION trg_hf_models_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hf_models_touch ON hf_models;
CREATE TRIGGER hf_models_touch
  BEFORE UPDATE ON hf_models
  FOR EACH ROW EXECUTE FUNCTION trg_hf_models_touch();

COMMENT ON TABLE hf_models IS
  'Read-only mirror of the public HuggingFace model index (huggingface.co/api/models). One row per HF model_id ("owner/name"). Populated daily by runtime/hf-models-adapter.mjs — fetches the top ~10k models by downloads. Step (b) of Category Index Pivot, source signal for the model_family agent category. Promotion into `agents` is a separate gated step. No scoring impact.';
