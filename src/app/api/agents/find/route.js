/**
 * GET /api/agents/find — Agent Discovery API (free tier)
 *
 * THE counterparty question: "which agents can I safely pay to do X?"
 * Returns the top 3 ranked candidates with liveness, trust tier, payment
 * rails, and endpoints, plus the total match count.
 *
 * Full ranked list (up to 50): /api/agents/find/full — $0.05 x402 on Base,
 * or free with an AgentCrush Pro key (X-API-Key).
 *
 * Query params:
 *   q         capability keyword (required) — e.g. "trading", "code review", "risk"
 *   category  developer | tokenized | service | model_family | mcp_server
 *   rails     payment rail filter, e.g. x402
 *   alive     true → only agents alive per the 30-day Ghost Index rule
 *   min_tier  evidence_ranked → exclude indexed-only agents
 */

import { findAgents } from '@/lib/agent-find'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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
    limit: 3,
  })

  if (result.error) {
    return Response.json(
      { error: result.error, usage: '/api/agents/find?q=<capability>&category=&rails=x402&alive=true&min_tier=evidence_ranked' },
      { status: result.error.startsWith('q ') ? 400 : 503, headers: CORS }
    )
  }

  return Response.json(
    {
      ...result,
      tier: 'free',
      candidates_shown: result.candidates.length,
      full_results:
        result.total_matches > result.candidates.length
          ? {
              url: 'https://agentcrush.xyz/api/agents/find/full?' + searchParams.toString(),
              price: '$0.05 via x402 (Base USDC), or free with an AgentCrush Pro key (X-API-Key header)',
              returns: `up to 50 ranked candidates of ${result.total_matches} total matches`,
              pro: 'https://agentcrush.xyz/pricing',
            }
          : null,
    },
    { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
  )
}
