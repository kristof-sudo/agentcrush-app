-- Create hf_derivatives table for the HuggingFace derivatives aggregation.
-- Date: 2026-05-15
-- Purpose: Aggregate downstream adoption signal per base model — counts of
--          fine-tunes / quantizations / adapters / merges that declare a
--          given base_model. Step (c.2) of the Category Index Pivot.
--          Second capability signal (after LMArena) needed to push
--          model_family agents past the 3-of-5 evidence-ready threshold.
--
-- Read-only aggregation. One row per declared base_model (canonical HF
-- model_id "owner/name"). No scoring impact in this migration; plumbing
-- into agent_score_model_family_v1 (derivatives_score column) is a
-- SEPARATE downstream migration — see runtime/README.md.
--
-- Source: aggregated locally from `hf_models.tags` JSONB. HuggingFace
-- surfaces base-model declarations as tag entries like:
--   "base_model:Qwen/Qwen2.5-7B-Instruct"
--   "base_model:finetune:Qwen/Qwen2.5-7B-Instruct"
--   "base_model:quantized:Qwen/Qwen2.5-7B-Instruct"
--   "base_model:adapter:OWNER/NAME"
--   "base_model:merge:OWNER/NAME"
-- The plain `base_model:owner/name` tag is always present when a kind
-- variant is, so we dedupe per derivative model_id during aggregation.
--
-- Aggregator: runtime/hf-derivatives-aggregator.mjs
-- Cron:       ops/systemd/agentcrush-hf-derivatives-aggregate.{service,timer}
--             (daily 05:15 Budapest local — after Virtuals 05:00, before Agentverse 05:30)

CREATE TABLE IF NOT EXISTS hf_derivatives (
  base_model                     TEXT PRIMARY KEY,          -- "owner/name" canonical HF id of the declared parent
  base_author                    TEXT,                      -- owner prefix (left of "/")
  derivatives_count              INTEGER NOT NULL DEFAULT 0,
  derivatives_total_downloads    BIGINT  NOT NULL DEFAULT 0,
  derivatives_total_likes        INTEGER NOT NULL DEFAULT 0,
  sample_derivative_ids          JSONB,                     -- top 10 derivatives by downloads, for transparency display
  last_aggregated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hf_derivatives_count
  ON hf_derivatives (derivatives_count DESC);

CREATE INDEX IF NOT EXISTS idx_hf_derivatives_total_downloads
  ON hf_derivatives (derivatives_total_downloads DESC);

CREATE INDEX IF NOT EXISTS idx_hf_derivatives_base_author
  ON hf_derivatives (base_author);

CREATE INDEX IF NOT EXISTS idx_hf_derivatives_last_aggregated_at
  ON hf_derivatives (last_aggregated_at DESC);

-- updated_at auto-bump (mirrors pattern in hf_models / lmarena_models migrations)
CREATE OR REPLACE FUNCTION trg_hf_derivatives_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hf_derivatives_touch ON hf_derivatives;
CREATE TRIGGER hf_derivatives_touch
  BEFORE UPDATE ON hf_derivatives
  FOR EACH ROW EXECUTE FUNCTION trg_hf_derivatives_touch();

COMMENT ON TABLE hf_derivatives IS
  'Aggregated downstream-adoption signal per base model. One row per declared base_model HF id ("owner/name"). Populated by runtime/hf-derivatives-aggregator.mjs against the local hf_models cache (no extra HF API calls). Step (c.2) of Category Index Pivot — second capability signal for model_family scoring. Per-base counters: derivatives_count, derivatives_total_downloads, derivatives_total_likes, plus sample_derivative_ids (top 10 by downloads). No scoring impact until a separate migration plumbs derivatives_score into agent_score_model_family_v1.';
