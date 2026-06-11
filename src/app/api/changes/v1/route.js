/**
 * GET /api/changes/v1
 *
 * "What changed today" — the daily diff of the AgentCrush index.
 * Rank movers (day-over-day), new agents indexed, tier promotions,
 * deaths (30-day liveness window expired) and resurrections.
 *
 * Query params:
 *   ?days=N   — window in days, 1–7 (default 1)
 *
 * x402 pricing: FREE — open to maximize citation, same policy as /api/ghost-index/v1.
 *
 * Cache: 15 min.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const TYPES = ['rank_up', 'rank_down', 'new_agent', 'tier_promotion', 'died', 'resurrected']

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
  trackHit('/api/changes/v1', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '1', 10) || 1, 1), 7)
  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    const { data, error } = await db()
      .from('changes_today_v1')
      .select('change_type, handle, display_name, primary_category, tier, detail, happened_at')
      .gte('happened_at', since)
      .order('happened_at', { ascending: false })
      .limit(500)
    if (error) throw error

    const changes = Object.fromEntries(TYPES.map((t) => [t, []]))
    for (const row of data || []) {
      if (changes[row.change_type]) changes[row.change_type].push(row)
    }
    // Rank movers: biggest absolute move first, capped per direction
    changes.rank_up.sort((a, b) => (b.detail?.delta ?? 0) - (a.detail?.delta ?? 0))
    changes.rank_down.sort((a, b) => (a.detail?.delta ?? 0) - (b.detail?.delta ?? 0))
    changes.rank_up = changes.rank_up.slice(0, 25)
    changes.rank_down = changes.rank_down.slice(0, 25)

    return Response.json(
      {
        window_days: days,
        as_of: new Date().toISOString(),
        counts: Object.fromEntries(TYPES.map((t) => [t, changes[t].length])),
        changes,
        methodology: 'https://agentcrush.xyz/methodology',
        source: 'https://agentcrush.xyz/changes',
      },
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } }
    )
  } catch (e) {
    return Response.json(
      { error: 'changes_unavailable', detail: e.message },
      { status: 503, headers: CORS }
    )
  }
}
