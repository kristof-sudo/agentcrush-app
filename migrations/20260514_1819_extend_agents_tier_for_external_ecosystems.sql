-- Extend `agents.tier` to accept external-ecosystem promotion tiers, and
-- add cross-reference columns so promoted rows link back to their source
-- tables (`virtuals_agents`, `agentverse_agents`).
--
-- Date: 2026-05-14
-- Scope: agents table only. Idempotent.
--
-- Motivation (Kris, 2026-05-14):
--   We do NOT want to merge Virtuals / Agentverse / A2A rows into the main
--   `/rankings` view — their scoring methodologies don't mix and would
--   damage AgentCrush's "decision-grade reputation" positioning. Instead we
--   keep `evidence_ranked` / `indexed` / `archived` as the existing core
--   track, and add two new tier values that live in their own ranking
--   surfaces (UI work deferred):
--     - 'virtuals_economic'   — tokenized agent-personas, ranked on
--                               token-economic signals (holders, volume).
--     - 'agentverse_service'  — Fetch.ai ecosystem service agents.
--   A2A repos do NOT get a new tier; they flow into the existing developer-
--   agent track at tier='indexed' and earn `evidence_ranked` through the
--   normal v2 scoring pipeline.
--
-- This migration is non-destructive. No data is mutated. The new CHECK
-- constraint is a strict superset of the previous allowed values.

-- ── 1. Replace tier CHECK constraint ──────────────────────────────────────────
-- The existing constraint is named `agents_tier_check` (the Postgres default
-- naming for an inline CHECK). Drop IF EXISTS to be safe across environments
-- where the constraint name may differ slightly.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find any existing CHECK constraint on agents.tier and drop it.
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel    ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE rel.relname = 'agents'
      AND ns.nspname  = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%tier%'
  LOOP
    EXECUTE format('ALTER TABLE public.agents DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped tier CHECK constraint: %', constraint_name;
  END LOOP;
END $$;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_tier_check
  CHECK (tier IN (
    'evidence_ranked',
    'indexed',
    'archived',
    'virtuals_economic',
    'agentverse_service'
  ));

-- ── 2. Cross-reference columns ────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS virtuals_id   BIGINT,
  ADD COLUMN IF NOT EXISTS agentverse_id TEXT;

COMMENT ON COLUMN public.agents.virtuals_id IS
  'Cross-reference to virtuals_agents.virtuals_id. NULL for non-Virtuals agents. Unique when non-NULL.';
COMMENT ON COLUMN public.agents.agentverse_id IS
  'Cross-reference to agentverse_agents.agentverse_id (bech32 address). NULL for non-Agentverse agents. Unique when non-NULL.';

-- ── 3. Uniqueness (partial unique indexes — allow many NULLs, max one
--      non-NULL value per id). Postgres treats NULLs as distinct in regular
--      UNIQUE constraints, but a partial unique index is cleaner and matches
--      the project convention.

CREATE UNIQUE INDEX IF NOT EXISTS agents_virtuals_id_uniq
  ON public.agents (virtuals_id)
  WHERE virtuals_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agents_agentverse_id_uniq
  ON public.agents (agentverse_id)
  WHERE agentverse_id IS NOT NULL;

-- ── 4. Lookup indexes (separate from the uniqueness above so explain plans
--      can pick the cheapest one for plain equality lookups). Postgres will
--      use the partial unique index for NOT NULL lookups, but a plain index
--      is clearer for the optimizer when filtering on tier + id together.

CREATE INDEX IF NOT EXISTS agents_tier_idx
  ON public.agents (tier);

-- ── End ───────────────────────────────────────────────────────────────────────
