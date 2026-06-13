/**
 * GET/POST /api/trust/evaluate
 *
 * Free trust evaluation for AI agents. An agent checks this endpoint
 * before hiring a sub-agent, routing funds, or integrating a new service.
 *
 * Returns: verdict, confidence tier, risk flags, liveness, claim status,
 * payment rails, last verified timestamp.
 *
 * Full-depth evaluation (raw signal breakdown) is a paid endpoint:
 *   GET /api/trust/evaluate/full?handle=X — $0.10 via x402, or free with a Pro API key.
 *
 * CORS: open — any agent can call this.
 */

import { evaluateTrust, TRUST_EVAL_CORS as CORS } from '@/lib/trustEval'

export const runtime = 'nodejs'

const FULL_DEPTH_POINTER = {
  endpoint: 'https://agentcrush.xyz/api/trust/evaluate/full',
  price: '$0.10 via x402 (eip155:8453), or included with a Pro API key',
  adds: 'raw_signals: github_stars, github_forks, follower_count, visibility_score, reputation_score, weekly_delta, last_snapshot',
  pricing_url: 'https://agentcrush.xyz/pricing',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  trackHit('/api/trust/evaluate', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  if (!handle) {
    return Response.json({ error: 'Provide ?handle=agenthandle or POST {handle}' }, { status: 400, headers: CORS })
  }
  return respond(handle, searchParams.get('depth'))
}

export async function POST(req) {
  let body
  try { body = await req.json() } catch { body = {} }
  const handle = body?.handle || body?.agent_handle
  if (!handle) {
    return Response.json({ error: 'Request body must include {handle}' }, { status: 400, headers: CORS })
  }
  return respond(handle, body?.depth)
}

async function respond(handle, depth) {
  try {
    const { status, body } = await evaluateTrust({ handle, depth: 'standard' })
    if (status === 200 && depth === 'full') {
      body.full_depth = FULL_DEPTH_POINTER
    }
    return Response.json(body, {
      status,
      headers: { ...CORS, 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    // Never return an empty 500: surface a structured error so callers (and we)
    // can see what failed instead of an opaque crash.
    return Response.json(
      { error: 'trust_eval_failed', detail: String(e?.message || e) },
      { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  }
}
