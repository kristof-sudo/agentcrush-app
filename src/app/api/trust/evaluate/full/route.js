/**
 * GET /api/trust/evaluate/full?handle=X
 *
 * Full-depth trust evaluation — everything the free endpoint returns, plus
 * raw_signals (github stars/forks, follower count, visibility/reputation
 * scores, weekly delta, last snapshot date).
 *
 * Payment: $0.10 per call via x402 (gated in src/proxy.js), or free with a
 * Pro API key (X-API-Key header — validated in the proxy, which skips the
 * x402 gate for active keys).
 *
 * CORS: open — any agent can call this.
 */

import { evaluateTrust, TRUST_EVAL_CORS as CORS } from '@/lib/trustEval'

export const runtime = 'nodejs'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  if (!handle) {
    return Response.json({ error: 'Provide ?handle=agenthandle' }, { status: 400, headers: CORS })
  }
  const { status, body } = await evaluateTrust({ handle, depth: 'full' })
  return Response.json(body, {
    status,
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  })
}
