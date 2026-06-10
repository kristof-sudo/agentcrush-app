/**
 * GET /api/oracle/attest?metric=liveness|tier|ghost_index[&handle=X]
 *
 * Signed attestation over AgentCrush index data — built for machine consumers
 * that need a citable, verifiable statement (prediction-market resolution,
 * counterparty checks, SLA monitors).
 *
 * Payment: $0.25 per attestation via x402 (gated in src/proxy.js), or free
 * with a Pro API key. Strictly a read-out of existing index data.
 *
 * CORS: open.
 */

import { attest, SUPPORTED_METRICS } from '@/lib/oracle'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Payment, X-API-Key',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const metric = searchParams.get('metric')
  const handle = searchParams.get('handle') || undefined

  if (!metric || !SUPPORTED_METRICS.includes(metric)) {
    return Response.json(
      {
        error: `Provide ?metric= one of: ${SUPPORTED_METRICS.join(', ')}`,
        examples: [
          '/api/oracle/attest?metric=ghost_index',
          '/api/oracle/attest?metric=liveness&handle=crewai',
          '/api/oracle/attest?metric=tier&handle=crewai',
        ],
      },
      { status: 400, headers: CORS }
    )
  }

  const result = await attest({ metric, handle })
  if (result.status !== 200) {
    return Response.json({ error: result.error }, { status: result.status, headers: CORS })
  }
  return Response.json(result.body, { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } })
}
