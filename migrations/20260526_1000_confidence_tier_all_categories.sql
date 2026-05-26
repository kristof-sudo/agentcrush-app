-- Confidence-tier wrappers for remaining 3 categories (Caliber methodology follow-up)
--
-- Extends the pattern established in 20260523_0753_score_confidence_tier.sql
-- (which added the function + model_family wrapper) to the other three category
-- scoring views: tokenized, service, developer.
--
-- Same non-destructive wrapper pattern:
--   - Base views unchanged. Existing consumers unaffected.
--   - New _with_confidence views opt-in surfaces.
--   - Uses the shared score_confidence_tier() function (already created).
--
-- Per-category signal counts:
--   tokenized : 6 signals (market_cap, liquidity/volume, holders/concentration,
--               price_momentum, cross_protocol, social)
--   service   : 6 signals (adoption, source_quality, activity, protocol_breadth,
--               cross_protocol, social)
--   developer : weight-based, not count-based. active_weight_total (0.0–1.0)
--               is the coverage proxy. Tier cutoffs match the generic function
--               (≥0.95 high, ≥0.75 medium, ≥0.55 low, else provisional).
--               active_weight_total < 0.40 is the existing evidence_ready gate
--               — provisional covers everything below that with buffer.
--
-- Idempotent (CREATE OR REPLACE VIEW).

-- ── 1. Tokenized: 6-signal wrapper ────────────────────────────────────────────

CREATE OR REPLACE VIEW public.agent_score_tokenized_v1_with_confidence AS
SELECT
  base.*,
  -- 6 signal slots: market_cap, liquidity_volume, holders_basket,
  --                 price_momentum, cross_protocol, social
  public.score_confidence_tier(base.signals_available_count, 6) AS confidence_tier
FROM public.agent_score_tokenized_v1 base;

COMMENT ON VIEW public.agent_score_tokenized_v1_with_confidence IS
  'Wrapper over agent_score_tokenized_v1 (v1.1) adding confidence_tier derived from signal coverage. '
  '6 total signal slots. Tier values: high (6/6 → ≥95%), medium (5/6 → ≥75%), '
  'low (4/6 → ≥55%), provisional (<4/6). Evidence-ready gate (3+/6 + ≥1 economic) '
  'is stricter than provisional — tier captures signal breadth above the gate.';

-- ── 2. Service: 6-signal wrapper ──────────────────────────────────────────────

CREATE OR REPLACE VIEW public.agent_score_service_v1_with_confidence AS
SELECT
  base.*,
  -- 6 signal slots: adoption, source_quality, activity, protocol_breadth,
  --                 cross_protocol, social
  public.score_confidence_tier(base.signals_available_count, 6) AS confidence_tier
FROM public.agent_score_service_v1 base;

COMMENT ON VIEW public.agent_score_service_v1_with_confidence IS
  'Wrapper over agent_score_service_v1 (v1.1) adding confidence_tier derived from signal coverage. '
  '6 total signal slots. Tier values: high (≥95%), medium (≥75%), low (≥55%), provisional (<55%). '
  'Service agents tend to cluster at medium/low because social + cross_protocol signals are sparse '
  'for many early-stage service agents.';

-- ── 3. Developer: weight-coverage wrapper ─────────────────────────────────────
--
-- Developer category uses active_weight_total (sum of weights for signals present,
-- normalized to 0.0–1.0). No integer signals_available_count exists. Tier cutoffs
-- are applied directly to the weight fraction, matching the intent of the generic
-- function.
--
-- Tier semantics for developer:
--   high        (≥0.95) : 7/7 signals present — all weight sources active
--   medium      (≥0.75) : 5–6/7 signals present
--   low         (≥0.55) : 4/7 signals present (evidence_ready threshold is 0.40)
--   provisional (<0.55) : ≤3/7 signals — thin data, use with caution

CREATE OR REPLACE VIEW public.agent_score_developer_v2c_with_confidence AS
SELECT
  base.*,
  CASE
    WHEN base.active_weight_total IS NULL             THEN 'provisional'
    WHEN base.active_weight_total >= 0.95             THEN 'high'
    WHEN base.active_weight_total >= 0.75             THEN 'medium'
    WHEN base.active_weight_total >= 0.55             THEN 'low'
    ELSE                                                   'provisional'
  END AS confidence_tier
FROM public.agent_score_v2_top50_public_candidate base;

COMMENT ON VIEW public.agent_score_developer_v2c_with_confidence IS
  'Wrapper over agent_score_v2_top50_public_candidate (v2.c-public) adding confidence_tier. '
  'Uses active_weight_total (0.0–1.0 weight fraction) as the coverage proxy — developer category '
  'normalises available signal weights rather than counting integer signal slots. '
  'Tier: high ≥0.95, medium ≥0.75, low ≥0.55, provisional <0.55. '
  'evidence_ready_for_public_rank threshold is 0.40 — agents below that are provisionally ranked only.';

-- ── Verification queries (informational) ──────────────────────────────────────

-- Tokenized confidence distribution:
--   SELECT confidence_tier, COUNT(*) FROM agent_score_tokenized_v1_with_confidence
--   GROUP BY 1 ORDER BY 1;

-- Service confidence distribution:
--   SELECT confidence_tier, COUNT(*) FROM agent_score_service_v1_with_confidence
--   GROUP BY 1 ORDER BY 1;

-- Developer confidence distribution:
--   SELECT confidence_tier, COUNT(*), ROUND(AVG(active_weight_total), 2) avg_wt
--   FROM agent_score_developer_v2c_with_confidence GROUP BY 1 ORDER BY 1;
