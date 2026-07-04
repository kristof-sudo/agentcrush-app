#!/usr/bin/env node
/**
 * bt-scoring-worker — Bradley-Terry Phase 1 shadow scoring (B29).
 *
 * Weekly (Sunday 09:30 UTC, after the scoring run at ~09:00):
 *  1. Fetch all Developer-category evidence_ranked agents
 *  2. Load their last 90 days of agent_snapshots (rank by day)
 *  3. Build a pairwise win matrix: W[i][j] = days agent i ranked above agent j
 *  4. Fit Bradley-Terry via the MM (minorize-maximize) algorithm
 *  5. Normalize θ to [0, 100]; derive bt_rank (1 = best) and pair_count
 *  6. Upsert into agent_bt_scores (unique on agent_id + category + fit_date)
 *
 * Deliverable: rank confidence intervals, not a rival rank list.
 * Zero public surface — all output lives in agent_bt_scores (RLS: service-role only).
 * Shadow view for internal inspection: agent_score_v3_bt_preview
 *
 * Usage:
 *   node runtime/bt-scoring-worker.mjs --dry-run    # log what would be written
 *   node runtime/bt-scoring-worker.mjs --write       # write to agent_bt_scores
 *   node runtime/bt-scoring-worker.mjs --selftest    # math sanity check, no DB
 *
 * Graceful degradation: if agent_bt_scores table is missing (migration not applied),
 * logs a notice and exits 0.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry-run')
const WRITE = process.argv.includes('--write')
const SELFTEST = process.argv.includes('--selftest')
const CATEGORY = 'developer'
const LOOKBACK_DAYS = 90
const MIN_PAIR_DAYS = 30    // agent must have ≥30 snapshot days to be included in the fit
const MM_MAX_ITER = 1000
const MM_EPS = 1e-10

// load env from the VPS locations or local fallback
for (const p of ['/opt/agentcrush/fetchers/.env', '/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try {
    for (const l of readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}

// ── Bradley-Terry MM fit ───────────────────────────────────────────────────────────────
// wins[i][j] = number of comparison days where agent i ranked strictly above agent j.
// Returns θ array (normalized to [0,100]) parallel to the input agents array.
function fitBradleyTerry(n, wins) {
  let theta = new Array(n).fill(1.0)

  // precompute total comparisons per pair: n_ij[i][j] = wins[i][j] + wins[j][i]
  const nij = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => wins[i][j] + wins[j][i])
  )

  for (let iter = 0; iter < MM_MAX_ITER; iter++) {
    const next = new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      let totalWins = 0
      let denom = 0
      for (let j = 0; j < n; j++) {
        if (i === j || nij[i][j] === 0) continue
        totalWins += wins[i][j]
        denom += nij[i][j] / (theta[i] + theta[j])
      }
      next[i] = denom > 0 ? totalWins / denom : theta[i]
    }

    // re-normalize to sum=n to prevent numeric drift
    const sum = next.reduce((a, b) => a + b, 0)
    if (sum === 0) break
    for (let i = 0; i < n; i++) next[i] = (next[i] * n) / sum

    // convergence check
    let maxDelta = 0
    for (let i = 0; i < n; i++) maxDelta = Math.max(maxDelta, Math.abs(next[i] - theta[i]))
    theta = next
    if (maxDelta < MM_EPS) {
      console.log(`[bt] MM converged at iteration ${iter + 1} (maxDelta=${maxDelta.toExponential(2)})`)
      break
    }
    if (iter === MM_MAX_ITER - 1) {
      console.log(`[bt] MM reached max iterations (${MM_MAX_ITER}); proceeding with current θ`)
    }
  }

  return theta
}

// ── selftest ───────────────────────────────────────────────────────────────────────────
if (SELFTEST) {
  // 3 agents: A clearly dominates, B middle, C weakest
  // A beats B 10×, A beats C 10×, B beats C 10×
  const wins = [
    [0, 10, 10],
    [0,  0, 10],
    [0,  0,  0],
  ]
  const theta = fitBradleyTerry(3, wins)
  // normalize to [0,100]
  const tMin = Math.min(...theta), tMax = Math.max(...theta)
  const scores = theta.map(t => tMax > tMin ? (t - tMin) / (tMax - tMin) * 100 : 50)
  const ok = scores[0] > scores[1] && scores[1] > scores[2]
    && scores[0] > 90 && scores[2] < 10
  console.log(`[selftest] θ = [${theta.map(x => x.toFixed(4)).join(', ')}]`)
  console.log(`[selftest] scores = [${scores.map(x => x.toFixed(2)).join(', ')}]`)
  console.log(ok ? '[selftest] PASS — A > B > C with expected separation' : '[selftest] FAIL')
  process.exit(ok ? 0 : 1)
}

if (!DRY && !WRITE) {
  console.error('Pass --dry-run, --write, or --selftest')
  process.exit(1)
}

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── 1. fetch Developer evidence_ranked agents ──────────────────────────────────────────
const { data: agentRows, error: agentErr } = await sb
  .from('agents')
  .select('id, handle')
  .eq('primary_category', CATEGORY)
  .eq('tier', 'evidence_ranked')

if (agentErr) {
  console.error('[bt] agents query failed:', agentErr.message)
  process.exit(1)
}
if (!agentRows?.length) {
  console.log(`[bt] 0 evidence_ranked ${CATEGORY} agents — nothing to do`)
  process.exit(0)
}
console.log(`[bt] ${agentRows.length} evidence_ranked ${CATEGORY} agents`)

const agentIds = agentRows.map(a => a.id)
const idxById  = Object.fromEntries(agentRows.map((a, i) => [a.id, i]))
const n = agentRows.length

// ── 2. load last 90 days of snapshots ─────────────────────────────────────────────────
const cutoff = new Date()
cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)
const cutoffStr = cutoff.toISOString().slice(0, 10)

// Supabase has a 1000-row default limit; use fetchAllPages for safety.
async function fetchAllSnapshots() {
  const rows = []
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('agent_snapshots')
      .select('agent_id, snapshot_date, rank')
      .in('agent_id', agentIds)
      .gte('snapshot_date', cutoffStr)
      .not('rank', 'is', null)
      .order('snapshot_date', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`snapshots query failed: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

let snapshots
try {
  snapshots = await fetchAllSnapshots()
} catch (e) {
  console.error('[bt]', e.message)
  process.exit(1)
}
console.log(`[bt] ${snapshots.length} snapshot rows (${LOOKBACK_DAYS}d window)`)

if (!snapshots.length) {
  console.log('[bt] no snapshot data — nothing to fit')
  process.exit(0)
}

// ── 3. build pairwise win matrix ───────────────────────────────────────────────────────
// Group snapshots by date, then for each date build the rank order and emit pairwise wins.
const byDate = {}
for (const row of snapshots) {
  const d = row.snapshot_date
  if (!byDate[d]) byDate[d] = []
  byDate[d].push(row)
}

const wins = Array.from({ length: n }, () => new Array(n).fill(0))
const dayCount = new Array(n).fill(0)  // how many snapshot days each agent appears in

for (const day of Object.values(byDate)) {
  // Sort by rank ascending (rank 1 = top)
  day.sort((a, b) => a.rank - b.rank)
  // Collect agents that appear today and are in our index
  const today = day
    .filter(r => idxById[r.agent_id] !== undefined)
    .map(r => ({ idx: idxById[r.agent_id], rank: r.rank }))

  // increment day count
  const seenIdxs = new Set(today.map(t => t.idx))
  for (const idx of seenIdxs) dayCount[idx]++

  // emit pairwise wins: for all pairs (i, j) where rank_i < rank_j (i beats j)
  for (let a = 0; a < today.length; a++) {
    for (let b = a + 1; b < today.length; b++) {
      // today[a] is ranked above today[b] (sorted ascending)
      wins[today[a].idx][today[b].idx]++
    }
  }
}

// filter out agents with fewer than MIN_PAIR_DAYS snapshot days — too sparse to fit
const eligible = agentRows
  .map((a, i) => ({ ...a, idx: i, days: dayCount[i] }))
  .filter(a => a.days >= MIN_PAIR_DAYS)

console.log(`[bt] ${eligible.length}/${n} agents meet ≥${MIN_PAIR_DAYS}d snapshot gate`)

if (eligible.length < 3) {
  console.log('[bt] fewer than 3 eligible agents — fit not meaningful, exiting')
  process.exit(0)
}

// build a reduced win matrix for eligible agents only
const eligIdx = eligible.map(a => a.idx)
const ne = eligible.length
const winsReduced = Array.from({ length: ne }, (_, i) =>
  Array.from({ length: ne }, (_, j) => wins[eligIdx[i]][eligIdx[j]])
)

// ── 4. fit BT model ────────────────────────────────────────────────────────────────────
const theta = fitBradleyTerry(ne, winsReduced)

// ── 5. normalize to [0, 100] and derive bt_rank ────────────────────────────────────────
const tMin = Math.min(...theta)
const tMax = Math.max(...theta)
const range = tMax - tMin

const btScores = theta.map(t => range > 0 ? (t - tMin) / range * 100 : 50)

// bt_rank: 1 = highest bt_score. tie-break by original array order (stable)
const sortedOrder = [...Array(ne).keys()].sort((a, b) => btScores[b] - btScores[a])
const btRanks = new Array(ne)
sortedOrder.forEach((agentIdx, rank) => { btRanks[agentIdx] = rank + 1 })

// pair_count per agent: total comparison outcomes (wins + losses across all opponents)
const pairCounts = Array.from({ length: ne }, (_, i) => {
  let total = 0
  for (let j = 0; j < ne; j++) {
    if (i === j) continue
    total += winsReduced[i][j] + winsReduced[j][i]
  }
  return total
})

const fitDate = new Date().toISOString().slice(0, 10)

const records = eligible.map((agent, i) => ({
  agent_id:   agent.id,
  category:   CATEGORY,
  bt_score:   Math.round(btScores[i] * 10000) / 10000,
  bt_rank:    btRanks[i],
  pair_count: pairCounts[i],
  fit_date:   fitDate,
}))

// log top 10 for verification
console.log('\n[bt] top 10 by BT rank:')
records
  .slice()
  .sort((a, b) => a.bt_rank - b.bt_rank)
  .slice(0, 10)
  .forEach(r => {
    const handle = eligible.find(e => e.id === r.agent_id)?.handle || r.agent_id
    console.log(`  #${String(r.bt_rank).padStart(3)}  ${handle.padEnd(40)} bt=${r.bt_score.toFixed(2).padStart(7)}  pairs=${r.pair_count}`)
  })
console.log()

if (DRY) {
  console.log(`[bt] --dry-run: would upsert ${records.length} records for fit_date=${fitDate}`)
  process.exit(0)
}

// ── 6. upsert into agent_bt_scores ────────────────────────────────────────────────────
const { error: upsertErr } = await sb
  .from('agent_bt_scores')
  .upsert(records, { onConflict: 'agent_id,category,fit_date' })

if (upsertErr) {
  if (upsertErr.code === '42P01' || /agent_bt_scores/.test(upsertErr.message)) {
    console.log('[bt] agent_bt_scores table not present (migration pending) — nothing written')
    process.exit(0)
  }
  console.error('[bt] upsert failed:', upsertErr.message)
  process.exit(1)
}

console.log(`[bt] wrote ${records.length} records to agent_bt_scores (fit_date=${fitDate}, category=${CATEGORY})`)
