/**
 * GET /api/public/trust/{agentId} — public trust query (IETF-compatible)
 *
 * Schema-compatible with draft-sharif-agent-payment-trust-00's public trust
 * query API, so tools built against the emerging standard can query AgentCrush
 * drop-in. Returns AgentCrush's EXTERNAL market-intelligence trust signal —
 * advisory, not a Trust-Authority authorization (see `disclaimer`).
 *
 * agentId = AgentCrush handle.
 * x402 pricing: FREE — open to maximize citation (same policy as trust/evaluate).
 * Cache: 5m.
 */

import { trackHit } from '@/lib/telemetry'
import { ietfTrust } from '@/lib/ietfTrust'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req, { params }) {
  trackHit('/api/public/trust/:agentId', req, 'free_200')
  const { agentId } = await params
  try {
    const { status, body } = await ietfTrust(agentId)
    return Response.json(body, {
      status,
      headers: { ...CORS, 'Cache-Control': status === 200 ? 'public, s-maxage=300' : 'no-store' },
    })
  } catch (e) {
    return Response.json(
      { error: 'trust_query_failed', detail: String(e?.message || e) },
      { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  }
}
