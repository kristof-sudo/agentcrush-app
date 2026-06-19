#!/usr/bin/env node
/**
 * rankings-blend-recompute.mjs — recompute rankings.score_total + global_rank
 * from a BLENDED, credible score so prominent ALIVE agents rank logically.
 *
 * Why: the legacy score_total was driven only by hand-seeded vis/rep, which is 0
 * for ~1,240 of ~1,380 agents — so real, alive, high-star agents (e.g. Nous Hermes,
 * 197k★, alive) sank to arbitrary ranks (#319) while obscure hand-scored entries sat
 * near the top. This blends the real GitHub signals we now store (stars, liveness)
 * with the curated vis/rep so the ladder is credible AND keeps human curation.
 *
 * Score (one combined ladder — Kris, 2026-06-18):
 *   star   = 500 * log10(stars+1)                 ~0–2800
 *   live   = alive 3000 / dormant 1200 / ghost 0 / unknown 300   (from github_pushed_at;
 *            model_family entries count as ALIVE — base LLMs are served, not GitHub repos)
 *   tier   = evidence_ranked ? 1500 : 0
 *   legacy = 2500 * (score_visibility + score_reputation) / maxLegacy   ~0–2500
 *            ^ reads the canonkeeper-owned 0–100 components, which this worker NEVER
 *              writes — so re-running is idempotent and never feeds back on itself.
 *   total  = star + live + tier + legacy
 *
 * Archived rows (de-dup leftovers) get global_rank=NULL so they drop out of all
 * ranked views. Reversible: prior rankings backed up before first run.
 *
 * Daily order on the VPS: canonkeeper_tick -> github-liveness-refresh -> THIS ->
 * record-daily-snapshot (so the day's snapshot copies the blended ranks).
 *
 *   node runtime/rankings-blend-recompute.mjs --dry-run
 *   node runtime/rankings-blend-recompute.mjs --write [--refresh-today-snapshot]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')
const REFRESH_SNAP = process.argv.includes('--refresh-today-snapshot')
if (!WRITE && !process.argv.includes('--dry-run')) { console.error('Pass --dry-run or --write'); process.exit(1) }

for (const p of ['/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const DAY = 864e5
const NOW = Date.now()

async function pageAll(table, columns, filterFn = null) {
  let out = [], from = 0
  for (;;) {
    let q = db.from(table).select(columns).range(from, from + 999)
    if (filterFn) q = filterFn(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || !data.length) break
    out = out.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

function liveness(a) {
  if (a.primary_category === 'model_family') return { b: 3000, s: 'alive(model)' }
  if (!a.github_pushed_at) return { b: 300, s: 'unknown' }
  const d = (NOW - Date.parse(a.github_pushed_at)) / DAY
  return d <= 30 ? { b: 3000, s: 'alive' } : d <= 90 ? { b: 1200, s: 'dormant' } : { b: 0, s: 'ghost' }
}

const run = async () => {
  // legacy curated components, keyed by agent_id (never written by this worker)
  const ranks = await pageAll('rankings', 'agent_id, score_visibility, score_reputation')
  const legacyById = {}
  let maxLegacy = 1
  for (const r of ranks) {
    const v = (r.score_visibility || 0) + (r.score_reputation || 0)
    legacyById[r.agent_id] = v
    if (v > maxLegacy) maxLegacy = v
  }

  const agents = await pageAll('agents', 'id, handle, tier, primary_category, github_stars_live, github_pushed_at', q => q.neq('tier', 'archived'))

  const scored = agents.map((a) => {
    const star = Math.round(500 * Math.log10((a.github_stars_live || 0) + 1))
    const lv = liveness(a)
    const tier = a.tier === 'evidence_ranked' ? 1500 : 0
    const legacy = Math.round(2500 * ((legacyById[a.id] || 0) / maxLegacy))
    return { id: a.id, handle: a.handle, total: star + lv.b + tier + legacy, liveS: lv.s }
  }).sort((x, y) => y.total - x.total || x.handle.localeCompare(y.handle))

  scored.forEach((s, i) => { s.rank = i + 1 })

  console.log(`[blend] ${WRITE ? 'WRITE' : 'DRY'} | ${scored.length} active agents | maxLegacy(vis+rep)=${maxLegacy}`)
  console.log('[blend] top 12:')
  for (const s of scored.slice(0, 12)) console.log(`   #${s.rank} ${s.total} ${s.handle} (${s.liveS})`)

  if (!WRITE) { console.log('[blend] dry-run, no writes'); return }

  // 1) write blended score_total + global_rank for active agents.
  //    agent_id is not a unique key, so UPDATE in place (every agent already has a
  //    rankings row from canonkeeper/seed). score_visibility/score_reputation untouched.
  let n = 0, miss = 0
  for (const s of scored) {
    const { data, error } = await db.from('rankings').update({ score_total: s.total, global_rank: s.rank }).eq('agent_id', s.id).select('agent_id')
    if (error) { console.error(`  ERR ${s.handle}: ${error.message}`); continue }
    if (!data || !data.length) { miss++; continue }
    n++
  }
  console.log(`[blend] updated ${n} ranking rows (${miss} had no rankings row — skipped)`)

  // 2) push archived agents (de-dup leftovers) to the bottom so they never surface in
  //    ranked views. global_rank is NOT NULL, so use a high sentinel band, not NULL.
  const archived = await pageAll('agents', 'id', q => q.eq('tier', 'archived'))
  if (archived.length) {
    const { error } = await db.from('rankings').update({ global_rank: 90000 }).in('agent_id', archived.map(a => a.id))
    console.log(`[blend] archived → rank 90000 (bottom): ${archived.length}${error ? ' (ERR ' + error.message + ')' : ''}`)
  }

  // 3) optional one-time correction of today's already-frozen snapshot so Ghost Check
  //    (which reads the latest snapshot) reflects the blend immediately. In the steady
  //    state this worker runs BEFORE record-daily-snapshot, so this is not needed daily.
  if (REFRESH_SNAP) {
    const today = new Date(NOW).toISOString().slice(0, 10)
    let m = 0
    for (const s of scored) {
      const { error } = await db.from('agent_snapshots').update({ rank: s.rank, score: s.total }).eq('agent_id', s.id).eq('snapshot_date', today)
      if (!error) m++
    }
    console.log(`[blend] refreshed today (${today}) snapshots: ${m}`)
  }
  console.log('[blend] done.')
}

run().catch((e) => { console.error('[blend] FATAL', e.message); process.exit(1) })
