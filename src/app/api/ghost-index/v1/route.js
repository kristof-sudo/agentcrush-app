/**
 * GET /api/ghost-index/v1
 *
 * Returns the AgentCrush Ghost Index — the % of indexed AI agents showing
 * signs of life (active status or recent event in last 30 days).
 *
 * "The agent economy is X% alive."
 *
 * Query params:
 *   ?history=N   — include last N days of daily snapshots (default 30, max 365)
 *   ?live=true   — compute from DB in real time instead of last stored snapshot
 *
 * x402 pricing: FREE — this endpoint is intentionally open to maximize citation.
 * See /api/trust/evaluate for premium endpoints.
 *
 * Cache: 1h (snapshot is computed nightly; real-time option bypasses cache).
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const historyDays = Math.min(parseInt(searchParams.get('history') || '30', 10), 365)
  const live = searchParams.get('live') === 'true'

  const supabase = db()

  try {
    let current

    if (live) {
      // Real-time computation from ghost_index_live view
      const { data, error } = await supabase
        .from('ghost_index_live')
        .select('*')
        .single()
      if (error) throw error
      current = data
    } else {
      // Latest stored snapshot
      const { data, error } = await supabase
        .from('ghost_index_daily')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()
      if (error) throw error
      current = data
    }

    // History
    const { data: history } = await supabase
      .from('ghost_index_daily')
      .select('snapshot_date, liveness_score, total_agents, alive_agents')
      .order('snapshot_date', { ascending: false })
      .limit(historyDays)

    // Compute delta vs 7 days ago
    const weekAgo = history?.find((_, i) => i >= 7)
    const delta7d = weekAgo
      ? Number((current.liveness_score - weekAgo.liveness_score).toFixed(1))
      : null

    const liveness = Number(current.liveness_score)
    const sentiment =
      liveness < 10  ? 'graveyard' :
      liveness < 25  ? 'haunted'   :
      liveness < 50  ? 'struggling':
      liveness < 75  ? 'active'    :
                       'thriving'

    const payload = {
      ghost_index: {
        liveness_score:       liveness,
        sentiment,
        total_agents:         current.total_agents,
        alive_agents:         current.alive_agents,
        ghost_agents:         current.ghost_agents,
        delta_7d:             delta7d,
        category_breakdown:   current.category_breakdown ?? {},
        tier_breakdown: {
          evidence_ranked: current.evidence_ranked,
          indexed_only:    current.indexed_only,
        },
        computed_at:          current.computed_at ?? current.snapshot_date,
        methodology_version:  current.methodology_version ?? 'v1.0',
      },
      definition: {
        alive: 'activity_status = "active" OR last_event_at within last 30 days',
        ghost: 'all other indexed agents — no observable activity signal',
        note:  'AgentCrush indexes agents from GitHub, Virtuals, Agentverse, ERC-8004, and direct submissions. Liveness is a lower-bound estimate — absence of signal ≠ confirmed dormant.',
      },
      history: (history || []).map(r => ({
        date:            r.snapshot_date,
        liveness_score:  Number(r.liveness_score),
        total_agents:    r.total_agents,
        alive_agents:    r.alive_agents,
      })),
      methodology_url: 'https://agentcrush.xyz/methodology#ghost-index',
      source_url:      'https://agentcrush.xyz/ghost-index',
      _attribution: {
        index:      'AgentCrush Ghost Index',
        version:    '1.0',
        produced_by:'https://agentcrush.xyz',
        license:    'CC-BY-4.0',
        cite_as:    `AgentCrush Ghost Index v1.0 — liveness_score: ${liveness}% as of ${current.computed_at ?? current.snapshot_date}`,
      },
    }

    const cacheHeader = live ? 'no-store' : 'public, max-age=3600, s-maxage=3600'

    return Response.json(payload, {
      status: 200,
      headers: { ...CORS, 'Cache-Control': cacheHeader },
    })
  } catch (err) {
    return Response.json(
      { error: err.message, hint: 'Ghost Index table may not be migrated yet. Apply migrations/20260607_1400_ghost_index.sql.' },
      { status: 500, headers: CORS }
    )
  }
}
