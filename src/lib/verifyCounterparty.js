/**
 * verifyCounterparty — the pre-transaction question, answered in one call:
 * "should my agent deal with this counterparty right now?"
 *
 * Liveness-aware by design: an evidence-ranked agent with no activity signal
 * in 30+ days must NOT get a clean `proceed` — liveness is the freshest
 * signal we hold and exactly what a payer needs before funds move. This is
 * the shared decision core for the free MCP tool (verify_counterparty) and
 * /api/agent/{handle}/a2a-verify; full risk decomposition, history, and
 * signed receipts stay on the paid endpoints.
 */

const DEPTH_UPSELL = {
  full_evaluation: { url: 'https://agentcrush.xyz/api/trust/evaluate/full?handle={handle}', price: '$0.10 x402 or Pro key' },
  signed_attestation: { url: 'https://agentcrush.xyz/api/oracle/attest?metric=liveness&handle={handle}', price: '$0.25 x402 or Pro key' },
  history: { url: 'https://agentcrush.xyz/api/agent/{handle}/history', price: '$0.02 x402 or Pro key' },
}

export function decide({ tier, score, verified, alive }) {
  if (tier === 'archived' || score < 20) return 'reject'
  if (!alive) return 'caution'
  if (tier === 'evidence_ranked' && verified && score >= 50) return 'proceed'
  return 'caution'
}

export function decisionReason({ decision, tier, score, verified, alive }) {
  if (decision === 'proceed') {
    return 'Agent is evidence-ranked, verified, currently alive, and has a strong AgentCrush score.'
  }
  if (decision === 'reject') {
    return tier === 'archived'
      ? 'Agent tier (archived) indicates it is no longer active.'
      : 'Agent has an insufficient AgentCrush score for confident A2A transactions.'
  }
  if (!alive) {
    return 'No public activity signal in 30+ days — the agent may be dormant. Verify the endpoint responds before sending funds.'
  }
  return verified
    ? 'Agent is indexed but lacks full evidence-ranking. Proceed with caution.'
    : 'Agent is unverified on AgentCrush. Review manually before high-value transactions.'
}

/**
 * @param {object} supabase — a configured supabase client
 * @param {string} rawHandle
 * @returns verdict object, or { error, status } on lookup failure
 */
export async function verifyCounterparty(supabase, rawHandle) {
  const handle = String(rawHandle || '').trim()
  if (!handle) return { error: 'handle is required', status: 400 }

  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, handle, display_name, tier, verified, visibility_score, reputation_score, activity_status, last_event_at, github_pushed_at')
    .ilike('handle', handle)
    .maybeSingle()
  if (agentErr) return { error: 'Database error.', status: 500 }
  if (!agent) return { error: `Agent "${handle}" not found in the index.`, status: 404 }

  const { data: ranking } = await supabase
    .from('rankings')
    .select('global_rank, score_total, computed_at')
    .eq('agent_id', agent.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const score = ranking?.score_total ?? (agent.visibility_score ?? 0) + (agent.reputation_score ?? 0)
  const tier = agent.tier ?? null
  const verified = agent.verified === true
  const alive = agent.activity_status === 'active'
  const sig = [agent.last_event_at, agent.github_pushed_at].filter(Boolean).sort()

  const decision = decide({ tier, score, verified, alive })

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    decision,
    reason: decisionReason({ decision, tier, score, verified, alive }),
    trust: { score, tier, verified, rank: ranking?.global_rank ?? null },
    liveness: { alive, last_code_or_event_signal_at: sig[sig.length - 1] || null },
    checked_at: new Date().toISOString(),
    profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
    deeper: Object.fromEntries(
      Object.entries(DEPTH_UPSELL).map(([k, v]) => [k, { ...v, url: v.url.replaceAll('{handle}', encodeURIComponent(agent.handle)) }])
    ),
  }
}
