/**
 * GET /api/ghost-check?q=<free-form> — the Ghost Check gotcha.
 *
 * Resolves any free-form input (handle / GitHub / X / website) to an indexed
 * agent and returns a one-glance verdict: ALIVE or GHOST + TRUSTED/CAUTION/AVOID
 * + a few receipts. Reuses evaluateTrust + the typed resolver. FREE, CORS-open.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'
import { resolveAgent } from '@/lib/resolveAgent'
import { evaluateTrust } from '@/lib/trustEval'

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

    const { status, body } = await evaluateTrust({ handle: match.handle, depth: 'standard' })
    if (status !== 200) {
      return Response.json({ input: q, found: false, message: 'Not in the AgentCrush index yet.' }, { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } })
    }

    const daysSince = body.last_activity
      ? Math.floor((Date.now() - new Date(body.last_activity).getTime()) / 86400000)
      : null

    return Response.json(
      {
        input: q,
        found: true,
        matched_on: match.matched_on,
        handle: body.handle,
        display_name: body.display_name,
        // the headline verdicts
        liveness: body.liveness, // 'alive' | 'ghost'
        verdict: body.verdict, // trusted | caution | unverified | avoid
        confidence_tier: body.confidence_tier,
        // receipts
        days_since_active: daysSince,
        last_activity: body.last_activity,
        signals_present: body.signals_present,
        signals_total: body.signals_total,
        payment_rails: body.payment_rails,
        risk_flags: body.risk_flags,
        claim_status: body.claim_status,
        verified: body.verified,
        score: body.score,
        rank: body.rank,
        profile_url: body.profile_url,
        methodology_url: body.methodology_url,
      },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300' } }
    )
  } catch (e) {
    return Response.json({ error: 'ghost_check_failed', detail: String(e?.message || e) }, { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } })
  }
}
