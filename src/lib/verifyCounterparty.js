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

/**
 * Verdicts are tier + liveness — raw scores and identity claims do NOT gate.
 * Rationale (Notes/2026-07-02-verify-verdict-thresholds.md in the brain):
 * 91% of indexed agents score 0 on a 0–9,420 scale, so the old `score < 20
 * → reject` branded the entire awaiting-evidence tier as REJECT. Absence of
 * evidence is caution, never reject; reject is reserved for explicit
 * negative state (archived; future risk flags). Identity verification is an
 * ADVISORY (reason_codes + prose) not a gate: zero agents have claimed
 * profiles today, so gating on it made 'proceed' unreachable for everyone
 * including the #1-ranked alive agent.
 */
export function decide({ tier, alive, walletBinding = null }) {
  if (tier === 'archived') return 'reject'
  if (tier === 'evidence_ranked' && alive) {
    // Guard v1 (SR-H2): a registered on-chain owner that differs from the
    // payment address the agent's own domain advertises is a caution, not a
    // reject — separate treasury addresses are legitimate, but the payer
    // should know before funds move.
    if (walletBinding === 'mismatch') return 'caution'
    return 'proceed'
  }
  return 'caution'
}

// Machine-readable codes so agent callers can branch without parsing prose.
export function reasonCodes({ tier, verified, alive, walletBinding = null }) {
  const codes = []
  if (tier === 'archived') codes.push('archived')
  if (!alive) codes.push('not_alive')
  if (!verified) codes.push('unverified')
  if (tier !== 'evidence_ranked' && tier !== 'archived') codes.push('awaiting_evidence')
  if (walletBinding === 'mismatch') codes.push('wallet_address_mismatch')
  return codes
}

export function decisionReason({ decision, tier, verified, alive, walletBinding = null }) {
  if (decision === 'proceed') {
    if (walletBinding === 'match') {
      return verified
        ? 'Agent is evidence-ranked, currently alive, identity-verified, and its advertised payment address matches its on-chain ERC-8004 registration.'
        : 'Agent is evidence-ranked and currently alive; its advertised payment address matches its on-chain ERC-8004 registration.'
    }
    return verified
      ? 'Agent is evidence-ranked, currently alive, and identity-verified.'
      : 'Agent is evidence-ranked and currently alive. Identity not yet claimed on AgentCrush — for high-value transfers, confirm payment addresses via the agent’s official channels.'
  }
  if (decision === 'reject') {
    return 'Agent tier (archived) indicates it is no longer active or was removed from the public index.'
  }
  const parts = []
  if (walletBinding === 'mismatch') parts.push('advertised payment address differs from the on-chain ERC-8004 registered owner — confirm the payTo address via the agent’s official channels before sending funds')
  if (!alive) parts.push('no public activity signal in 30+ days — verify the endpoint responds before sending funds')
  if (tier !== 'evidence_ranked') parts.push('not yet evidence-ranked (awaiting sufficient verifiable signals)')
  if (!verified) parts.push('identity unverified on AgentCrush')
  return `Proceed with caution: ${parts.join('; ')}.`
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

  // Guard v1 wallet-binding (SR-H2): 'match' | 'mismatch' | null (no data).
  // View is empty until the migration applies / registrations grow — the
  // try/catch keeps every existing caller regression-free either way.
  let walletBinding = null
  try {
    const { data: bindings } = await supabase
      .from('wallet_binding_check_v1')
      .select('binding_status')
      .eq('agent_id', agent.id)
      .neq('binding_status', 'no_endpoint_data')
      .limit(10)
    if (Array.isArray(bindings) && bindings.length > 0) {
      walletBinding = bindings.some((b) => b.binding_status === 'mismatch') ? 'mismatch' : 'match'
    }
  } catch {
    // view missing or unreadable — no binding signal, decision unchanged
  }

  const decision = decide({ tier, verified, alive, walletBinding })

  return {
    handle: agent.handle,
    name: agent.display_name || agent.handle,
    decision,
    reason: decisionReason({ decision, tier, verified, alive, walletBinding }),
    reason_codes: reasonCodes({ tier, verified, alive, walletBinding }),
    wallet_binding: walletBinding,
    trust: { score, tier, verified, rank: ranking?.global_rank ?? null },
    liveness: { alive, last_code_or_event_signal_at: sig[sig.length - 1] || null },
    checked_at: new Date().toISOString(),
    profile_url: `https://agentcrush.xyz/agent/${encodeURIComponent(agent.handle)}`,
    deeper: Object.fromEntries(
      Object.entries(DEPTH_UPSELL).map(([k, v]) => [k, { ...v, url: v.url.replaceAll('{handle}', encodeURIComponent(agent.handle)) }])
    ),
  }
}
