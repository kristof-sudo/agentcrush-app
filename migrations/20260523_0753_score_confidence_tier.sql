-- Score confidence-tier — Caliber methodology lesson applied (smallest durable diff)
--
-- Inspired by Caliber's "never ship a score without a confidence interval"
-- principle (https://caliber.poko.blue/methodology). We don't have the
-- statistical model for proper confidence intervals yet (that's a multi-day
-- scoping task — filed as a separate Queue item). But we can ship the
-- structural shape today: a `confidence_tier` derived from signal coverage.
--
-- This migration:
--   1. Creates a reusable SQL function `score_confidence_tier(signals_present, signals_total)`
--      that maps signal coverage to one of {'high','medium','low','provisional'}.
--      Mirrors Caliber's tier shape (Established/Proven/Emerging/Provisional).
--   2. Creates a wrapper view `agent_score_model_family_v1_with_confidence`
--      that exposes the base view + a `confidence_tier` column.
--
-- Why a wrapper view (not in-place modification):
--   - Non-destructive. Existing consumers of `agent_score_model_family_v1`
--     keep working unchanged.
--   - Reversible. DROP the wrapper without touching the base view.
--   - Per-consumer opt-in: pages/endpoints can switch to the _with_confidence
--     view as they get UI treatment, one at a time.
--
-- Extending to other categories (separate follow-up):
--   - Apply the same wrapper pattern to agent_score_tokenized_v1 (6 signals),
--     agent_score_service_v1 (6 signals), agent_score_v2_top50_public_candidate
--     (developer; multiple signals). Use the same function. Tiers will need
--     per-category cutoff tuning since signal counts differ.
--
-- Filed as separate Queue items (NOT in this migration):
--   - (b) risk_flags JSONB column + 4 deterministic rules
--   - (c) credibility-weighting blend for thin-data agents
--   - methodology page changelog rendering

-- ── 1. Function: signal-coverage → tier ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.score_confidence_tier(
  signals_present INTEGER,
  signals_total   INTEGER
) RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN signals_present IS NULL OR signals_total IS NULL OR signals_total = 0 THEN 'provisional'
    WHEN signals_present::numeric / signals_total >= 0.95 THEN 'high'
    WHEN signals_present::numeric / signals_total >= 0.75 THEN 'medium'
    WHEN signals_present::numeric / signals_total >= 0.55 THEN 'low'
    ELSE 'provisional'
  END;
$$;

COMMENT ON FUNCTION public.score_confidence_tier IS
  'Maps signal coverage (present / total) to confidence tier {high, medium, low, provisional}. Caliber-inspired structural primitive applied at the AgentCrush methodology layer. Cutoffs: 95% high, 75% medium, 55% low, else provisional.';

-- ── 2. Wrapper view: model_family v1.4 + confidence_tier column ───────────────

CREATE OR REPLACE VIEW public.agent_score_model_family_v1_with_confidence AS
SELECT
  base.*,
  -- Model-family has 5 total signal slots: HF, derivatives, LMArena, citations, deployment
  public.score_confidence_tier(base.signals_available_count, 5) AS confidence_tier
FROM public.agent_score_model_family_v1 base;

COMMENT ON VIEW public.agent_score_model_family_v1_with_confidence IS
  'Wrapper over agent_score_model_family_v1 (v1.4) adding a confidence_tier derived from signal coverage. Tier values: high (5/5), medium (4/5), low (3/5 — still evidence-ready), provisional (<3/5 — not evidence-ready). Consumers opt in to this view per page; the base view continues to serve existing callers unchanged.';

-- ── Verification (informational; safe to leave in migration) ──────────────────

-- Expected end-state across the 7 seeded model families (per STATE.md 2026-05-23):
--   Qwen     : 5/5 → high
--   Gemini   : 5/5 → high
--   DeepSeek : 5/5 → high
--   Llama    : 5/5 → high
--   Mistral  : 5/5 → high (added 2026-05-16)
--   Cohere   : 5/5 → high (added 2026-05-16)
--   Hermes   : 4/5 → medium  (LMArena missing; evidence-ready by 3-of-5 + capability rule)
-- After apply, verify with:
--   SELECT handle, signals_available_count, confidence_tier
--   FROM agent_score_model_family_v1_with_confidence
--   ORDER BY model_family_score DESC;
