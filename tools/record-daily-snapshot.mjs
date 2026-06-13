/**
 * record-daily-snapshot.mjs — daily historical truth recorder.
 *
 * Reads all active agents + their current rankings and writes one snapshot
 * row per agent to agent_snapshots for today's date.
 *
 * Idempotent: skips any agent that already has a snapshot for today.
 * Append-only: never modifies existing rows.
 * No external API calls: reads only from existing Supabase state.
 *
 * Usage:
 *   node tools/record-daily-snapshot.mjs
 *
 * Scheduling (VPS cron, run once daily at 02:00 UTC):
 *   0 2 * * * cd /opt/agentcrush && node tools/record-daily-snapshot.mjs >> /var/log/agentcrush/snapshots.log 2>&1
 *
 * Requires: agent_snapshots table (apply supabase/migrations/20260408_1600_agent_snapshots.sql)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// This script runs under plain cron (no EnvironmentFile), so load the worker
// env file into process.env if the keys aren't already present. Mirrors the
// runtime-worker convention. Never logs secrets.
function loadEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL) return
  const candidates = [
    process.env.AGENTCRUSH_ENV_FILE,
    '/opt/agentcrush/fetchers/.env',
    new URL('../.env.local', import.meta.url).pathname,
    new URL('../.env', import.meta.url).pathname,
  ].filter(Boolean)
  for (const path of candidates) {
    try {
      for (const line of readFileSync(path, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* try next candidate */ }
  }
}
loadEnv()

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[snapshot] FATAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set (checked env + /opt/agentcrush/fetchers/.env)')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const TODAY = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

console.log(`[snapshot] date=${TODAY}`)

// ── 1. Load all agents ─────────────────────────────────────────────────────

const { data: agents, error: agentsErr } = await db
  .from('agents')
  .select('id, visibility_score, reputation_score, weekly_delta, claim_status, identity_type, activity_status, last_event_at')
  .order('id', { ascending: true })

if (agentsErr) {
  console.error('[snapshot] Failed to load agents:', agentsErr.message)
  process.exit(1)
}

console.log(`[snapshot] agents loaded: ${agents.length}`)

// ── 2. Load latest ranking per agent ──────────────────────────────────────

// Pull all rankings and keep the highest-ranked (lowest global_rank) per agent.
// This avoids a per-agent query loop.
const { data: rankings, error: rankingsErr } = await db
  .from('rankings')
  .select('agent_id, global_rank, score_total, score_visibility, score_reputation')
  .order('global_rank', { ascending: true })

if (rankingsErr) {
  console.error('[snapshot] Failed to load rankings:', rankingsErr.message)
  process.exit(1)
}

const rankByAgent = {}
for (const r of (rankings || [])) {
  // First occurrence = best rank (already sorted ascending)
  if (!rankByAgent[r.agent_id]) rankByAgent[r.agent_id] = r
}

console.log(`[snapshot] rankings loaded: ${rankings.length} rows, ${Object.keys(rankByAgent).length} agents ranked`)

// ── 3. Check which agents already have a snapshot today ───────────────────

const { data: existing, error: existingErr } = await db
  .from('agent_snapshots')
  .select('agent_id')
  .eq('snapshot_date', TODAY)

if (existingErr) {
  console.error('[snapshot] Failed to check existing snapshots:', existingErr.message)
  process.exit(1)
}

const alreadySnapshotted = new Set((existing || []).map((r) => r.agent_id))
console.log(`[snapshot] already snapshotted today: ${alreadySnapshotted.size}`)

// Capability probe: only write is_alive if the column exists. Keeps the daily
// snapshot (the strategic moat) safe regardless of migration/deploy ordering —
// if the reliability migration hasn't been applied yet, we simply skip the
// field instead of failing the whole insert.
let hasIsAlive = true
{
  const { error: probeErr } = await db.from('agent_snapshots').select('is_alive').limit(1)
  if (probeErr) {
    hasIsAlive = false
    console.warn('[snapshot] is_alive column absent — skipping liveness capture (apply 20260613_1100_agent_reliability.sql to enable)')
  }
}

// ── 4. Build snapshot rows ─────────────────────────────────────────────────

const rows = []

for (const agent of agents) {
  if (alreadySnapshotted.has(agent.id)) continue

  const ranking = rankByAgent[agent.id] || null

  const row = {
    agent_id:      agent.id,
    snapshot_date: TODAY,

    score:         ranking?.score_total      ?? null,
    rank:          ranking?.global_rank      ?? null,
    visibility:    ranking?.score_visibility ?? agent.visibility_score ?? null,
    reputation:    ranking?.score_reputation ?? agent.reputation_score ?? null,
    weekly_delta:  agent.weekly_delta        ?? null,

    github_stars:  null,
    github_forks:  null,
    follower_count: null,

    claim_status:  agent.claim_status        ?? null,
    identity_type: agent.identity_type       ?? null,
  }

  // Per-day liveness (Ghost Index rule) — the forward-collected signal that
  // powers agent_reliability_v1. Only written if the column exists (see probe).
  if (hasIsAlive) {
    row.is_alive =
      agent.activity_status === 'active' ||
      (agent.last_event_at != null &&
        new Date(agent.last_event_at).getTime() > Date.now() - 30 * 86400000)
  }

  rows.push(row)
}

if (rows.length === 0) {
  console.log('[snapshot] nothing to write — all agents already snapshotted today')
  process.exit(0)
}

// ── 5. Insert in batches of 100 ───────────────────────────────────────────

const BATCH = 100
let written = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error: insertErr } = await db
    .from('agent_snapshots')
    .insert(batch)

  if (insertErr) {
    console.error(`[snapshot] Insert error (batch ${i / BATCH + 1}):`, insertErr.message)
    process.exit(1)
  }

  written += batch.length
  console.log(`[snapshot] wrote ${written}/${rows.length}`)
}

console.log(`[snapshot] done. ${written} snapshots written for ${TODAY}`)

// ── 6. Compute and write weekly_delta to agents table ─────────────────────
//
// weekly_delta = rank_7dago - rank_today
//   positive → agent moved UP (e.g. was #20, now #15 → delta = +5)
//   negative → agent moved DOWN
//   null     → no 7-day history available
//
// Writes agents.weekly_delta so the weekly digest and ranking pages show
// real week-over-week moves instead of stale / null values.

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
console.log(`[snapshot] computing weekly_delta vs ${SEVEN_DAYS_AGO}`)

const { data: oldSnaps, error: oldErr } = await db
  .from('agent_snapshots')
  .select('agent_id, rank')
  .eq('snapshot_date', SEVEN_DAYS_AGO)

if (oldErr) {
  console.warn('[snapshot] Could not load 7-day-old snapshots — weekly_delta skipped:', oldErr.message)
} else {
  const rankMap7d = {}
  for (const s of (oldSnaps || [])) {
    if (s.rank != null) rankMap7d[s.agent_id] = s.rank
  }

  console.log(`[snapshot] 7d reference: ${Object.keys(rankMap7d).length} agents with rank on ${SEVEN_DAYS_AGO}`)

  const { data: todaySnaps, error: todayErr } = await db
    .from('agent_snapshots')
    .select('agent_id, rank')
    .eq('snapshot_date', TODAY)

  if (todayErr) {
    console.warn('[snapshot] Could not load today snapshots — weekly_delta skipped:', todayErr.message)
  } else {
    const agentUpdates = []
    for (const s of (todaySnaps || [])) {
      const oldRank = rankMap7d[s.agent_id]
      if (s.rank != null && oldRank != null) {
        agentUpdates.push({ id: s.agent_id, weekly_delta: oldRank - s.rank })
      }
    }

    console.log(`[snapshot] weekly_delta computable for ${agentUpdates.length} agents`)

    if (agentUpdates.length > 0) {
      let deltaWritten = 0
      for (let i = 0; i < agentUpdates.length; i += BATCH) {
        const batch = agentUpdates.slice(i, i + BATCH)
        const { error: deltaErr } = await db
          .from('agents')
          .upsert(batch, { onConflict: 'id' })

        if (deltaErr) {
          console.error(`[snapshot] weekly_delta upsert error (batch ${i / BATCH + 1}):`, deltaErr.message)
          // Non-fatal — partial writes are acceptable; retry next run
        } else {
          deltaWritten += batch.length
        }
      }
      console.log(`[snapshot] weekly_delta written for ${deltaWritten} agents`)
    } else {
      console.log('[snapshot] weekly_delta: no agents with 7-day history yet (normal for first week)')
    }
  }
}
