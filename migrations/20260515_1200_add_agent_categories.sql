-- Add primary_category + secondary_categories + socially_visible to agents
-- Date: 2026-05-15
-- Kris-approved 2026-05-15 (Category Index Pivot decisions doc in brain)
--
-- This is step (a) of the category pivot. AgentCrush moves from one universal
-- ranking to per-category indices (Developer / Model families / Tokenized /
-- Service). Each category will eventually have its own scoring methodology
-- and ranking surface. Social/KOL is folded into Tokenized as a metadata flag
-- (socially_visible) and revisited after the first 3 category rankings are live.
--
-- Decision constraints (locked 2026-05-15):
--   - 4 categories: developer, model_family, tokenized, service
--   - primary_category required (default 'developer')
--   - secondary_categories array, max 1 entry, same enum
--   - socially_visible bool flag (for tokenized agents with social/KOL footprint)
--   - tier system stays universal (evidence_ranked / indexed / archived) — no churn
--   - the old tier-as-category values (virtuals_economic, agentverse_service) get
--     RE-MAPPED via this migration: their tier reverts to 'indexed' and the
--     category becomes the new primary_category. Old tier values remain in the
--     tier CHECK constraint for transitional safety but are now unused.
--
-- Idempotent. Re-running is a no-op after first apply (uses IF NOT EXISTS,
-- CHECK ... DROP IF EXISTS, UPDATE clauses are filtered).

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add columns
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS primary_category    TEXT NOT NULL DEFAULT 'developer',
  ADD COLUMN IF NOT EXISTS secondary_categories TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS socially_visible    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.agents.primary_category IS
  'Single primary agent category. One of: developer, model_family, tokenized, service. Drives which /rankings/<category>/ page lists the agent and which per-category scoring methodology applies.';

COMMENT ON COLUMN public.agents.secondary_categories IS
  'Optional cross-category membership (max 1 entry). Same enum as primary_category. Allows agents that legitimately span 2 categories (e.g. aixbt tokenized + socially_visible) to appear on a second ranking surface.';

COMMENT ON COLUMN public.agents.socially_visible IS
  'Metadata flag for tokenized agents that also have meaningful social/KOL footprint. Social/KOL deferred as a standalone category 2026-05-15; revisit if/when a durable social-signal methodology exists that doesn''t reduce to follower-count gaming.';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CHECK constraint for primary_category values
-- ──────────────────────────────────────────────────────────────────────────────

-- Drop prior constraint if it exists (idempotent)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'agents'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%primary_category%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.agents DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_primary_category_check
  CHECK (primary_category IN ('developer', 'model_family', 'tokenized', 'service'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. CHECK constraint for secondary_categories
-- ──────────────────────────────────────────────────────────────────────────────
-- Rules: max 1 entry; if present, must be in the same enum; cannot equal primary.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'agents'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%secondary_categories%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.agents DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_secondary_categories_check
  CHECK (
    cardinality(secondary_categories) <= 1
    AND (
      cardinality(secondary_categories) = 0
      OR (
        secondary_categories[1] IN ('developer', 'model_family', 'tokenized', 'service')
        AND secondary_categories[1] <> primary_category
      )
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agents_primary_category
  ON public.agents (primary_category);

CREATE INDEX IF NOT EXISTS idx_agents_secondary_categories_gin
  ON public.agents USING GIN (secondary_categories);

CREATE INDEX IF NOT EXISTS idx_agents_socially_visible
  ON public.agents (socially_visible) WHERE socially_visible = TRUE;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Backfill primary_category from existing tier values
-- ──────────────────────────────────────────────────────────────────────────────

-- 5a. Tokenized — agents promoted from virtuals_agents
UPDATE public.agents
   SET primary_category = 'tokenized',
       tier             = 'indexed'  -- revert the tier-as-category hack from 2026-05-14
 WHERE tier = 'virtuals_economic';

-- 5b. Service — agents promoted from agentverse_agents
UPDATE public.agents
   SET primary_category = 'service',
       tier             = 'indexed'
 WHERE tier = 'agentverse_service';

-- 5c. Model family — narrow seed list of obvious model-family agents already in
--     the index. Most "claude/openai/gemini/qwen" matches are derivative dev
--     tools (claude-code wrappers, openai-evals, qwen-code, etc.) and stay in
--     'developer'. The HuggingFace adapter in step (b) will discover and
--     categorize the rest properly.
UPDATE public.agents
   SET primary_category = 'model_family'
 WHERE handle IN (
   'nousresearch_hermes_agent',
   'deepseek',
   'gemini'
 );

-- 5d. socially_visible flag for tokenized agents with known social/KOL footprint.
--     aixbt is the canonical example — it's a Virtuals tokenized agent that's
--     also actively dominant on X. The handle 'aixbt' was cross-linked with
--     virtuals_id yesterday (so primary_category is now 'tokenized' from 5a),
--     and we flag the socially_visible bit here.
UPDATE public.agents
   SET socially_visible = TRUE
 WHERE handle IN ('aixbt');

-- All other agents inherit the column default ('developer'). No explicit
-- UPDATE needed.
