/**
 * GET /api/watchlist/v1
 *
 * Personalized watchlist feed — agent state + recent changes for a
 * caller-supplied list of handles. No account or auth needed.
 *
 * Query params:
 *   ?handles=a,b,c   — comma-separated handles (max 50)
 *   ?days=N          — change window, 1–7 (default 7)
 *
 * CORS-open, free. Suitable for agent polling.
 * Cache: 5 min (short because liveness changes daily).
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const CHANGE_TYPES = ['rank_up', 'rank_down', 'tier_promotion', 'died', 'resurrected', 'new_agent']

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
  trackHit('/api/watchlist/v1', req, 'free_200')

  const { searchParams } = new URL(req.url)
  const handlesParam = searchParams.get('handles') || ''
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10) || 7, 1), 7)
  const handles = handlesParam.split(',').map((h) => h.trim()).filter(Boolean).slice(0, 50)

  if (handles.length === 0) {
    return Response.json(
      { error: 'missing_handles', detail: 'Pass ?handles=handle1,handle2 (up to 50)' },
      { status: 400, headers: CORS }
    )
  }

  const since = new Date(Date.now() - days * 86400000).toISOString()
  const client = db()

  try {
    const [agentsRes, changesRes] = await Promise.all([
      client
        .from('agents')
        .select('handle, display_name, tier, primary_category, activity_status, last_event_at, github_pushed_at')
        .in('handle', handles),
      client
        .from('changes_today_v1')
        .select('change_type, handle, display_name, primary_category, tier, detail, happened_at')
        .in('handle', handles)
        .gte('happened_at', since)
        .order('happened_at', { ascending: false })
        .limit(200),
    ])

    if (agentsRes.error) throw agentsRes.error
    if (changesRes.error) throw changesRes.error

    const agentMap = Object.fromEntries((agentsRes.data || []).map((a) => [a.handle, a]))
    const agents = handles
      .map((h) => agentMap[h])
      .filter(Boolean)
      .map((a) => {
        // freshest public code/event signal (same convention as /ghost-report);
        // `alive` is the multi-family liveness status the Ghost Index uses
        const sig = [a.last_event_at, a.github_pushed_at].filter(Boolean).sort()
        const { activity_status, last_event_at, github_pushed_at, ...rest } = a
        return {
          ...rest,
          alive: activity_status === 'active',
          last_code_or_event_signal_at: sig[sig.length - 1] || null,
          profile_url: `https://agentcrush.xyz/agent/${a.handle}`,
        }
      })
    const unknown_handles = handles.filter((h) => !agentMap[h])

    const changes = Object.fromEntries(CHANGE_TYPES.map((t) => [t, []]))
    for (const row of changesRes.data || []) {
      if (changes[row.change_type]) changes[row.change_type].push(row)
    }

    return Response.json(
      {
        handles,
        window_days: days,
        as_of: new Date().toISOString(),
        agents,
        unknown_handles,
        changes,
        feed_url: `https://agentcrush.xyz/api/watchlist/feed.xml?handles=${handles.join(',')}`,
        watchlist_url: 'https://agentcrush.xyz/watchlist',
        methodology: 'https://agentcrush.xyz/methodology',
      },
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
    )
  } catch (e) {
    return Response.json(
      { error: 'watchlist_unavailable', detail: e.message },
      { status: 503, headers: CORS }
    )
  }
}
