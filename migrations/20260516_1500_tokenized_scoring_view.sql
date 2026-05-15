-- Step (e) — Tokenized scoring view
-- Date: 2026-05-16
-- Depends on: 20260515_1200_add_agent_categories.sql (primary_category, secondary_categories)
-- Depends on: 20260514_1200_create_virtuals_agents.sql (virtuals_agents)
-- Depends on: 20260514_1819_extend_agents_tier_for_external_ecosystems.sql (agents.virtuals_id)
--
-- Second category index of the Category Index Pivot. Tokenized agents are
-- economic objects, so the methodology is economics-first: market cap,
-- liquidity, holder distribution, and cross-protocol presence dominate.
--
-- Composite weights (Kris-approved 2026-05-16):
--   Market cap            25%   — primary economic signal
--   Liquidity + volume    20%   — tradeable depth, anti-honeypot
--   Holders + concentration 15% — decentralization
--   Price momentum        10%   — directional, capped (volatile)
--   Cross-protocol        15%   — moat: x402 / ERC-8004 / Bazaar presence
--   Social visibility     15%   — token agents live on attention
--   ─────────────────────────
--   Total                100%
--
-- Evidence-ready rule:
--   3 of 6 signals available AND ≥1 economic signal (mc, liquidity, or holders > 0).
--
-- Cross-category support:
--   View includes agents where primary_category='tokenized' OR 'tokenized' is
--   in secondary_categories. (aixbt is primary=developer but
--   secondary=['tokenized'] — its dual identity is real and the methodology
--   should rank it accordingly.)
--
-- Methodology version: v1.0-tokenized-v0
-- (Lower-versioned than model_family on purpose: this is v0 of the tokenized
--  category. Social signal is a placeholder binary flag in v1.0; future v1.1
--  will integrate Bix's social signal data.)
--
-- Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Lift aixbt's tokenized identity to a proper secondary_category
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE public.agents
   SET secondary_categories = ARRAY['tokenized']::TEXT[]
 WHERE handle = 'aixbt'
   AND (secondary_categories IS NULL OR NOT 'tokenized' = ANY(secondary_categories));

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Create the scoring view
-- ──────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.agent_score_tokenized_v1 CASCADE;

CREATE VIEW public.agent_score_tokenized_v1 AS
WITH tokenized_agents AS (
  -- All agents that are either primary tokenized OR secondary tokenized
  SELECT
    id, handle, display_name, virtuals_id, secondary_categories, primary_category,
    socially_visible, bot_fetch_friendliness_score,
    avatar_url, custom_background_url, x_handle, website_url
  FROM public.agents
  WHERE primary_category = 'tokenized'
     OR 'tokenized' = ANY(secondary_categories)
),
joined AS (
  SELECT
    t.*,
    v.name                 AS virtuals_name,
    v.ticker               AS virtuals_ticker,
    v.token_address,
    v.market_cap_usd,
    v.liquidity_usd,
    v.volume_24h_usd,
    v.holders,
    v.top10_holder_pct,
    v.price_change_pct_24h,
    v.token_price_usd,
    v.image_url            AS virtuals_image_url,
    v.twitter_url          AS virtuals_twitter_url
  FROM tokenized_agents t
  LEFT JOIN public.virtuals_agents v ON v.virtuals_id = t.virtuals_id
),
sub_scores AS (
  SELECT
    j.*,

    -- Market cap (log-scaled USD)
    --   $1M  → 72,  $10M → 84,  $100M → 96,  $1B → 100
    CASE
      WHEN market_cap_usd IS NULL OR market_cap_usd <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, market_cap_usd)) * 12))::INTEGER
    END AS market_cap_score,

    -- Liquidity (log-scaled USD) — heavier coefficient because low liquidity
    -- is the strongest signal of a honeypot / pump-and-dump
    --   $1K  → 48,  $10K → 64,  $100K → 80,  $1M → 96
    CASE
      WHEN liquidity_usd IS NULL OR liquidity_usd <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, liquidity_usd)) * 16))::INTEGER
    END AS liquidity_score,

    -- Volume 24h (log-scaled USD). Combined with liquidity in basket.
    --   $1K  → 39,  $10K → 52,  $100K → 65,  $1M → 78,  $10M → 91
    CASE
      WHEN volume_24h_usd IS NULL OR volume_24h_usd <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, volume_24h_usd)) * 13))::INTEGER
    END AS volume_24h_score,

    -- Holder count (log-scaled count)
    --   50    → 31,   500   → 49,   5000 → 67,  50000 → 85
    CASE
      WHEN holders IS NULL OR holders <= 0 THEN NULL::INTEGER
      ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, holders::numeric)) * 18))::INTEGER
    END AS holders_count_score,

    -- Top-10 holder concentration — inverse. Lower concentration = higher score.
    --   10% concentration → 90,  50% → 50,  90% → 10
    CASE
      WHEN top10_holder_pct IS NULL THEN NULL::INTEGER
      ELSE GREATEST(0, LEAST(100, 100 - ROUND(top10_holder_pct)))::INTEGER
    END AS holder_concentration_score,

    -- Price momentum 24h — bounded around neutral 50.
    --   +20% → 70, -20% → 30, +50% → 100 (capped), -50% → 0 (capped)
    --   Anything > 100% absolute change is too volatile to credit either way.
    CASE
      WHEN price_change_pct_24h IS NULL THEN NULL::INTEGER
      WHEN ABS(price_change_pct_24h) > 100 THEN 50  -- treat extreme volatility as neutral
      ELSE GREATEST(0, LEAST(100, 50 + ROUND(price_change_pct_24h)))::INTEGER
    END AS price_momentum_score,

    -- Cross-protocol presence
    -- v1.0: uses bot_fetch_friendliness_score as proxy (presence of
    -- x402/MCP/agent-card endpoints). Will expand in v1.1 to scan
    -- bazaar_resources / erc8004_registry / agentverse_agents by name.
    CASE
      WHEN bot_fetch_friendliness_score IS NULL THEN NULL::INTEGER
      ELSE GREATEST(0, LEAST(100, bot_fetch_friendliness_score))::INTEGER
    END AS cross_protocol_score,

    -- Social visibility
    -- v1.0: binary flag (manually curated). v1.1 will integrate X follower
    -- count, Farcaster engagement, mention volume.
    CASE
      WHEN socially_visible IS NULL THEN NULL::INTEGER
      WHEN socially_visible = TRUE THEN 100
      ELSE 0
    END AS social_score

  FROM joined j
),
baskets AS (
  SELECT
    *,
    -- Liquidity basket = (liquidity_score * 0.65 + volume_24h_score * 0.35)
    -- Volume amplifies the liquidity signal but liquidity dominates anti-honeypot weight.
    CASE
      WHEN liquidity_score IS NULL AND volume_24h_score IS NULL THEN NULL::INTEGER
      ELSE ROUND(
        COALESCE(liquidity_score, 0) * 0.65 +
        COALESCE(volume_24h_score, 0) * 0.35
      )::INTEGER
    END AS liquidity_volume_score,

    -- Holders basket = (count_score * 0.55 + concentration_score * 0.45)
    CASE
      WHEN holders_count_score IS NULL AND holder_concentration_score IS NULL THEN NULL::INTEGER
      ELSE ROUND(
        COALESCE(holders_count_score, 0) * 0.55 +
        COALESCE(holder_concentration_score, 0) * 0.45
      )::INTEGER
    END AS holders_basket_score
  FROM sub_scores
)
SELECT
  id                                                  AS agent_id,
  handle,
  display_name,
  virtuals_id,
  primary_category,
  secondary_categories,

  -- Raw economic data
  virtuals_name,
  virtuals_ticker,
  token_address,
  market_cap_usd,
  liquidity_usd,
  volume_24h_usd,
  holders,
  top10_holder_pct,
  price_change_pct_24h,
  token_price_usd,

  -- Sub-scores (for transparency display)
  market_cap_score,
  liquidity_score,
  volume_24h_score,
  liquidity_volume_score,
  holders_count_score,
  holder_concentration_score,
  holders_basket_score,
  price_momentum_score,
  cross_protocol_score,
  social_score,

  -- Composite (weights: mc 25, liq+vol 20, holders 15, momentum 10, cross 15, social 15)
  ROUND(
    COALESCE(market_cap_score, 0)         * 0.25 +
    COALESCE(liquidity_volume_score, 0)   * 0.20 +
    COALESCE(holders_basket_score, 0)     * 0.15 +
    COALESCE(price_momentum_score, 0)     * 0.10 +
    COALESCE(cross_protocol_score, 0)     * 0.15 +
    COALESCE(social_score, 0)             * 0.15
  )::INTEGER AS tokenized_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(market_cap_score, 0)       * 0.25 +
      COALESCE(liquidity_volume_score, 0) * 0.20 +
      COALESCE(holders_basket_score, 0)   * 0.15 +
      COALESCE(price_momentum_score, 0)   * 0.10 +
      COALESCE(cross_protocol_score, 0)   * 0.15 +
      COALESCE(social_score, 0)           * 0.15
    ) DESC
  )::INTEGER AS rank_in_tokenized,

  -- Signals available count (6 signals: mc, liq+vol basket, holders basket, momentum, cross, social)
  (
    (CASE WHEN market_cap_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN liquidity_volume_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN holders_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN price_momentum_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN cross_protocol_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN social_score IS NOT NULL THEN 1 ELSE 0 END)
  )::INTEGER AS signals_available_count,

  -- Evidence-ready: 3-of-6 AND ≥1 economic signal (mc OR liquidity OR holders > 0)
  (
    (
      (CASE WHEN market_cap_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN liquidity_volume_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN holders_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN price_momentum_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN cross_protocol_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN social_score IS NOT NULL THEN 1 ELSE 0 END)
    ) >= 3
    AND (
      (market_cap_usd IS NOT NULL AND market_cap_usd > 0)
      OR (liquidity_usd IS NOT NULL AND liquidity_usd > 0)
      OR (holders IS NOT NULL AND holders > 0)
    )
  ) AS evidence_ready_for_public_rank,

  'v1.0-tokenized-v0'::TEXT AS methodology_version

FROM baskets;

COMMENT ON VIEW public.agent_score_tokenized_v1 IS
  'Tokenized agent scoring view, methodology v1.0. Economics-first: market cap (25%) + liquidity/volume (20%) + holders/concentration (15%) + price momentum (10%) + cross-protocol presence (15%) + social visibility (15%). Includes agents where primary_category=tokenized OR secondary_categories contains tokenized. Cross-protocol uses bot_fetch_friendliness_score as v1.0 proxy; v1.1 will scan bazaar_resources/erc8004_registry/agentverse_agents by name. Social is binary flag in v1.0; v1.1 will integrate Bix social signal data.';
