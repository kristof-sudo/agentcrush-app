import { paymentProxy, x402ResourceServer } from '@x402/next'
import { HTTPFacilitatorClient } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { facilitator } from '@coinbase/x402'
import { declareDiscoveryExtension } from '@x402/extensions/bazaar'
import { NextResponse } from 'next/server'
import { extractApiKey, validateApiKey } from './lib/apiKeys'

// ── Mission Control basic auth ────────────────────────────────────────────────
// Migrated from deprecated src/middleware.js — logic unchanged.

function missionControlGuard(request) {
  const authHeader = request.headers.get('authorization')
  const username = process.env.MISSION_CONTROL_USERNAME
  const password = process.env.MISSION_CONTROL_PASSWORD

  if (authHeader) {
    const base64 = authHeader.split(' ')[1]
    const decoded = Buffer.from(base64, 'base64').toString()
    const [user, pass] = decoded.split(':')
    if (user === username && pass === password) return null // authenticated
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mission Control"' },
  })
}

// ── x402 payment proxy ────────────────────────────────────────────────────────
// CDP facilitator reads CDP_API_KEY_ID and CDP_API_KEY_SECRET from env vars.

const cdpClient = new HTTPFacilitatorClient(facilitator)
const resourceServer = new x402ResourceServer(cdpClient)
resourceServer.register('eip155:8453', new ExactEvmScheme())

const PAY_TO = '0x58e632Fa698383820FFC22156352C9836790E2c0'

const x402Handler = paymentProxy(
  {
    '/api/agent/:handle/trust-summary': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.02',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Current trust state, rank, and multi-signal score for an AI agent on AgentCrush. Updated every 4 hours.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'trust', 'verification', 'analytics', 'identity', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            pathParams: { handle: 'autogpt' },
            pathParamsSchema: {
              properties: { handle: { type: 'string', description: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' } },
              required: ['handle'],
            },
            output: {
              example: {
                handle: 'crewai',
                name: 'CrewAI',
                rank: 1,
                score: { total: 142, visibility: 80, reputation: 62, weekly_delta: 3 },
                archetype: 'orchestration',
                claim_status: 'claimed',
                verified: true,
                tier: 'evidence_ranked',
                erc8004: {
                  registered: true,
                  chain_id: 'eip155:8453',
                  chain_name: 'base',
                  token_id: '42',
                  x402_supported: true,
                  match_confidence: 0.95,
                  source: '8004scan',
                },
                last_updated: '2026-04-26T12:00:00Z',
                source: 'https://agentcrush.xyz/agent/crewai',
              },
            },
          }).bazaar,
        },
      },
    },

    '/api/agent/:handle/history': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.02',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Rank and score history for an AI agent on AgentCrush. Daily snapshots including visibility, reputation, and weekly delta. Coverage varies by agent.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'trust', 'verification', 'analytics', 'identity', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            pathParams: { handle: 'autogpt' },
            pathParamsSchema: {
              properties: { handle: { type: 'string', description: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' } },
              required: ['handle'],
            },
            output: {
              example: {
                handle: 'crewai',
                name: 'CrewAI',
                tier: 'evidence_ranked',
                history: [
                  {
                    date: '2026-04-01',
                    rank: 2,
                    score_total: 138,
                    score_visibility: 78,
                    score_reputation: 60,
                    weekly_delta: 0,
                  },
                ],
                summary: {
                  days_tracked: 30,
                  rank_30d_ago: 2,
                  rank_current: 1,
                  score_30d_ago: 138,
                  score_current: 142,
                  trend: 'rising',
                },
                source: 'https://agentcrush.xyz/agent/crewai',
              },
            },
          }).bazaar,
        },
      },
    },

    '/api/trust/evaluate/full': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.10',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Full-depth trust evaluation for an AI agent on AgentCrush: verdict, confidence tier, risk flags, liveness, plus raw signal breakdown (GitHub stars/forks, follower count, visibility and reputation scores, weekly delta). Standard-depth evaluation is free at /api/trust/evaluate.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'trust', 'verification', 'analytics', 'risk', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            queryParams: { handle: 'autogpt' },
            queryParamsSchema: {
              properties: { handle: { type: 'string', description: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' } },
              required: ['handle'],
            },
            output: {
              example: {
                handle: 'crewai',
                display_name: 'CrewAI',
                indexed: true,
                verdict: 'trusted',
                confidence_tier: 'high',
                liveness: 'alive',
                risk_flags: [],
                claim_status: 'claimed',
                tier: 'evidence_ranked',
                payment_rails: ['x402'],
                score: 142,
                rank: 1,
                raw_signals: {
                  github_stars: 38000,
                  github_forks: 4900,
                  follower_count: 12000,
                  visibility_score: 80,
                  reputation_score: 62,
                  weekly_delta: 3,
                  last_snapshot: '2026-06-09',
                },
                methodology_url: 'https://agentcrush.xyz/methodology',
              },
            },
          }).bazaar,
        },
      },
    },

    '/api/agent/:handle/verification-status': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.005',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Verification and tier status for an AI agent on AgentCrush. Returns tier, verified flag, claim status, and last tier update timestamp.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'trust', 'verification', 'identity', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            pathParams: { handle: 'autogpt' },
            pathParamsSchema: {
              properties: { handle: { type: 'string', description: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' } },
              required: ['handle'],
            },
            output: {
              example: {
                handle: 'crewai',
                name: 'CrewAI',
                tier: 'evidence_ranked',
                verified: true,
                claim_status: 'claimed',
                erc8004_registered: true,
                last_updated: '2026-04-01T00:00:00Z',
                source: 'agentcrush',
              },
            },
          }).bazaar,
        },
      },
    },
  },
  resourceServer,
)

// ── Combined proxy ────────────────────────────────────────────────────────────

export async function proxy(request) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/mission-control')) {
    const denied = missionControlGuard(request)
    if (denied) return denied
    return NextResponse.next()
  }

  // Pro API keys skip the x402 gate on premium endpoints
  const apiKey = extractApiKey(request)
  if (apiKey) {
    const { valid } = await validateApiKey(apiKey)
    if (valid) return NextResponse.next()
  }

  return x402Handler(request)
}

export const config = {
  matcher: [
    '/mission-control/:path*',
    '/api/agent/:path*/trust-summary',
    '/api/agent/:path*/history',
    '/api/agent/:path*/verification-status',
    '/api/trust/evaluate/full',
  ],
}
