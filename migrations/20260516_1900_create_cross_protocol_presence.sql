-- Create cross_protocol_presence table + agents.cross_protocol_search_keywords
-- Date: 2026-05-16
-- v1.1 cross-protocol expansion for tokenized + service categories.
--
-- Replaces the v1.0 placeholder cross_protocol_score (which used
-- bot_fetch_friendliness_score for tokenized, or simple surface-count for
-- service) with a measured signal: count of mentions across 5 other
-- source tables.
--
-- Pattern mirrors model_family_deployments — for each indexed agent in
-- tokenized or service category, an aggregator ILIKE-scans the 6 source
-- tables for agent-specific keywords (tokens: name + $TICKER, services:
-- github_full_name + display_name).
--
-- Scoring formula:
--   cross_protocol_score = LEAST(100, ROUND( LOG(10, GREATEST(1, total)) * 25 ))
-- Coefficient 25: 1→0, 10→25, 100→50, 1000→75, 10000→100.
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. cross_protocol_presence table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cross_protocol_presence (
  agent_handle        TEXT NOT NULL,
  source_table        TEXT NOT NULL,                       -- 'agents'|'bazaar_resources'|'erc8004_registry'|'agentverse_agents'|'virtuals_agents'|'a2a_agents'
  match_count         INTEGER NOT NULL DEFAULT 0,
  sample_matches      JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_keywords      TEXT[] NOT NULL DEFAULT '{}'::text[],
  last_aggregated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_handle, source_table)
);

COMMENT ON TABLE public.cross_protocol_presence IS
  'Cross-protocol presence aggregation for tokenized + service category scoring (v1.1). One row per (agent_handle, source_table). Populated by runtime/cross-protocol-aggregator.mjs. Mirrors model_family_deployments but generalized across categories.';

CREATE INDEX IF NOT EXISTS idx_cross_protocol_presence_handle ON public.cross_protocol_presence (agent_handle);
CREATE INDEX IF NOT EXISTS idx_cross_protocol_presence_count  ON public.cross_protocol_presence (match_count DESC);

CREATE OR REPLACE FUNCTION trg_cross_protocol_presence_touch()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cross_protocol_presence_touch') THEN
    CREATE TRIGGER cross_protocol_presence_touch
      BEFORE UPDATE ON public.cross_protocol_presence
      FOR EACH ROW EXECUTE FUNCTION trg_cross_protocol_presence_touch();
  END IF;
END$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. agents.cross_protocol_search_keywords
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS cross_protocol_search_keywords TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.agents.cross_protocol_search_keywords IS
  'Keywords used by cross-protocol-aggregator to ILIKE-scan 6 source tables for this agent''s mentions. Distinct from model_family_search_keywords (which is for the deployment signal in model_family scoring). For tokenized: lowercase name + $TICKER. For service: github_full_name + display_name.';

CREATE INDEX IF NOT EXISTS idx_agents_cross_protocol_search_keywords_gin
  ON public.agents USING GIN (cross_protocol_search_keywords);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Backfill keywords for tokenized agents (15 + aixbt = 16 agents)
-- ──────────────────────────────────────────────────────────────────────────────
-- Pattern: name (lowercase) + '$' + ticker. The '$' prefix is critical for
-- generic tickers (LUNA, GAME, VADER, WIRE) that would otherwise match
-- huge amounts of unrelated text.

DO $$
DECLARE
  r RECORD;
  kws TEXT[];
BEGIN
  FOR r IN
    SELECT a.handle, v.name, v.ticker
    FROM public.agents a
    LEFT JOIN public.virtuals_agents v ON v.virtuals_id = a.virtuals_id
    WHERE (a.primary_category = 'tokenized' OR 'tokenized' = ANY(a.secondary_categories))
      AND v.virtuals_id IS NOT NULL
  LOOP
    kws := ARRAY[]::TEXT[];
    IF r.name IS NOT NULL AND length(r.name) >= 3 THEN
      kws := kws || lower(r.name);
    END IF;
    IF r.ticker IS NOT NULL AND length(r.ticker) >= 2 THEN
      kws := kws || ('$' || r.ticker);
      kws := kws || ('$' || lower(r.ticker));
    END IF;
    IF cardinality(kws) > 0 THEN
      UPDATE public.agents
         SET cross_protocol_search_keywords = kws
       WHERE handle = r.handle;
    END IF;
  END LOOP;
END$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Backfill keywords for service agents (28 A2A-promoted)
-- ──────────────────────────────────────────────────────────────────────────────
-- Pattern: github_full_name (full 'owner/repo') + display_name.

UPDATE public.agents
   SET cross_protocol_search_keywords = ARRAY[github_full_name, display_name]::TEXT[]
 WHERE (primary_category = 'service' OR 'service' = ANY(secondary_categories))
   AND github_full_name IS NOT NULL;
