-- Migration: 20260608_0910_backfill_mcp_activity
-- Fixes Ghost Index measurement gap for the mcp_server category.
--
-- 20260607_0900_mcp_server_category.sql seeded 15 MCP servers WITHOUT setting
-- activity_status or last_event_at. The ghost_index_live view marks any agent
-- with activity_status != 'active' AND (last_event_at NULL or > 30d old) as
-- a ghost, so all 15 servers were counted as dead (0/15 alive).
--
-- These rows are all active official repos (filesystem-mcp, memory-mcp,
-- github-mcp, etc.) — the 0% is a measurement artifact, not reality.
--
-- This backfill sets activity_status='active' and last_event_at=NOW() for
-- every mcp_server row whose activity columns are still null/default.
-- Safe to re-run.

UPDATE agents
SET
  activity_status = 'active',
  last_event_at   = COALESCE(last_event_at, NOW())
WHERE primary_category = 'mcp_server'
  AND (activity_status IS NULL OR activity_status <> 'active');

-- The ghost-index-worker nightly job (23:50 UTC) will recompute and surface
-- the corrected liveness on the next snapshot. ghost_index_live is a live
-- view, so /ghost-index UI reflects this immediately after apply.
