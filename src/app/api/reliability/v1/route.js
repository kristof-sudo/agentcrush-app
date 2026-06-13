/**
 * GET /api/reliability/v1 — Agent Reliability Score
 *
 * Per-agent rolling uptime: what fraction of tracked days an agent was alive
 * (Ghost Index rule), collected forward from a real daily liveness signal.
 *
 * Two honest signals are available immediately:
 *   currently_alive   — is the agent alive right now (single-valued, live)
 *   days_since_active — days since its last public signal
 * The rolling reliability_30d / reliability_90d accrue over time. Every row
 * carries `coverage` (building | partial | full) so the number is never
 * presented as deeper than the data behind it.
 *
 * Query params:
 *   ?handle=X   — one agent's reliability detail
 *   (none)      — coverage status + most-reliable leaderboard (once data accrues)
 *
 * x402 pricing: FREE — open to maximize citation (same policy as Ghost Index/PCS).
 * Cache: 1h.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

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

const SELECT =
  'handle, display_name, primary_category, tier, currently_alive, days_since_active, ' +
  'days_tracked_30d, days_alive_30d, reliability_30d, days_tracked_90d, reliability_90d, ' +
  'last_alive_date, coverage'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  trackHit('/api/reliability/v1', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  const supabase = db()

  try {
    if (handle) {
      const safe = handle.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      const { data, error } = await supabase
        .from('agent_reliability_v1')
        .select(SELECT)
        .ilike('handle', safe)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        return Response.json(
          { error: `Agent not found: ${handle}`, hint: 'Use /api/agents/find?q=<keyword> to search.' },
          { status: 404, headers: CORS }
        )
      }
      return Response.json(
        {
          ...data,
          methodology: 'reliability = days alive / days tracked (Ghost Index liveness rule), collected forward daily',
          methodology_url: 'https://agentcrush.xyz/methodology',
        },
        { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
      )
    }

    // Index-wide view: coverage status + most-reliable leaderboard.
    const { data, error } = await supabase
      .from('agent_reliability_v1')
      .select(SELECT)
      .order('reliability_30d', { ascending: false, nullsFirst: false })
      .limit(2000)
    if (error) throw error

    const rows = data || []
    const withScore = rows.filter((r) => r.reliability_30d != null)
    const coverageCounts = rows.reduce((acc, r) => {
      acc[r.coverage] = (acc[r.coverage] || 0) + 1
      return acc
    }, {})
    const aliveNow = rows.filter((r) => r.currently_alive).length

    return Response.json(
      {
        as_of: new Date().toISOString(),
        // Honest now: live liveness across the index (this is real today).
        currently_alive: aliveNow,
        total_agents: rows.length,
        // Forward-collected uptime — note its depth honestly.
        coverage: coverageCounts,
        scored_agents: withScore.length,
        note:
          withScore.length === 0
            ? 'Rolling reliability is collecting forward from today; leaderboard populates as daily liveness history accrues (~1 week for partial, ~4 weeks for full coverage). currently_alive / days_since_active are accurate now.'
            : `${withScore.length} agents have enough history to score.`,
        most_reliable: withScore.slice(0, 25).map((r) => ({
          handle: r.handle,
          display_name: r.display_name,
          reliability_30d: r.reliability_30d,
          days_tracked_30d: r.days_tracked_30d,
          coverage: r.coverage,
          currently_alive: r.currently_alive,
          profile_url: `https://agentcrush.xyz/agent/${r.handle}`,
        })),
        methodology_url: 'https://agentcrush.xyz/methodology',
      },
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (e) {
    return Response.json({ error: 'reliability_unavailable', detail: e.message }, { status: 503, headers: CORS })
  }
}
