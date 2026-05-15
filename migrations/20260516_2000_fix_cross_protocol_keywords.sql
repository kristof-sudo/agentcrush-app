-- Fix cross_protocol_search_keywords — eliminate false-positive avalanche
-- Date: 2026-05-16
--
-- Root cause from dry-run:
--   virtuals_port had name='PORT' (4 chars, common dictionary word) → 1,114 matches.
--   The first migration also produced $$PORT because virtuals_agents.ticker
--   was stored with leading '$' and the keyword builder prepended another '$'.
--
-- Conservative keyword rules (this migration):
--   Tokenized agents:
--     - Always include $TICKER (uppercase) + $ticker (lowercase), stripping any
--       leading $ before the prefix.
--     - Include name ONLY IF it contains a space OR is ≥ 8 chars AND not all-caps.
--       (This passes "Ethy AI", "G.A.M.E" via dots if 7+ chars, "OpenGradient";
--        skips "PORT", "REPPO", "VADER", "LUNA", "GAME", "WIRE", "SHEKEL" bare.)
--
--   Service agents:
--     - github_full_name only (e.g. "evomap/evolver"). Highly specific.
--     - Drop bare display_name (often a generic single word).
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Reset + re-backfill tokenized keywords
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
   SET cross_protocol_search_keywords = '{}'::TEXT[]
 WHERE primary_category = 'tokenized'
    OR 'tokenized' = ANY(secondary_categories)
    OR primary_category = 'service'
    OR 'service' = ANY(secondary_categories);

DO $$
DECLARE
  r RECORD;
  kws TEXT[];
  raw_ticker TEXT;
  clean_ticker TEXT;
  keep_name BOOLEAN;
BEGIN
  FOR r IN
    SELECT a.handle, v.name, v.ticker
    FROM public.agents a
    LEFT JOIN public.virtuals_agents v ON v.virtuals_id = a.virtuals_id
    WHERE (a.primary_category = 'tokenized' OR 'tokenized' = ANY(a.secondary_categories))
      AND v.virtuals_id IS NOT NULL
  LOOP
    kws := ARRAY[]::TEXT[];

    -- $TICKER (uppercase) — strip any leading $ first
    IF r.ticker IS NOT NULL AND length(r.ticker) >= 2 THEN
      raw_ticker := r.ticker;
      clean_ticker := regexp_replace(raw_ticker, '^\$+', '');
      IF length(clean_ticker) >= 2 THEN
        kws := kws || ('$' || upper(clean_ticker));
        kws := kws || ('$' || lower(clean_ticker));
      END IF;
    END IF;

    -- Name — keep if distinctive (multi-word, dotted, or long-enough non-caps).
    -- Rejects bare 3-5-char all-caps tickers ("PORT", "REPPO", "VADER", "LUNA")
    -- which would be dictionary-word false positives. Keeps lowercase tokens
    -- with length ≥ 5 ("aixbt", "Toshi", "OpenGradient").
    IF r.name IS NOT NULL AND length(r.name) >= 3 THEN
      keep_name := FALSE;
      IF position(' ' IN r.name) > 0 THEN
        keep_name := TRUE;  -- multi-word: distinctive
      ELSIF position('.' IN r.name) > 0 AND length(r.name) >= 5 THEN
        keep_name := TRUE;  -- dotted (G.A.M.E)
      ELSIF length(r.name) >= 5 AND r.name <> upper(r.name) THEN
        keep_name := TRUE;  -- ≥ 5 chars AND not all-caps (aixbt, Toshi, OpenGradient)
      END IF;
      IF keep_name THEN
        kws := kws || lower(r.name);
      END IF;
    END IF;

    IF cardinality(kws) > 0 THEN
      UPDATE public.agents
         SET cross_protocol_search_keywords = kws
       WHERE handle = r.handle;
    END IF;
  END LOOP;
END$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Re-backfill service keywords — github_full_name only (no bare display_name)
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
   SET cross_protocol_search_keywords = ARRAY[github_full_name]::TEXT[]
 WHERE (primary_category = 'service' OR 'service' = ANY(secondary_categories))
   AND github_full_name IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Clear stale rows from the previous run (will be repopulated on next aggregator run)
-- ──────────────────────────────────────────────────────────────────────────────

DELETE FROM public.cross_protocol_presence;
