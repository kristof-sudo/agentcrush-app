/**
 * POST /api/trust/evaluate
 *
 * Premium trust evaluation for AI agents. An agent checks this endpoint
 * before hiring a sub-agent, routing funds, or integrating a new service.
 *
 * Returns: confidence tier, risk flags, evidence count, liveness, claim status,
 * payment rails, last verified timestamp.
 *
 * Pricing (x402):
 *   - Single evaluation: $0.50
 *   - With ?depth=full: $1.00 (adds raw signal breakdown)
 *
 * For now: free during bootstrap phase, x402 gate added once first customers use it.
 * The endpoint structure is already x402-compatible (returns 402 with Payment-Required
 * header when X402_ENABLED=true in env).
 *
 * CORS: open — any agent can call this.
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Payment',
}

// x402 pricing stub — flipped to enforce once live
const X402_ENABLED = process.env.X402_TRUST_EVAL_ENABLED === 'true'
const PRICE_USD    = 0.50
const PRICE_FULL   = 1.00

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
  // Support GET with ?handle=X for easy testing
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')
  if (!handle) {
    return Response.json({ error: 'Provide ?handle=agenthandle or POST {handle}' }, { status: 400, headers: CORS })
  }
  return evaluate({ handle, depth: searchParams.get('depth') || 'standard' })
}

export async function POST(req) {
  let body
  try { body = await req.json() } catch { body = {} }
  const handle = body?.handle || body?.agent_handle
  if (!handle) {
    return Response.json({ error: 'Request body must include {handle}' }, { status: 400, headers: CORS })
  }

  // x402 gate — returns 402 when enabled
  if (X402_ENABLED) {
    const payment = req.headers.get('X-Payment') || req.headers.get('x-payment')
    if (!payment) {
      const depth = body?.depth || 'standard'
      const price = depth === 'full' ? PRICE_FULL : PRICE_USD
      return new Response(
        JSON.stringify({
          error: 'Payment required',
          price_usd: price,
          accepts: ['x402', 'stripe'],
          payment_endpoint: 'https://agentcrush.xyz/api/pay/trust-evaluate',
        }),
        {
          status: 402,
          headers: {
            ...CORS,
            'Content-Type': 'application/json',
            'X-Payment-Required': `price_usd=${price}`,
          },
        }
      )
    }
  }

  return evaluate({ handle, depth: body?.depth || 'standard' })
}

async function evaluate({ handle, depth }) {
  const supabase = db()

  // Fetch agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select(`
      handle, display_name, bio, primary_category, tier,
      activity_status, last_event_at, claim_status, verified,
      identity_type, payment_rails_supported, website_url, github_url,
      x_handle, created_at, visibility_score, reputation_score, weekly_delta
    `)
    .eq('handle', handle)
    .single()

  if (error || !agent) {
    return Response.json(
      { error: `Agent '${handle}' not found in AgentCrush index.`, indexed: false },
      { status: 404, headers: CORS }
    )
  }

  // Latest snapshot for score + github signals
  const { data: snap } = await supabase
    .from('agent_snapshots')
    .select('score, rank, github_stars, github_forks, follower_count, snapshot_date')
    .eq('agent_id', supabase.from('agents').select('id').eq('handle', handle))
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Liveness
  const isAlive = agent.activity_status === 'active' ||
    (agent.last_event_at && new Date(agent.last_event_at) > new Date(Date.now() - 30 * 86400000))

  // Confidence tier (mirrors scoring view logic)
  const signalsPresent = [
    snap?.github_stars > 0,
    snap?.follower_count > 0,
    agent.claim_status === 'claimed',
    agent.payment_rails_supported?.length > 0,
    agent.verified === true,
    agent.last_event_at !== null,
  ].filter(Boolean).length
  const signalsTotal = 6

  const confidenceTier =
    signalsPresent / signalsTotal >= 0.95 ? 'high'        :
    signalsPresent / signalsTotal >= 0.75 ? 'medium'      :
    signalsPresent / signalsTotal >= 0.55 ? 'low'         :
                                            'provisional'

  // Risk flags
  const riskFlags = []
  if (!isAlive) riskFlags.push({ flag: 'dormancy_risk', detail: 'No activity signal in 30+ days' })
  if (agent.claim_status !== 'claimed') riskFlags.push({ flag: 'unclaimed', detail: 'Agent profile not claimed by owner' })
  if (!agent.verified) riskFlags.push({ flag: 'unverified', detail: 'Identity not independently verified' })
  if (agent.tier === 'indexed' && signalsPresent < 2) riskFlags.push({ flag: 'thin_evidence', detail: 'Fewer than 2 signals present — score may not reflect reality' })

  const verdict =
    riskFlags.length === 0 && confidenceTier === 'high'   ? 'trusted'     :
    riskFlags.length <= 1  && confidenceTier !== 'provisional' ? 'caution' :
    riskFlags.length >= 3  ? 'avoid'                          :
                              'unverified'

  const result = {
    handle:              agent.handle,
    display_name:        agent.display_name,
    indexed:             true,
    verdict,
    confidence_tier:     confidenceTier,
    liveness:            isAlive ? 'alive' : 'ghost',
    last_activity:       agent.last_event_at ?? null,
    risk_flags:          riskFlags,
    claim_status:        agent.claim_status,
    verified:            agent.verified ?? false,
    tier:                agent.tier,
    category:            agent.primary_category,
    payment_rails:       agent.payment_rails_supported ?? [],
    signals_present:     signalsPresent,
    signals_total:       signalsTotal,
    score:               snap?.score ?? null,
    rank:                snap?.rank ?? null,
    evaluated_at:        new Date().toISOString(),
    methodology_version: 'v1.0',
    methodology_url:     'https://agentcrush.xyz/methodology',
    profile_url:         `https://agentcrush.xyz/agent/${handle}`,
  }

  // Full depth adds raw signals
  if (depth === 'full') {
    result.raw_signals = {
      github_stars:    snap?.github_stars ?? 0,
      github_forks:    snap?.github_forks ?? 0,
      follower_count:  snap?.follower_count ?? 0,
      visibility_score: agent.visibility_score,
      reputation_score: agent.reputation_score,
      weekly_delta:    agent.weekly_delta,
      last_snapshot:   snap?.snapshot_date ?? null,
    }
  }

  return Response.json(result, {
    status: 200,
    headers: { ...CORS, 'Cache-Control': 'no-store' },
  })
}
