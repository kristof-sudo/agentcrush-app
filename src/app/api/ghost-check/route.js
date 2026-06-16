/**
 * GET /api/ghost-check?q=<free-form> — the Ghost Check gotcha.
 *
 * Resolves any free-form input (handle / GitHub / X / website) to an indexed
 * agent and returns a one-glance, HONEST verdict:
 *   liveness  — ALIVE / DORMANT / GHOST, from the agent's REAL GitHub activity
 *               (repo pushed_at), not our stale last_event_at.
 *   trust     — TRUSTED / UNVERIFIED / CAUTION / GHOST, calibrated so an active,
 *               popular-but-unclaimed agent reads UNVERIFIED (neutral), never AVOID.
 *   receipts  — last active (real), stars (real), rank/tier.
 * FREE, CORS-open, cached 5m.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'
import { resolveAgent } from '@/lib/resolveAgent'
import { githubLiveness, livenessFrom } from '@/lib/githubLiveness'

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
  trackHit('/api/ghost-check', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').slice(0, 200)
  if (!q.trim()) {
    return Response.json({ error: 'Provide ?q=<agent handle, GitHub, X, or site>' }, { status: 400, headers: CORS })
  }

  try {
    const supabase = db()
    const match = await resolveAgent(supabase, q)
    if (!match) {
      return Response.json(
        { input: q, found: false, message: 'Not in the AgentCrush index yet.' },
        { status: 200, headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300' } }
      )
    }

    // select('*') so the github_pushed_at/github_stars_live columns flow through
    // when present (post-migration) and are simply undefined before it.
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('handle', match.handle)
      .single()

    if (!agent) {
      return Response.json({ input: q, found: false, message: 'Not in the AgentCrush index yet.' }, { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } })
    }

    const { data: snap } = await supabase
      .from('agent_snapshots')
      .select('score, rank, github_stars')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Real liveness ONLY — the agent's actual GitHub activity (repo pushed_at), never
    // the stale last_event_at. Prefer the worker-refreshed stored value (fast, no
    // rate limit); fall back to a best-effort live fetch; else honestly 'unknown'.
    let lastActiveMs = agent.github_pushed_at ? Date.parse(agent.github_pushed_at) : null
    let stars = agent.github_stars_live ?? null
    let source = lastActiveMs ? 'stored' : 'none'
    if (!lastActiveMs && agent.github_url) {
      const gh = await githubLiveness(agent.github_url)
      if (gh.pushed_at) { lastActiveMs = Date.parse(gh.pushed_at); source = 'github' }
      if (gh.stars != null) stars = gh.stars
    }
    const { state, days } = livenessFrom(lastActiveMs) // 'unknown' when no real signal
    stars = stars ?? snap?.github_stars ?? null

    const verified = agent.verified === true
    const claimed = agent.claim_status === 'claimed'
    const ranked = agent.tier === 'evidence_ranked'

    // Calibrated trust: never "AVOID" a live, legit agent just for being unverified.
    let trust
    if (state === 'ghost') trust = 'ghost'
    else if (verified && claimed) trust = 'trusted'
    else if (state === 'dormant') trust = 'caution'
    else trust = 'unverified'

    return Response.json(
      {
        input: q,
        found: true,
        handle: agent.handle,
        display_name: agent.display_name,
        category: agent.primary_category,
        // headline verdicts
        liveness: state, // alive | dormant | ghost | unknown
        trust, // trusted | unverified | caution | ghost
        // receipts
        last_active: lastActiveMs ? new Date(lastActiveMs).toISOString() : null,
        days_since_active: days,
        liveness_source: source, // 'stored' | 'github' | 'none'
        stars,
        rank: snap?.rank ?? null,
        tier: agent.tier,
        score: snap?.score ?? null,
        verified,
        claimed,
        profile_url: `https://agentcrush.xyz/agent/${agent.handle}`,
      },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300' } }
    )
  } catch (e) {
    return Response.json({ error: 'ghost_check_failed', detail: String(e?.message || e) }, { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } })
  }
}
