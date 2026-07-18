/**
 * Shared trust-evaluation logic.
 *
 * Used by:
 *   - /api/trust/evaluate        (free, standard depth)
 *   - /api/trust/evaluate/full   (x402-gated $0.10, full depth with raw signals)
 */

import { createClient } from '@supabase/supabase-js'

export const TRUST_EVAL_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Payment, X-API-Key',
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function evaluateTrust({ handle, depth = 'standard' }) {
  const supabase = db()

  const { data: agent, error } = await supabase
    .from('agents')
    .select(`
      id, handle, display_name, bio, primary_category, tier,
      activity_status, last_event_at, claim_status, verified,
      identity_type, payment_rails_supported, website_url, github_url,
      x_handle, created_at, visibility_score, reputation_score, weekly_delta
    `)
    .eq('handle', handle)
    .single()

  if (error || !agent) {
    return {
      status: 404,
      body: { error: `Agent '${handle}' not found in AgentCrush index.`, indexed: false },
    }
  }

  const { data: snap } = await supabase
    .from('agent_snapshots')
    .select('score, rank, github_stars, github_forks, follower_count, snapshot_date')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check for ERC-8004 registration (service-role key required — RLS blocks anon on this table)
  let hasErc8004 = false
  try {
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (svcKey) {
      const svcDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, svcKey)
      const { data: erc8004Row } = await svcDb
        .from('agent_erc8004_registrations')
        .select('agent_id')
        .eq('agent_id', agent.id)
        .limit(1)
        .maybeSingle()
      hasErc8004 = !!erc8004Row
    }
  } catch {
    // table not accessible — treat as no ERC-8004 registration
  }

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

  const riskFlags = []
  if (!isAlive) riskFlags.push({ flag: 'dormancy_risk', detail: 'No activity signal in 30+ days' })
  if (agent.claim_status !== 'claimed') riskFlags.push({ flag: 'unclaimed', detail: 'Agent profile not claimed by owner' })
  if (!agent.verified) riskFlags.push({ flag: 'unverified', detail: 'Identity not independently verified' })
  if (agent.tier === 'indexed' && signalsPresent < 2) riskFlags.push({ flag: 'thin_evidence', detail: 'Fewer than 2 signals present — score may not reflect reality' })
  // ERC-8004 registry counts (e.g. "325K agents registered") are self-reported by protocol
  // operators — AgentCrush has not independently audited the on-chain registry size.
  // The agent's own registration is verified; the ecosystem-wide count claim is not.
  if (hasErc8004) riskFlags.push({ flag: 'erc8004_count_unverified', detail: 'This agent holds an ERC-8004 identity. Note: ERC-8004 registry population counts are self-reported by protocol operators and have not been independently on-chain verified by AgentCrush. See agentcrush.xyz/methodology for scope.' })

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
    created_at:          agent.created_at ?? null,
    evaluated_at:        new Date().toISOString(),
    methodology_version: 'v1.0',
    methodology_url:     'https://agentcrush.xyz/methodology',
    profile_url:         `https://agentcrush.xyz/agent/${handle}`,
  }

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

  return { status: 200, body: result }
}
