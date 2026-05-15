-- Tokenized methodology v1.1: replace cross_protocol_score with tvl_score
-- Date: 2026-05-16
-- Depends on: 20260516_1500_tokenized_scoring_view.sql
--
-- Replaces the v1.0 cross_protocol_score placeholder (which used
-- bot_fetch_friendliness_score as a proxy and was NULL for all 16 tokenized
-- agents) with TVL — capital locked in token-related contracts. Different
-- dimension from market cap or liquidity:
--   - market_cap_usd: token price × supply (can be inflated)
--   - liquidity_usd: AMM pool depth (tradeable depth)
--   - tvl_usd: capital locked in governance/staking/LP contracts (commitment)
--
-- Real data ranges across our 16 tokenized agents: $22K → $1.5M.
--
-- Scoring formula:
--   tvl_score = LEAST(100, ROUND( LOG(10, GREATEST(1, tvl_usd)) * 14 ))
--   $1K → 56,  $10K → 70,  $100K → 84,  $1M → 98
--
-- Composite weights unchanged (mc 25 / liq+vol 20 / holders 15 / momentum 10
-- / TVL 15 / social 15). TVL takes the 15% slot previously labeled cross-
-- protocol. Cross-protocol presence is parked as a v1.2+ signal (currently
-- tracking via cross_protocol_presence table but unweighted in composite).
--
-- Methodology version: v1.0-tokenized-v0 → v1.1-tokenized-tvl.
-- Idempotent.

DROP VIEW IF EXISTS public.agent_score_tokenized_v1 CASCADE;

CREATE VIEW public.agent_score_tokenized_v1 AS
WITH tokenized_agents AS (
  SELECT
    id, handle, display_name, virtuals_id, secondary_categories, primary_category,
    socially_visible, bot_fetch_friendliness_score,
    avatar_url, custom_background_url, x_handle, website_url
  FROM public.agents
  WHERE primary_category = 'tokenized' OR 'tokenized' = ANY(secondary_categories)
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
    v.tvl_usd,
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

    -- Market cap (log-scaled USD, coef 12)
    CASE WHEN market_cap_usd IS NULL OR market_cap_usd <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, market_cap_usd)) * 12))::INTEGER
    END AS market_cap_score,

    -- Liquidity (log-scaled, coef 16)
    CASE WHEN liquidity_usd IS NULL OR liquidity_usd <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, liquidity_usd)) * 16))::INTEGER
    END AS liquidity_score,

    -- Volume 24h (log-scaled, coef 13)
    CASE WHEN volume_24h_usd IS NULL OR volume_24h_usd <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, volume_24h_usd)) * 13))::INTEGER
    END AS volume_24h_score,

    -- Holder count (log-scaled, coef 18)
    CASE WHEN holders IS NULL OR holders <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, holders::numeric)) * 18))::INTEGER
    END AS holders_count_score,

    -- Top-10 concentration (inverse, 0-100)
    CASE WHEN top10_holder_pct IS NULL THEN NULL::INTEGER
         ELSE GREATEST(0, LEAST(100, 100 - ROUND(top10_holder_pct)))::INTEGER
    END AS holder_concentration_score,

    -- Price momentum 24h (bounded around neutral 50)
    CASE
      WHEN price_change_pct_24h IS NULL THEN NULL::INTEGER
      WHEN ABS(price_change_pct_24h) > 100 THEN 50
      ELSE GREATEST(0, LEAST(100, 50 + ROUND(price_change_pct_24h)))::INTEGER
    END AS price_momentum_score,

    -- NEW v1.1: TVL (log-scaled USD, coef 14) — replaces cross-protocol placeholder
    CASE WHEN tvl_usd IS NULL OR tvl_usd <= 0 THEN NULL::INTEGER
         ELSE LEAST(100, ROUND(LOG(10, GREATEST(1, tvl_usd)) * 14))::INTEGER
    END AS tvl_score,

    -- Social visibility (binary curated flag, NULL when absent)
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
    CASE WHEN liquidity_score IS NULL AND volume_24h_score IS NULL THEN NULL::INTEGER
         ELSE ROUND(COALESCE(liquidity_score, 0) * 0.65 + COALESCE(volume_24h_score, 0) * 0.35)::INTEGER
    END AS liquidity_volume_score,
    CASE WHEN holders_count_score IS NULL AND holder_concentration_score IS NULL THEN NULL::INTEGER
         ELSE ROUND(COALESCE(holders_count_score, 0) * 0.55 + COALESCE(holder_concentration_score, 0) * 0.45)::INTEGER
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
  virtuals_name,
  virtuals_ticker,
  token_address,
  market_cap_usd,
  liquidity_usd,
  volume_24h_usd,
  tvl_usd,
  holders,
  top10_holder_pct,
  price_change_pct_24h,
  token_price_usd,

  -- Sub-scores
  market_cap_score,
  liquidity_score,
  volume_24h_score,
  liquidity_volume_score,
  holders_count_score,
  holder_concentration_score,
  holders_basket_score,
  price_momentum_score,
  tvl_score,
  social_score,

  -- Composite (weights: mc 25, liq+vol 20, holders 15, momentum 10, TVL 15, social 15)
  ROUND(
    COALESCE(market_cap_score, 0)         * 0.25 +
    COALESCE(liquidity_volume_score, 0)   * 0.20 +
    COALESCE(holders_basket_score, 0)     * 0.15 +
    COALESCE(price_momentum_score, 0)     * 0.10 +
    COALESCE(tvl_score, 0)                * 0.15 +
    COALESCE(social_score, 0)             * 0.15
  )::INTEGER AS tokenized_score,

  RANK() OVER (
    ORDER BY (
      COALESCE(market_cap_score, 0)       * 0.25 +
      COALESCE(liquidity_volume_score, 0) * 0.20 +
      COALESCE(holders_basket_score, 0)   * 0.15 +
      COALESCE(price_momentum_score, 0)   * 0.10 +
      COALESCE(tvl_score, 0)              * 0.15 +
      COALESCE(social_score, 0)           * 0.15
    ) DESC
  )::INTEGER AS rank_in_tokenized,

  -- Signals available count (6 signals: mc, liq+vol, holders, momentum, TVL, social)
  (
    (CASE WHEN market_cap_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN liquidity_volume_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN holders_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN price_momentum_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN tvl_score IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN social_score IS NOT NULL THEN 1 ELSE 0 END)
  )::INTEGER AS signals_available_count,

  -- Evidence-ready: 3-of-6 AND ≥1 economic signal (mc OR liq OR holders OR tvl > 0)
  (
    (
      (CASE WHEN market_cap_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN liquidity_volume_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN holders_basket_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN price_momentum_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN tvl_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN social_score IS NOT NULL THEN 1 ELSE 0 END)
    ) >= 3
    AND (
      (market_cap_usd IS NOT NULL AND market_cap_usd > 0)
      OR (liquidity_usd IS NOT NULL AND liquidity_usd > 0)
      OR (holders IS NOT NULL AND holders > 0)
      OR (tvl_usd IS NOT NULL AND tvl_usd > 0)
    )
  ) AS evidence_ready_for_public_rank,

  'v1.1-tokenized-tvl'::TEXT AS methodology_version

FROM baskets;

COMMENT ON VIEW public.agent_score_tokenized_v1 IS
  'Tokenized agent scoring view, methodology v1.1. Replaces v1.0 cross-protocol placeholder with TVL (capital locked, log-scaled coef 14). Weights: market cap 25% + liquidity/volume 20% + holders/concentration 15% + price momentum 10% + TVL 15% + social 15%. Cross-protocol presence is being tracked separately in cross_protocol_presence table and is a candidate signal for v1.2.';
