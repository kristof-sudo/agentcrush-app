-- Create model_family_deployments table + agents.model_family_search_keywords
-- Date: 2026-05-16
-- Depends on: 20260515_1200_add_agent_categories.sql
-- Depends on: bazaar_resources, erc8004_registry, agentverse_agents, virtuals_agents, a2a_agents tables
--
-- Step (c.4) of the Category Index Pivot. Adds the 5th and most-moaty signal
-- for model_family scoring: DEPLOYMENT.
--
-- The thesis: HF + LMArena + Derivatives + Citations measure model adoption,
-- capability, downstream HF interest, and research impact respectively — but
-- none of them measure "which model families are actually being deployed by
-- agents in the agent economy." That's a question only AgentCrush can answer
-- because only AgentCrush has the cross-protocol index:
--
--   - agents (1,338 rows)        — our own indexed agents' bios/taglines
--   - bazaar_resources (46,888)  — CDP x402 endpoints with descriptions
--   - erc8004_registry (29,384)  — on-chain Base ERC-8004 agents
--   - agentverse_agents (10,000) — Fetch.ai Agentverse agents
--   - virtuals_agents (40,598)   — Virtuals Protocol tokenized agents
--   - a2a_agents (409)           — A2A protocol GitHub repos
--
-- For each model_family agent, we scan the text fields of these tables for
-- declared/implied model usage. Aggregate count per source is stored in
-- model_family_deployments; total goes into deployment_score in the view.
--
-- Methodology: replaces the previously-reserved social_score slot. Top-level
-- weights stay: HF 30 / derivatives 20 / LMArena 25 / citations 15 / deployment 10.
--
-- Scoring formula:
--   deployment_score = LEAST(100, ROUND( LOG(10, GREATEST(1, total_deployments)) * 30 ))
--   Coefficient 30 chosen because deployment counts are low-volume (single
--   digits to low hundreds): 1→0, 10→30, 100→60, 1000→90.
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. model_family_deployments table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.model_family_deployments (
  model_family_handle  TEXT NOT NULL,                  -- agents.handle of the model_family agent
  source_table         TEXT NOT NULL,                  -- 'agents'|'bazaar_resources'|'erc8004_registry'|'agentverse_agents'|'virtuals_agents'|'a2a_agents'
  deployment_count     INTEGER NOT NULL DEFAULT 0,
  sample_matches       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- top 10 sample rows for transparency (id, snippet, matched_keyword)
  match_keywords       TEXT[] NOT NULL DEFAULT '{}'::text[],
  last_aggregated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (model_family_handle, source_table)
);

COMMENT ON TABLE public.model_family_deployments IS
  'Per-agent-family, per-source deployment count. Aggregated daily by runtime/deployment-aggregator.mjs which ILIKE-scans text fields across agents, bazaar_resources, erc8004_registry, agentverse_agents, virtuals_agents, a2a_agents for model_family_search_keywords. Feeds the deployment_score column in agent_score_model_family_v1.';

CREATE INDEX IF NOT EXISTS idx_model_family_deployments_handle      ON public.model_family_deployments (model_family_handle);
CREATE INDEX IF NOT EXISTS idx_model_family_deployments_count       ON public.model_family_deployments (deployment_count DESC);
CREATE INDEX IF NOT EXISTS idx_model_family_deployments_aggregated  ON public.model_family_deployments (last_aggregated_at DESC);

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION trg_model_family_deployments_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'model_family_deployments_touch') THEN
    CREATE TRIGGER model_family_deployments_touch
      BEFORE UPDATE ON public.model_family_deployments
      FOR EACH ROW EXECUTE FUNCTION trg_model_family_deployments_touch();
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. agents.model_family_search_keywords
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS model_family_search_keywords TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.agents.model_family_search_keywords IS
  'Curated list of search keywords used to find deployment mentions across the index. Multiple variants per model family handle case differences and version-suffixed names. ILIKE-matched (case-insensitive) by deployment-aggregator.mjs.';

CREATE INDEX IF NOT EXISTS idx_agents_model_family_search_keywords_gin
  ON public.agents USING GIN (model_family_search_keywords);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Backfill seed keywords for the 5 model_family agents
-- ──────────────────────────────────────────────────────────────────────────────
-- Choice notes:
--   - Each keyword is the substring used in ILIKE matching (e.g. 'qwen3' matches 'Qwen3', 'qwen3-235b', etc.)
--   - More specific keywords ("llama 3") reduce false positives vs bare 'llama'
--   - Hermes is hardest (greek god / fashion brand), so we lean on "nous" and version suffixes
--   - Qwen / DeepSeek are unique enough to allow bare matches

UPDATE public.agents SET model_family_search_keywords = ARRAY[
  'nous hermes',
  'hermes-3',
  'hermes 3',
  'hermes-4',
  'hermes 4',
  'nousresearch'
]::TEXT[] WHERE handle = 'nousresearch_hermes_agent';

UPDATE public.agents SET model_family_search_keywords = ARRAY[
  'gemini',
  'gemini-pro',
  'gemini-1.5',
  'gemini-2',
  'gemini-3',
  'gemma'
]::TEXT[] WHERE handle = 'gemini';

UPDATE public.agents SET model_family_search_keywords = ARRAY[
  'deepseek',
  'deepseek-v3',
  'deepseek-v2',
  'deepseek-r1'
]::TEXT[] WHERE handle = 'deepseek';

UPDATE public.agents SET model_family_search_keywords = ARRAY[
  'qwen',
  'qwen2',
  'qwen3',
  'qwen-3',
  'qwen2.5'
]::TEXT[] WHERE handle = 'qwen';

UPDATE public.agents SET model_family_search_keywords = ARRAY[
  'llama 2',
  'llama-2',
  'llama 3',
  'llama-3',
  'llama 4',
  'llama-4',
  'llama3',
  'llama2',
  'meta-llama',
  'meta llama'
]::TEXT[] WHERE handle = 'llama';
