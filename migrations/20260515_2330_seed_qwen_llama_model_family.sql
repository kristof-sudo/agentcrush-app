-- Seed Qwen + Meta Llama as model_family agents
-- Date: 2026-05-15
-- Depends on: 20260515_1200_add_agent_categories.sql (primary_category, secondary_categories)
-- Depends on: 20260515_1600_model_family_scoring_view.sql (agents.hf_author)
-- Depends on: 20260515_1900_plumb_lmarena_into_model_family_view.sql (agents.lmarena_model_keys)
--
-- WHY:
-- After the derivatives aggregator ran (step c.2), top-15 most-derived HF base
-- models was dominated by Qwen and Meta-Llama variants, neither of which were
-- tracked as model_family agents. With the v1.2 view live, both will almost
-- certainly clear evidence-ready immediately and the ranking surface stops
-- being Gemini-and-DeepSeek-only.
--
-- VERIFIED DATA (queried 2026-05-15 against live tables):
--
--   Qwen (hf_author='Qwen'):
--     - 50 HF models in our top-10K cache (max page=50, real count likely ~200+)
--     - 323 declared derivatives across 8 top base models (Qwen3.6-27B alone has 81)
--     - LMArena top variant: qwen3.5-max-preview @ BT=1470 (16K votes)
--     - Other top LMArena variants: qwen3.6-max-preview (1443), qwen3.5-397b-a17b (1441),
--       qwen3.6-plus (1439), qwen3-max-preview (1438), qwen3-vl-235b-a22b-instruct (1421),
--       qwen3.5-122b-a10b (1419), qwen3-235b-a22b-instruct-2507 (1418)
--
--   Meta Llama (hf_author='meta-llama'):
--     - 38 HF models in cache
--     - 148 declared derivatives across 8 top base models (Llama-3.1-8B-Instruct: 38)
--     - LMArena top Meta variant: llama-4-maverick-17b-128e-instruct @ BT=1287
--     - Other Meta variants: llama-3.1-405b-instruct-{bf16,fp8} (~1282), llama-4-scout (1280),
--       llama-3.3-70b-instruct (1275), llama-3.1-70b-instruct (1260), llama-3-70b-instruct (1220),
--       llama-3.1-8b-instruct (1186)
--     - NOTE: llama-3.1-nemotron-*, llama-3.1-tulu-*, llama-3.3-nemotron-* are derivatives
--       by NVIDIA/AllenAI and are intentionally EXCLUDED from Meta's keys — they correctly
--       count toward Meta's derivatives_score instead.
--
-- PROJECTED scores after this migration applies (formulas from v1.2 view):
--   Qwen:         HF~100 + LM=96 (=(1470-700)/8) + Der=63 (=LOG10(323)*25) → composite ~69 → EVIDENCE-READY
--   Meta Llama:   HF~96  + LM=73 (=(1287-700)/8) + Der=54 (=LOG10(148)*25) → composite ~56 → EVIDENCE-READY
--
-- HANDLES:
--   - 'llama' already exists in agents (mis-categorized as 'developer', no hf_author).
--     UPDATE-in-place to preserve the URL /agent/llama and any existing inbound links.
--   - 'qwen' does not exist. INSERT new row.
--
-- Idempotent. Uses ON CONFLICT for the insert and a WHERE-guarded UPDATE.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. INSERT Qwen
-- ──────────────────────────────────────────────────────────────────────────────

INSERT INTO public.agents (
  handle,
  display_name,
  bio,
  status,
  tier,
  primary_category,
  hf_author,
  lmarena_model_keys,
  entity_type,
  identity_type
)
VALUES (
  'qwen',
  'Qwen',
  'Open-weight model family from Alibaba. Tracked on AgentCrush via HuggingFace adoption, LMArena Bradley-Terry scores, and downstream derivative count.',
  'active',
  'indexed',
  'model_family',
  'Qwen',
  ARRAY[
    'qwen3.5-max-preview',
    'qwen3.6-max-preview',
    'qwen3.5-397b-a17b',
    'qwen3.6-plus',
    'qwen3-max-preview',
    'qwen3-vl-235b-a22b-instruct',
    'qwen3.5-122b-a10b',
    'qwen3-235b-a22b-instruct-2507'
  ]::TEXT[],
  'agent',         -- matches deepseek/gemini seed pattern
  'agent'          -- identity_type CHECK constraint: ('agent','organization','framework','tool')
)
ON CONFLICT (handle) DO UPDATE
  SET primary_category    = EXCLUDED.primary_category,
      hf_author           = EXCLUDED.hf_author,
      lmarena_model_keys  = EXCLUDED.lmarena_model_keys,
      display_name        = EXCLUDED.display_name,
      bio                 = COALESCE(public.agents.bio, EXCLUDED.bio);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. UPDATE existing 'llama' row → model_family with proper signal links
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
   SET primary_category   = 'model_family',
       hf_author          = 'meta-llama',
       lmarena_model_keys = ARRAY[
         'llama-4-maverick-17b-128e-instruct',
         'llama-3.1-405b-instruct-bf16',
         'llama-3.1-405b-instruct-fp8',
         'llama-4-scout-17b-16e-instruct',
         'llama-3.3-70b-instruct',
         'llama-3.1-70b-instruct',
         'llama-3-70b-instruct',
         'llama-3.1-8b-instruct'
       ]::TEXT[],
       display_name       = COALESCE(NULLIF(display_name, ''), 'Llama'),
       bio                = COALESCE(
         NULLIF(bio, ''),
         'Open-weight model family from Meta. Tracked on AgentCrush via HuggingFace adoption, LMArena Bradley-Terry scores, and downstream derivative count.'
       )
 WHERE handle = 'llama';
