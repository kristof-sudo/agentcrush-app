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
  indexed: '1,390',
  evidenceRanked: '130',
}

// Used when Supabase is unreachable (build without env, outage).
const FALLBACK = {
  indexed: 1394,
  evidenceRanked: 130,
  baseTier: 1264,
  ghostPct: 58.7,
  aliveAgents: 819,
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const EVIDENCE_VIEWS = [
  ['agent_score_model_family_v1', 'agent_id'],
  ['agent_score_tokenized_v1', 'agent_id'],
  ['agent_score_service_v1', 'agent_id'],
  ['agent_score_v2_top50_public_candidate', 'handle'],
]

export const getIndexStats = cache(async function getIndexStats() {
  const s = { ...FALLBACK }
  const sb = supabase()
  if (!sb) return s
  try {
    const [{ count: indexed }, ...erCounts] = await Promise.all([
      sb.from('agents').select('id', { count: 'exact', head: true }),
      ...EVIDENCE_VIEWS.map(([table, col]) =>
        sb.from(table).select(col, { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
      ),
    ])
    if (indexed) s.indexed = indexed
    const er = erCounts.reduce((sum, r) => sum + (r.count || 0), 0)
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
