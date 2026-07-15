/**
 * Shared index stats — single source of truth for headline numbers.
 *
 * Two tiers:
 *  - getIndexStats(): live counts from Supabase, for server components that
 *    render exact numbers (glossary, agent-economy). Cached per-request via
 *    React cache(); pages should set `revalidate` for ISR.
 *  - FLOOR: conservative floors for static copy (metadata descriptions,
 *    API methodology strings) that cannot await a query. Floors are safe to
 *    under-state and stay true as the index grows — phrase as "over X" / "X+".
 *
 * Update FALLBACK/FLOOR only when the live index crosses a new threshold.
 */

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

export const FLOOR = {
  indexed: '1,400',
  evidenceRanked: '145',
}

// Used when Supabase is unreachable (build without env, outage).
// Updated 2026-07-15: live-verified 2026-07-14 — 1,403 indexed / 145 evidence-ranked / 58.0% Ghost Index.
const FALLBACK = {
  indexed: 1403,
  evidenceRanked: 145,
  baseTier: 1258,
  ghostPct: 58.0,
  aliveAgents: 813,
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export const getIndexStats = cache(async function getIndexStats() {
  const s = { ...FALLBACK }
  const sb = supabase()
  if (!sb) return s
  try {
    // Evidence-ranked = agents.tier count, NOT the sum of the 4 per-category
    // score views: an agent evidence-ready in two categories appears in two
    // views, and that sum (179 vs the true 135 on 2026-07-01) is what put an
    // inflated count on /agent-economy. The tier count matches the Ghost
    // Index daily snapshot — one number everywhere.
    const [{ count: indexed }, { count: er }] = await Promise.all([
      sb.from('agents').select('id', { count: 'exact', head: true }),
      sb.from('agents').select('id', { count: 'exact', head: true }).eq('tier', 'evidence_ranked'),
    ])
    if (indexed) s.indexed = indexed
    if (er) s.evidenceRanked = er
    s.baseTier = s.indexed - s.evidenceRanked

    const { data: ghost } = await sb
      .from('ghost_index_daily')
      .select('liveness_score, alive_agents')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()
    if (ghost?.liveness_score != null) {
      s.ghostPct = Number(ghost.liveness_score)
      if (ghost.alive_agents != null) s.aliveAgents = ghost.alive_agents
    }
  } catch {
    // fall through with whatever resolved; FALLBACK covers the rest
  }
  return s
})

export function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US') : n
}
