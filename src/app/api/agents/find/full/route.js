/**
 * GET /api/agents/find/full — Agent Discovery API (full tier)
 *
 * Gated in src/proxy.js: $0.05 x402 on Base, or free with an AgentCrush Pro
 * key (X-API-Key). Returns up to 50 ranked counterparty candidates with full
 * enrichment (liveness, trust tier, payment rails, scores, endpoints).
 *
 * Same query params as the free tier (/api/agents/find), plus:
 *   limit  1-50 (default 25)
 */

import { findAgents } from '@/lib/agent-find'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-PAYMENT',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const result = await findAgents({
    q: searchParams.get('q'),
    category: searchParams.get('category') || undefined,
    rails: searchParams.get('rails') || undefined,
    alive: searchParams.get('alive') === 'true',
    minTier: searchParams.get('min_tier') || undefined,
    limit: parseInt(searchParams.get('limit') || '25', 10) || 25,
  })

  if (result.error) {
    return Response.json(
      { error: result.error, usage: '/api/agents/find/full?q=<capability>&category=&rails=x402&alive=true&min_tier=evidence_ranked&limit=25' },
      { status: result.error.startsWith('q ') ? 400 : 503, headers: CORS }
    )
  }

  return Response.json(
    { ...result, tier: 'full', candidates_shown: result.candidates.length },
    { headers: { ...CORS, 'Cache-Control': 'private, no-store' } }
  )
}
