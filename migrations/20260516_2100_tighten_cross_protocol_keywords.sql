-- Tighten cross_protocol_search_keywords — drop bare single-word names entirely
-- Date: 2026-05-16
--
-- Round 2 fix. The previous migration kept names with length ≥ 5 AND not
-- all-caps. That still allowed "predi" (Predi tokenized agent, 5 chars,
-- not all-caps) which produced 387 false-positive matches via prefix-overlap
-- with "predict", "prediction", "predicate" in bazaar_resources descriptions.
--
-- New rule: drop ALL bare single-word names for tokenized agents.
-- Keep only multi-word phrases ("Ethy AI", "Voice of the Gods") and dotted
-- names ("G.A.M.E"). $TICKER provides the primary match path; bare names
-- are too risky.
--
-- Trade-off: we lose "aixbt" bare match (people sometimes write "aixbt agent"
-- without $). But mentions of $AIXBT are still captured, and aixbt's other
-- signals (HF, derivatives, etc.) carry the rest. False-positive avoidance
-- wins for v1.1.

DELETE FROM public.cross_protocol_presence;

UPDATE public.agents
   SET cross_protocol_search_keywords = '{}'::TEXT[]
 WHERE primary_category = 'tokenized'
    OR 'tokenized' = ANY(secondary_categories);

DO $$
DECLARE
  r RECORD;
  kws TEXT[];
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

    -- $TICKER (uppercase + lowercase) — always primary keyword path
    IF r.ticker IS NOT NULL AND length(r.ticker) >= 2 THEN
      clean_ticker := regexp_replace(r.ticker, '^\$+', '');
      IF length(clean_ticker) >= 2 THEN
        kws := kws || ('$' || upper(clean_ticker));
        kws := kws || ('$' || lower(clean_ticker));
      END IF;
    END IF;

    -- Name — STRICT: only multi-word or dotted-with-length-5+
    -- Drops all bare single-word names (avoids prefix-overlap FPs like
    -- "predi" → "prediction", "luna" → astrology references, etc.)
    IF r.name IS NOT NULL AND length(r.name) >= 4 THEN
      keep_name := FALSE;
      IF position(' ' IN r.name) > 0 THEN
        keep_name := TRUE;  -- multi-word: distinctive
      ELSIF position('.' IN r.name) > 0 AND length(r.name) >= 5 THEN
        keep_name := TRUE;  -- dotted: distinctive
      END IF;
      IF keep_name THEN
        kws := kws || lower(r.name);
      END IF;
    END IF;

    IF cardinality(kws) > 0 THEN
      UPDATE public.agents SET cross_protocol_search_keywords = kws WHERE handle = r.handle;
    END IF;
  END LOOP;
END$$;

-- Service keywords unchanged from previous migration (github_full_name only).
