/**
 * GET /api/reputation/multiplier/{agentId} — counterparty price multiplier
 *
 * Turns AgentCrush's trust signal into a single actionable number: a suggested
 * multiplier an agent applies when pricing or routing a transaction WITH this
 * counterparty. Reputation is becoming a price modifier in agent marketplaces —
 * this makes that concrete and machine-callable.
 *
 *   multiplier 1.00  → trusted, no risk premium (pay full / route freely)
 *   multiplier 0.50  → high risk, demand a steep discount or don't transact
 *   risk_premium_pct = (1 - multiplier) * 100
 *
 * Derived from the same external market-intelligence trust signal as
 * /api/public/trust (see ietfTrust). ADVISORY — not financial advice, and not
 * the counterparty's own payment-authority score.
 *
 * agentId = AgentCrush handle. FREE, CORS-open. Cache: 5m.
 */

import { trackHit } from '@/lib/telemetry'
import { ietfTrust } from '@/lib/ietfTrust'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Score band → multiplier + recommendation. Ghost/avoid clamps lower.
function multiplierFor(score, verdict, liveness) {
  let m =
    score >= 80 ? 1.0 :
    score >= 60 ? 0.95 :
    score >= 40 ? 0.85 :
    score >= 20 ? 0.7 :
                  0.5
  // Liveness and an explicit avoid verdict are hard risk signals — cap the
  // multiplier so a dormant or flagged counterparty never reads as "safe".
  if (liveness === 'ghost') m = Math.min(m, 0.6)
  if (verdict === 'avoid') m = Math.min(m, 0.5)
  m = Math.round(m * 100) / 100

  const recommendation =
    m >= 0.95 ? 'transact_freely' :
    m >= 0.8 ? 'transact_normally' :
    m >= 0.6 ? 'transact_with_caution' :
               'avoid_or_steep_discount'
  return { multiplier: m, recommendation }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req, { params }) {
  trackHit('/api/reputation/multiplier/:agentId', req, 'free_200')
  const { agentId } = await params
  try {
    const { status, body } = await ietfTrust(agentId)
    if (status !== 200) {
      return Response.json(
        { agentId, error: 'Agent not found in AgentCrush index.', indexed: false },
        { status: 404, headers: { ...CORS, 'Cache-Control': 'no-store' } }
      )
    }
    const score = body.trust?.score ?? 0
    const verdict = body.source?.verdict
    const liveness = body.source?.liveness
    const { multiplier, recommendation } = multiplierFor(score, verdict, liveness)

    return Response.json(
      {
        agentId: body.agentId,
        trust_score: score,
        verdict,
        liveness,
        price_multiplier: multiplier,
        risk_premium_pct: Math.round((1 - multiplier) * 100),
        recommendation,
        basis: 'AgentCrush external market-intelligence trust signal — advisory, not financial advice. ' +
          'Apply price_multiplier to a transaction value when pricing/routing with this counterparty.',
        profile_url: body.source?.profile_url,
        methodology_url: body.source?.methodology_url,
        evaluated_at: new Date().toISOString(),
      },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'public, s-maxage=300' } }
    )
  } catch (e) {
    return Response.json(
      { error: 'multiplier_failed', detail: String(e?.message || e) },
      { status: 500, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  }
}
