-- Tighten Cohere model_family_search_keywords — drop FP-prone bare terms
-- Date: 2026-05-16
--
-- The initial seed (20260516_2330_seed_mistral_cohere_model_family.sql) used:
--   cohere, command-r, command-a, aya, CohereLabs
--
-- Bare "cohere" matches "coherence", "coherent" in many descriptions.
-- Bare "aya" matches as a substring in "payable", "playable", "Layawa", etc.
-- Both produced false positives — deployment_score = 72 from 244 matches
-- (most of which were unrelated).
--
-- Conservative keyword set (same logic as previous tokenized keyword tightening):
--   - Drop bare "cohere" — too close to common English word
--   - Drop bare "aya" — too short, substring-prone
--   - Keep "CohereLabs" (specific org name)
--   - Keep "command-r", "command-a" (specific model families)
--   - Add "c4ai-command" (unique Cohere HF naming prefix)
--   - Add "aya-expanse" (specific Aya variant name)
--   - Add "aya-vision" (specific Aya variant name)
--
-- Idempotent.

UPDATE public.agents
   SET model_family_search_keywords = ARRAY[
     'CohereLabs',
     'command-r',
     'command-a',
     'c4ai-command',
     'aya-expanse',
     'aya-vision'
   ]::TEXT[]
 WHERE handle = 'cohere';

-- Also delete the now-stale rows from model_family_deployments so
-- the next aggregator run produces clean counts.
DELETE FROM public.model_family_deployments
 WHERE model_family_handle = 'cohere';
