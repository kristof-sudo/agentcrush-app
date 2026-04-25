-- ============================================================
-- Phase 5.1: Tiered indexing foundation
-- Created: 2026-04-25
-- ============================================================
--
-- SAFETY CONTRACT:
--   Does NOT modify rankings.score_total or rankings.global_rank.
--   Does NOT call recalc_rankings().
--   Does NOT delete agents or snapshots.
--   Does NOT archive or demote any agent.
--
-- Adds:
--   agents.tier              text NOT NULL DEFAULT 'indexed'
--   agents.tier_promoted_at  timestamptz
--   idx_agents_tier          index on agents(tier)
--
-- Tier values:
--   evidence_ranked  — has sufficient v2 signal coverage for a public rank
--   indexed          — in the index but below the evidence threshold (default)
--   archived         — removed from active discovery (set manually only)
--
-- Backfill:
--   Agents satisfying evidence_ready_for_public_rank = TRUE in
--   agent_score_v2_rank_comparison are promoted to evidence_ranked.
--   Evidence threshold: active_weight_total >= 0.55 OR
--     (current_rank <= 100 AND active_weight_total >= 0.45).
--   Expected result: ~39 evidence_ranked, ~1186 indexed, 0 archived.
-- ============================================================


-- ── Schema changes ────────────────────────────────────────────────────────────

ALTER TABLE agents
  ADD COLUMN tier text NOT NULL DEFAULT 'indexed'
    CONSTRAINT agents_tier_check CHECK (tier IN ('evidence_ranked', 'indexed', 'archived'));

ALTER TABLE agents
  ADD COLUMN tier_promoted_at timestamptz;

CREATE INDEX idx_agents_tier ON agents(tier);


-- ── Backfill: promote evidence-ready agents ───────────────────────────────────

UPDATE agents a
SET
  tier             = 'evidence_ranked',
  tier_promoted_at = NOW()
FROM agent_score_v2_rank_comparison v
WHERE v.agent_id = a.id
  AND v.evidence_ready_for_public_rank = TRUE;


-- ── Verify (run manually after applying) ─────────────────────────────────────
-- SELECT tier, COUNT(*) AS n FROM agents GROUP BY tier ORDER BY tier;
-- Expected: evidence_ranked ~39, indexed ~1186, archived 0
