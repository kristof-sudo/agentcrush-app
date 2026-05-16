-- Seed Mistral + Cohere as model_family agents (v1.5 seed expansion)
-- Date: 2026-05-16
-- Depends on: 20260515_1200_add_agent_categories.sql
-- Depends on: 20260515_1600_model_family_scoring_view.sql (hf_author)
-- Depends on: 20260515_1900_plumb_lmarena_into_model_family_view.sql (lmarena_model_keys)
-- Depends on: 20260516_0900_create_paper_citations.sql (semantic_scholar_paper_ids)
-- Depends on: 20260516_1100_create_model_family_deployments.sql (model_family_search_keywords)
--
-- v1.5 seed expansion — extending model_family from 5 → 7 tracked agents.
-- Adds Mistral and Cohere. Both have HF presence + LMArena coverage +
-- derivatives + canonical papers — full 4/5 signal coverage expected on apply.
--
-- VERIFIED DATA (queried 2026-05-16 against live tables):
--
--   Mistral (hf_author='mistralai'):
--     - 46 HF models cached, top Mistral-7B-Instruct-v0.3 (4.3M dl), Mistral-7B-Instruct-v0.2 (3.2M dl)
--     - Derivatives: 53+ across top 6 base models
--     - LMArena top: mistral-large-3 (BT 1430), mistral-medium-2508 (1425),
--       mistral-medium-2505 (1369), mistral-small-2506 (1339),
--       mistral-large-2407 (1266), mistral-large-2411 (1265),
--       mixtral-8x22b-instruct-v0.1 (1162), mixtral-8x7b-instruct-v0.1 (1131)
--     - Canonical papers: arXiv:2310.06825 (Mistral 7B), arXiv:2401.04088 (Mixtral of Experts)
--
--   Cohere (hf_author='CohereLabs'):
--     - 14 HF models cached (CohereLabs is the current org name; previously CohereForAI)
--     - Top: cohere-transcribe-03-2026 (291K), c4ai-command-r-v01-4bit (161K), aya-vision-8b (161K)
--     - Derivatives: sparse (4 across top 4 base models) — lowest signal but real
--     - LMArena top: command-a-03-2025 (BT 1331), command-r-plus-08-2024 (1228),
--       command-r-plus (1203), command-r-08-2024 (1187), command-r (1163)
--     - Canonical paper: arXiv:2402.07827 (Aya: instruction finetuned open-access multilingual)
--
-- PROJECTED end-state composite scores (using v1.4 formulas):
--   Mistral:  HF ~90 + LM ~91 (BT 1430) + Der ~44 + Cit ~tbd + Dep ~tbd → composite ~65-75 (EVIDENCE-READY)
--   Cohere:   HF ~70 + LM ~79 (BT 1331) + Der ~16 + Cit ~tbd + Dep ~tbd → composite ~45-55 (EVIDENCE-READY)
--
-- After this migration applies, citations adapter + deployment aggregator need
-- to run to populate the new paper IDs + search keywords. Workflow:
--   1. Apply this migration
--   2. node runtime/citations-adapter.mjs --write --skip-existing  (with S2 API key)
--   3. node runtime/deployment-aggregator.mjs --write
--   4. Verify with scripts/verify-model-family-view.mjs
--
-- Idempotent: ON CONFLICT for INSERTs.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. INSERT Mistral
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO public.agents (
  handle, display_name, bio, status, tier, primary_category,
  hf_author, lmarena_model_keys, semantic_scholar_paper_ids, model_family_search_keywords,
  entity_type, identity_type
)
VALUES (
  'mistral',
  'Mistral',
  'Open-weight model family from Mistral AI. Tracked on AgentCrush via HuggingFace adoption (Mistral-7B, Mistral-Small, Mixtral), LMArena Bradley-Terry scores (mistral-large-3 @ BT 1430), HF derivatives, and downstream agent-economy deployment.',
  'active',
  'indexed',
  'model_family',
  'mistralai',
  ARRAY[
    'mistral-large-3',
    'mistral-medium-2508',
    'mistral-medium-2505',
    'mistral-small-2506',
    'mistral-large-2407',
    'mistral-large-2411',
    'mixtral-8x22b-instruct-v0.1',
    'mixtral-8x7b-instruct-v0.1'
  ]::TEXT[],
  ARRAY[
    'arxiv:2310.06825',  -- Mistral 7B
    'arxiv:2401.04088'   -- Mixtral of Experts
  ]::TEXT[],
  ARRAY[
    'mistral',
    'mistralai',
    'mixtral'
  ]::TEXT[],
  'agent',         -- matches deepseek/gemini/qwen seed pattern (entity_type)
  'agent'          -- identity_type CHECK constraint: ('agent','organization','framework','tool')
)
ON CONFLICT (handle) DO UPDATE
  SET primary_category    = EXCLUDED.primary_category,
      hf_author           = EXCLUDED.hf_author,
      lmarena_model_keys  = EXCLUDED.lmarena_model_keys,
      semantic_scholar_paper_ids = EXCLUDED.semantic_scholar_paper_ids,
      model_family_search_keywords = EXCLUDED.model_family_search_keywords;
      -- preserve existing display_name and bio (already populated as developer-category)

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. INSERT Cohere
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO public.agents (
  handle, display_name, bio, status, tier, primary_category,
  hf_author, lmarena_model_keys, semantic_scholar_paper_ids, model_family_search_keywords,
  entity_type, identity_type
)
VALUES (
  'cohere',
  'Cohere',
  'Model family from Cohere. Tracked on AgentCrush via HuggingFace presence (CohereLabs: Command R, Aya, Command A variants), LMArena Bradley-Terry scores (command-a-03-2025 @ BT 1331), and the Aya multilingual paper.',
  'active',
  'indexed',
  'model_family',
  'CohereLabs',
  ARRAY[
    'command-a-03-2025',
    'command-r-plus-08-2024',
    'command-r-plus',
    'command-r-08-2024',
    'command-r'
  ]::TEXT[],
  ARRAY[
    'arxiv:2402.07827'  -- Aya: instruction finetuned open-access multilingual language model
  ]::TEXT[],
  ARRAY[
    'cohere',
    'command-r',
    'command-a',
    'aya',
    'CohereLabs'
  ]::TEXT[],
  'agent',
  'agent'
)
ON CONFLICT (handle) DO UPDATE
  SET primary_category    = EXCLUDED.primary_category,
      hf_author           = EXCLUDED.hf_author,
      lmarena_model_keys  = EXCLUDED.lmarena_model_keys,
      semantic_scholar_paper_ids = EXCLUDED.semantic_scholar_paper_ids,
      model_family_search_keywords = EXCLUDED.model_family_search_keywords;
      -- preserve existing display_name and bio
