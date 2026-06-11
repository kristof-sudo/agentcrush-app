/**
 * GET /api/pcs/v1 — Protocol Compatibility Score
 *
 * PCS = 0-4: how many of the four live protocol rails (ERC-8004, x402, A2A,
 * MCP) an agent verifiably supports. The interoperability answer nobody else
 * publishes as structured data.
 *
 * Query params:
 *   ?handle=X   — one agent's PCS + rail breakdown
 *   (none)      — ecosystem distribution + the most-interoperable leaderboard
 *
 * x402 pricing: FREE — open to maximize citation (same policy as Ghost Index).
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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  trackHit('/api/pcs/v1', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  const supabase = db()

  try {
    if (handle) {
      const { data, error } = await supabase
        .from('agent_protocol_compatibility_v1')
        .select('handle, display_name, primary_category, tier, erc8004, x402, a2a, mcp, pcs')
        .ilike('handle', handle.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64))
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
          rails_legend: { erc8004: 'on-chain identity (confidence-gated)', x402: 'machine payments', a2a: 'agent card / task delegation', mcp: 'tool exposure' },
          methodology_url: 'https://agentcrush.xyz/methodology',
        },
        { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
      )
    }

    // Distribution + leaderboard
    const { data, error } = await supabase
      .from('agent_protocol_compatibility_v1')
      .select('handle, display_name, primary_category, tier, erc8004, x402, a2a, mcp, pcs')
      .gt('pcs', 0)
      .order('pcs', { ascending: false })
      .limit(1000)
    if (error) throw error

    const { count: total } = await supabase
      .from('agent_protocol_compatibility_v1')
      .select('handle', { count: 'exact', head: true })

    const rows = data || []
    const dist = { 0: (total ?? 0) - rows.length, 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const r of rows) dist[r.pcs] = (dist[r.pcs] || 0) + 1
    const pct3plus = total ? Math.round(((dist[3] + dist[4]) / total) * 1000) / 10 : null

    return Response.json(
      {
        as_of: new Date().toISOString(),
        total_agents: total ?? null,
        distribution: dist,
        pct_pcs_3_plus: pct3plus,
        finding: pct3plus != null ? `${pct3plus}% of indexed agents support 3+ of the 4 live protocol rails (ERC-8004, x402, A2A, MCP).` : null,
        most_interoperable: rows.slice(0, 25).map((r) => ({
          ...r,
          profile_url: `https://agentcrush.xyz/agent/${r.handle}`,
        })),
        rails_legend: { erc8004: 'on-chain identity (confidence-gated)', x402: 'machine payments', a2a: 'agent card / task delegation', mcp: 'tool exposure' },
        methodology_url: 'https://agentcrush.xyz/methodology',
      },
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    )
  } catch (e) {
    return Response.json({ error: 'pcs_unavailable', detail: e.message }, { status: 503, headers: CORS })
  }
}
