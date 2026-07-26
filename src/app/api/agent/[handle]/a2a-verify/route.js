import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { trackHit } from '@/lib/telemetry'
import { decide, decisionReason, reasonCodes } from '@/lib/verifyCounterparty'
import { CORS_HEADERS, corsPreflight } from '@/lib/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ok(data) {
  return NextResponse.json(data, {
    status: 200,
    headers: { 'Cache-Control': 'no-store', ...CORS_HEADERS },
  })
}

function err(message, status) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return corsPreflight()
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req, context) {
  trackHit('/api/agent/[handle]/a2a-verify', req, 'free_200')
  const { handle } = await context.params
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return err('Missing agent handle.', 400)
  }

  const url = new URL(req.url)
  const buyerHandle  = url.searchParams.get('buyer')  || null
  const buyerWallet  = url.searchParams.get('wallet') || null
  const framework    = url.searchParams.get('framework') || null
  const sessionId    = url.searchParams.get('session') || null
  const paymentTx    = req.headers.get('x-payment-response') || null

  const supabase = getSupabase()
  if (!supabase) return err('Server is missing Supabase configuration.', 500)

  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier, verified, visibility_score, reputation_score, activity_status')
    .ilike('handle', handle.trim())
    .maybeSingle()

  if (agentErr) {
    console.error('[a2a-verify] agent lookup error:', agentErr)
    return err('Database error.', 500)
  }
  if (!agent) return err('Agent not found.', 404)

  const { data: ranking } = await supabase
    .from('rankings')
    .select('global_rank, score_total, computed_at')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const score    = ranking?.score_total ?? (agent.visibility_score ?? 0) + (agent.reputation_score ?? 0)
  const tier     = agent.tier ?? null
  const verified = agent.verified === true
  const alive    = agent.activity_status === 'active'
  // Shared liveness-aware decision core (also powers the verify_counterparty MCP tool)
  const decision = decide({ tier, verified, alive })
  const reason   = decisionReason({ decision, tier, verified, alive })

  // Log interaction — non-fatal if it fails
  try {
    await supabase.from('a2a_interactions').insert({
      seller_handle:   agent.handle,
      buyer_handle:    buyerHandle,
      buyer_wallet:    buyerWallet,
      decision,
      trust_score:     score,
      tier,
      agent_framework: framework,
      payment_tx_hash: paymentTx,
      session_id:      sessionId,
    })
  } catch (logErr) {
    console.error('[a2a-verify] interaction log error:', logErr)
  }

  return ok({
    handle:   agent.handle,
    name:     agent.display_name,
    decision,
    reason,
    reason_codes: reasonCodes({ tier, verified, alive }),
    trust: {
      score,
      tier,
      verified,
      rank: ranking?.global_rank ?? null,
      last_updated: ranking?.computed_at ?? null,
    },
    liveness: { alive },
    queried_at: new Date().toISOString(),
    source: `https://agentcrush.xyz/agent/${agent.handle}`,
  })
}
