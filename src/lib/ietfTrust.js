/**
 * ietfTrust.js — map AgentCrush's trust evaluation into the response shape of
 * draft-sharif-agent-payment-trust-00 (IETF "Trust Scoring and Identity
 * Verification for Autonomous AI Agent Payment Transactions").
 *
 * WHY: an emerging standard defines a public trust query API
 * (GET /api/public/trust/{agentId}) that third-party platforms expose. Being
 * schema-compatible makes AgentCrush a drop-in external trust signal for any
 * tool built against the draft.
 *
 * HONESTY (non-negotiable): AgentCrush is NOT the agent's registering Trust
 * Authority and does not hold its payment/execution history. So:
 *   - `signal_type` is "external_market_intelligence" and `authoritative` is false.
 *   - the Execution Success Rate dimension is marked "unavailable" (only the
 *     agent's own Trust Authority sees it).
 *   - `spendLimits` echoes the draft's REFERENCE tier for the score band as a
 *     convenience for compatibility — it is advisory, NOT an authorization.
 * The numeric score is AgentCrush's own market-intelligence signal, derived
 * transparently from indexed signals, not the draft's five-dimension payment score.
 */

import { evaluateTrust } from '@/lib/trustEval'

// draft-sharif-agent-payment-trust-00 §spend-limit tiers (reference only).
const SPEND_TIERS = [
  { level: 0, band: [0, 19], perTransaction: 0, daily: 0 },
  { level: 1, band: [20, 39], perTransaction: 10, daily: 50 },
  { level: 2, band: [40, 59], perTransaction: 100, daily: 500 },
  { level: 3, band: [60, 79], perTransaction: 1000, daily: 5000 },
  { level: 4, band: [80, 100], perTransaction: 50000, daily: 200000 },
]

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

function tierFor(score) {
  return SPEND_TIERS.find((t) => score >= t.band[0] && score <= t.band[1]) || SPEND_TIERS[0]
}

/**
 * Derive a transparent 0–100 external trust signal from our indexed signals.
 * Reproducible: signal coverage + liveness + verification/claim, minus risk.
 */
function deriveScore(r) {
  let s = Math.round((r.signals_present / r.signals_total) * 60) // up to 60 from coverage
  if (r.liveness === 'alive') s += 20
  if (r.verified) s += 10
  if (r.claim_status === 'claimed') s += 10
  s -= (r.risk_flags?.length || 0) * 5
  return clamp(s, 0, 100)
}

// Our verdict is the authoritative recommendation; score is the numeric companion.
function recommendationFor(verdict, liveness) {
  if (verdict === 'avoid') return 'DENY'
  if (verdict === 'trusted' && liveness === 'alive') return 'ALLOW'
  return 'ALLOW_WITH_LIMITS'
}

const DISCLAIMER =
  'AgentCrush is an independent index, not the agent\'s registering Trust Authority. ' +
  'This is an external market-intelligence trust signal — advisory only. spendLimits are ' +
  'reference tiers from draft-sharif-agent-payment-trust-00 for the score band, not ' +
  'authorizations. Execution-success / payment-history dimensions are not observable to a ' +
  'third party and are reported as unavailable.'

/**
 * @returns {Promise<{status:number, body:object}>} IETF-shaped trust record.
 */
export async function ietfTrust(handle) {
  const clean = String(handle || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  if (!clean) return { status: 400, body: { error: 'invalid agentId' } }

  const { status, body } = await evaluateTrust({ handle: clean, depth: 'standard' })
  if (status !== 200) {
    return { status: 404, body: { agentId: clean, status: 'UNKNOWN', indexed: false, error: 'Agent not found in AgentCrush index.' } }
  }

  const score = deriveScore(body)
  const tier = tierFor(score)
  const operationalDays = body.created_at
    ? Math.max(0, Math.round((Date.now() - new Date(body.created_at).getTime()) / 86400000))
    : null

  return {
    status: 200,
    body: {
      agentId: body.handle,
      status: 'ACTIVE', // indexed & resolvable; liveness is surfaced in source.liveness
      trust: { score, level: tier.level },
      recommendation: recommendationFor(body.verdict, body.liveness),
      spendLimits: { perTransaction: tier.perTransaction, daily: tier.daily, currency: 'USD', authoritative: false },
      history: {
        operationalDays,
        successRate: null, // unavailable to a third-party observer
        transactionCount: null,
      },
      // ── AgentCrush honesty + provenance extensions ──
      signal_type: 'external_market_intelligence',
      authoritative: false,
      spec: 'draft-sharif-agent-payment-trust-00 (schema-compatible)',
      dimension_coverage: {
        code_attestation: body.verified ? 'partial' : 'thin',
        execution_success_rate: 'unavailable',
        behavioural_consistency: 'partial',
        operational_tenure: operationalDays != null ? 'full' : 'thin',
        anomaly_history: body.risk_flags?.length != null ? 'partial' : 'thin',
      },
      source: {
        verdict: body.verdict,
        confidence_tier: body.confidence_tier,
        liveness: body.liveness,
        risk_flags: body.risk_flags,
        tier: body.tier,
        profile_url: body.profile_url,
        methodology_url: body.methodology_url,
      },
      disclaimer: DISCLAIMER,
      evaluated_at: new Date().toISOString(),
    },
  }
}
