/**
 * GET /api/watchlist/v1?handles=a,b,c
 *
 * Personalized watchlist state — the accountless subscription. The handle
 * list IS the identity (no auth, no server-side state; the client keeps the
 * list in localStorage and the feed URL carries it).
 *
 * Returns per-agent live status (tier, liveness, last signal) plus the last
 * 7 days of index changes (rank moves, deaths, resurrections, promotions)
 * scoped to the watched handles.
 *
 * x402 pricing: FREE, CORS-open — same policy as /api/ghost-index/v1.
 * Agents can poll this; every pull is a distribution datapoint.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

const MAX_HANDLES = 50

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
  trackHit('/api/watchlist/v1', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const handles = (searchParams.get('handles') || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_HANDLES)

  if (handles.length === 0) {
    return Response.json(
      { error: 'Pass ?handles=a,b,c (max 50). Build a list at https://agentcrush.xyz/watchlist' },
      { status: 400, headers: CORS }
    )
  }

  try {
    const sb = db()
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const [{ data: agents, error: e1 }, { data: changes, error: e2 }] = await Promise.all([
      sb
        .from('agents')
        .select('handle, display_name, tier, primary_category, activity_status, last_event_at, github_pushed_at, avatar_url')
        .in('handle', handles)
        .neq('tier', 'archived'),
      sb
        .from('changes_today_v1')
        .select('change_type, handle, display_name, detail, happened_at')
        .in('handle', handles)
        .gte('happened_at', since)
        .order('happened_at', { ascending: false })
        .limit(200),
    ])
    if (e1) throw e1
    if (e2) throw e2

    const found = new Set((agents || []).map((a) => a.handle))
    const body = {
      generated_at: new Date().toISOString(),
      watched: handles.length,
      agents: (agents || []).map((a) => {
        // freshest public signal, same convention as /ghost-report
        const sig = [a.last_event_at, a.github_pushed_at].filter(Boolean).sort()
        return {
          handle: a.handle,
          name: a.display_name || a.handle,
          tier: a.tier,
          category: a.primary_category,
          alive: a.activity_status === 'active',
          last_signal_at: sig[sig.length - 1] || null,
          url: `https://agentcrush.xyz/agent/${encodeURIComponent(a.handle)}`,
        }
      }),
      unknown_handles: handles.filter((h) => !found.has(h)),
      changes_7d: changes || [],
      feeds: {
        rss: `https://agentcrush.xyz/watchlist.xml?handles=${handles.map(encodeURIComponent).join(',')}`,
      },
    }
    return Response.json(body, {
      headers: { ...CORS, 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900' },
    })
  } catch (err) {
    return Response.json({ error: 'watchlist lookup failed' }, { status: 500, headers: CORS })
  }
}
