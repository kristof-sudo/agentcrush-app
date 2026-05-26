-- Risk flags view — Caliber methodology follow-up (b)
--
-- Inspired by Caliber's risk surface. Implements 4 deterministic flag rules where
-- underlying data exists. Returns per-agent JSONB array of active risk flags.
--
-- Rules implemented:
--   1. concentration_risk  — tokenized: top10_holder_pct > 80
--      Source: virtuals_agents.top10_holder_pct
--      Rationale: top-10 holding >80% → de facto centralised token; price/liquidity
--      can be controlled by a small group. High susceptibility to manipulation.
--
--   2. dormancy_risk       — developer: github_pushed_at NULL or > 90 days ago
--      Source: agent_score_v2_top50_public_candidate.github_pushed_at
--      Rationale: no GitHub activity in 90+ days → maintenance risk; score may
--      reflect historical momentum, not current state.
--
-- Rules NOT implemented yet (data absent):
--   3. sybil_risk          — requires self-deal tx analysis (not ingested)
--   4. volume_anomaly_risk — requires 30d rolling average vs lifetime avg (not stored)
--
-- Architecture:
--   - One UNION view (agent_risk_flags_v1) covers all categories.
--   - Agents with no applicable flags → empty array [].
--   - Agents not in any flagged category → NULL (not included in this view).
--   - Consumer joins on agent_id or handle to get flags.
--   - Non-destructive: no changes to base tables or scoring views.
--
-- Idempotent (CREATE OR REPLACE VIEW).

-- ── Helper function: build a JSONB risk-flag entry ────────────────────────────

CREATE OR REPLACE FUNCTION public.build_risk_flag(
  flag_code    TEXT,
  flag_label   TEXT,
  severity     TEXT,  -- 'high' | 'medium' | 'low'
  detail       TEXT
) RETURNS JSONB
LANGUAGE SQL
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT jsonb_build_object(
    'code',     flag_code,
    'label',    flag_label,
    'severity', severity,
    'detail',   detail
  );
$$;

COMMENT ON FUNCTION public.build_risk_flag IS
  'Builds a single JSONB risk-flag entry. Used by agent_risk_flags_v1.';

-- ── Tokenized risk flags ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.agent_risk_flags_tokenized_v1 AS
SELECT
  a.id                AS agent_id,
  a.handle,
  -- Accumulate applicable flags into a JSONB array
  (
    jsonb_build_array()
    ||
    CASE
      WHEN v.top10_holder_pct > 80
      THEN jsonb_build_array(
        public.build_risk_flag(
          'concentration_risk',
          'High holder concentration',
          'high',
          format('Top-10 wallets hold %.1f%% of supply (threshold: >80%%)', v.top10_holder_pct)
        )
      )
      ELSE '[]'::jsonb
    END
    -- Future: || sybil_flag when data available
    -- Future: || volume_anomaly_flag when data available
  ) AS risk_flags,
  -- Summary fields
  jsonb_array_length(
    jsonb_build_array()
    || CASE WHEN v.top10_holder_pct > 80
       THEN jsonb_build_array(public.build_risk_flag('concentration_risk','','',' '))
       ELSE '[]'::jsonb END
  ) AS risk_flag_count,
  CASE
    WHEN v.top10_holder_pct > 80 THEN 'high'
    ELSE 'none'
  END AS max_severity,
  'tokenized' AS category
FROM public.agents a
JOIN public.virtuals_agents v ON v.virtuals_id = a.virtuals_id
WHERE a.virtuals_id IS NOT NULL
  AND v.top10_holder_pct IS NOT NULL;

COMMENT ON VIEW public.agent_risk_flags_tokenized_v1 IS
  'Risk flags for tokenized agents. Currently implements: concentration_risk (top10 > 80%). '
  'Joins on virtuals_id — only agents with virtuals market data are included. '
  'Pending data for: sybil_risk, volume_anomaly_risk.';

-- ── Developer risk flags ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.agent_risk_flags_developer_v1 AS
SELECT
  a.id                AS agent_id,
  a.handle,
  (
    jsonb_build_array()
    ||
    CASE
      WHEN d.github_pushed_at IS NULL
        OR d.github_pushed_at < NOW() - INTERVAL '90 days'
      THEN jsonb_build_array(
        public.build_risk_flag(
          'dormancy_risk',
          'No recent GitHub activity',
          'medium',
          CASE
            WHEN d.github_pushed_at IS NULL
            THEN 'No GitHub push date recorded — activity status unknown'
            ELSE format('Last push: %s (%s days ago)',
              d.github_pushed_at::DATE,
              (NOW()::DATE - d.github_pushed_at::DATE)::INTEGER
            )
          END
        )
      )
      ELSE '[]'::jsonb
    END
  ) AS risk_flags,
  jsonb_array_length(
    jsonb_build_array()
    || CASE
       WHEN d.github_pushed_at IS NULL
         OR d.github_pushed_at < NOW() - INTERVAL '90 days'
       THEN jsonb_build_array(public.build_risk_flag('dormancy_risk','','',' '))
       ELSE '[]'::jsonb END
  ) AS risk_flag_count,
  CASE
    WHEN d.github_pushed_at IS NULL
      OR d.github_pushed_at < NOW() - INTERVAL '90 days'
    THEN 'medium'
    ELSE 'none'
  END AS max_severity,
  'developer' AS category
FROM public.agents a
JOIN public.agent_score_v2_top50_public_candidate d ON d.handle = a.handle
WHERE d.github_pushed_at IS NOT NULL
   OR d.github_score IS NOT NULL;  -- include if any github signal exists

COMMENT ON VIEW public.agent_risk_flags_developer_v1 IS
  'Risk flags for developer agents. Currently implements: dormancy_risk (no GitHub push in 90+ days). '
  'Joins on agent_score_v2_top50_public_candidate — only ranked developer agents are included.';

-- ── Unified risk flags view ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.agent_risk_flags_v1 AS
  SELECT * FROM public.agent_risk_flags_tokenized_v1
  UNION ALL
  SELECT * FROM public.agent_risk_flags_developer_v1;

COMMENT ON VIEW public.agent_risk_flags_v1 IS
  'Unified risk-flags view across all categories with data. Currently covers: '
  'tokenized (concentration_risk) and developer (dormancy_risk). '
  'UNIONs per-category views — add new category views here as data becomes available. '
  'Agents with no applicable data are not included (NULL is not the same as no flags).';

-- ── Verification queries (informational) ──────────────────────────────────────

-- Tokenized risk summary:
--   SELECT max_severity, COUNT(*) FROM agent_risk_flags_tokenized_v1
--   GROUP BY 1 ORDER BY 1;

-- Developer dormancy summary:
--   SELECT max_severity, COUNT(*) FROM agent_risk_flags_developer_v1
--   GROUP BY 1 ORDER BY 1;

-- Agents with at least 1 flag:
--   SELECT handle, category, risk_flag_count, max_severity, risk_flags
--   FROM agent_risk_flags_v1
--   WHERE risk_flag_count > 0
--   ORDER BY risk_flag_count DESC, category;
