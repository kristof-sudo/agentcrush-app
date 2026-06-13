/**
 * POST /api/public/trust/batch — batch public trust query (IETF-compatible)
 *
 * Body: { "agentIds": ["handle_a", "handle_b", ...] }  (max 50)
 * Mirrors draft-sharif-agent-payment-trust-00's batch endpoint. Returns the
 * same external market-intelligence trust records as the single endpoint.
 *
 * FREE. No cache (POST).
 */

import { trackHit } from '@/lib/telemetry'
import { ietfTrust } from '@/lib/ietfTrust'

export const runtime = 'nodejs'

const MAX_BATCH = 50

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req) {
  trackHit('/api/public/trust/batch', req, 'free_200')
  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Body must be JSON: { agentIds: [...] }' }, { status: 400, headers: CORS })
  }

  const ids = Array.isArray(body?.agentIds) ? body.agentIds : null
  if (!ids || ids.length === 0) {
    return Response.json({ error: 'Provide { agentIds: ["handle", ...] }' }, { status: 400, headers: CORS })
  }
  if (ids.length > MAX_BATCH) {
    return Response.json({ error: `Max ${MAX_BATCH} agentIds per batch` }, { status: 400, headers: CORS })
  }

  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        const { body: rec } = await ietfTrust(id)
        return rec
      })
    )
    return Response.json(
      { count: results.length, spec: 'draft-sharif-agent-payment-trust-00 (schema-compatible)', results },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return Response.json(
      { error: 'trust_batch_failed', detail: String(e?.message || e) },
      { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  }
}
