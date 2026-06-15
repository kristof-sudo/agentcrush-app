/**
 * GET /api/x402/demand/v1 — x402 demand leaderboard
 *
 * The demand-side map of the agent economy: operators already taking x402
 * payments, ranked by unique paying wallets (live from Coinbase CDP Bazaar).
 * This is intelligence nobody else publishes — who actually spends and earns
 * money via x402 — and the qualified-counterparty list for any agent with a
 * wallet.
 *
 * Query params:
 *   ?days=14   — activity window (default 14, max 30)
 *   ?top=25    — number of operators (default 25, max 100)
 *
 * x402 pricing: FREE — open to maximize citation (same policy as Ghost Index/PCS).
 * Cache: 1h (ISR) — one cold compute per hour, served from edge otherwise.
 */

import { trackHit } from '@/lib/telemetry'
import { demandLeaderboard } from '@/lib/x402demand'

export const runtime = 'nodejs'
export const revalidate = 3600
export const maxDuration = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET(req) {
  trackHit('/api/x402/demand/v1', req, 'free_200')
  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '14', 10) || 14, 1), 30)
  const top = Math.min(Math.max(parseInt(searchParams.get('top') || '25', 10) || 25, 1), 100)
  const chain = searchParams.get('chain') || null // e.g. ?chain=Solana — filter operators to that chain

  try {
    const data = await demandLeaderboard({ days, top, chain })
    return Response.json(
      {
        ...data,
        generated_at: new Date().toISOString(),
        methodology_url: 'https://agentcrush.xyz/methodology',
        note: 'unique_payers is the peak unique-wallet count across an operator\'s endpoints (wallets recur, so payers are not summed). Source: Coinbase CDP Bazaar quality metrics.',
      },
      { status: 200, headers: { ...CORS, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (e) {
    return Response.json(
      { error: 'demand_unavailable', detail: String(e?.message || e) },
      { status: 503, headers: { ...CORS, 'Cache-Control': 'no-store' } }
    )
  }
}
