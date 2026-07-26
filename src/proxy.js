import { paymentProxy, x402ResourceServer } from '@x402/next'
import { HTTPFacilitatorClient } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { facilitator } from '@coinbase/x402'
import { declareDiscoveryExtension } from '@x402/extensions/bazaar'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { extractApiKey, validateApiKey } from './lib/apiKeys'
import { trackHit, trackKeyUsage } from './lib/telemetry'

// ── Mission Control basic auth ────────────────────────────────────────────────
// Migrated from deprecated src/middleware.js — logic unchanged.

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function missionControlGuard(request) {
  const authHeader = request.headers.get('authorization')
  const username = process.env.MISSION_CONTROL_USERNAME
  const password = process.env.MISSION_CONTROL_PASSWORD

  if (authHeader) {
    const base64 = authHeader.split(' ')[1]
    const decoded = Buffer.from(base64 || '', 'base64').toString()
    const idx = decoded.indexOf(':')
    const user = idx === -1 ? decoded : decoded.slice(0, idx)
    const pass = idx === -1 ? '' : decoded.slice(idx + 1)
    if (safeEqual(user, username) && safeEqual(pass, password)) return null // authenticated
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mission Control"' },
  })
}

// Internal/operator API surfaces that must never be reachable without the
// Mission Control credential. The /mission-control PAGE already sits behind
// missionControlGuard; its client-side fetches carry the basic-auth header
// automatically for same-origin requests, so guarding these API paths does not
// break the authenticated UI — it only closes anonymous access.
const GUARDED_API_PREFIXES = [
  '/api/mission-control',
  '/api/claim-requests',
  '/api/admin',
  '/api/build-approvals',
]

function isGuardedApi(pathname) {
  return GUARDED_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

// ── x402 payment proxy ────────────────────────────────────────────────────────
// CDP facilitator reads CDP_API_KEY_ID and CDP_API_KEY_SECRET from env vars.

const cdpClient = new HTTPFacilitatorClient(facilitator)
const resourceServer = new x402ResourceServer(cdpClient)
resourceServer.register('eip155:8453', new ExactEvmScheme())

const PAY_TO = '0x58e632Fa698383820FFC22156352C9836790E2c0'

const x402Handler = paymentProxy(
  {
    '/api/oracle/attest': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.25',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Signed Ed25519 attestation over AgentCrush index data: agent liveness, agent tier, or the daily Ghost Index value. Canonical-JSON statement with timestamp, methodology link, and on-chain proof-of-index reference. Built for prediction-market resolution, counterparty checks, and SLA monitors. Public key at /.well-known/agentcrush-oracle.json.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'oracle', 'attestation', 'resolution', 'trust', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            queryParams: { metric: 'liveness', handle: 'crewai' },
            queryParamsSchema: {
              properties: {
                metric: { type: 'string', description: 'One of: liveness, tier, ghost_index' },
                handle: { type: 'string', description: 'Agent handle (required for liveness/tier)' },
              },
              required: ['metric'],
            },
            output: {
              example: {
                statement: {
                  type: 'agentcrush.attestation.v1',
                  issuer: 'https://agentcrush.xyz',
                  metric: 'liveness',
                  subject: 'crewai',
                  value: { liveness: 'alive', last_activity: '2026-06-09T18:00:00Z', window_days: 30 },
                  observed_at: '2026-06-10T12:00:00Z',
                  valid_for_hours: 24,
                  methodology_url: 'https://agentcrush.xyz/methodology',
                },
                signed: true,
                signature_ed25519_b64: 'q1w2e3…',
                public_key_spki_b64: 'MCowBQYDK2VwAyEA…',
              },
            },
          }).bazaar,
        },
      },
    },

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

    '/api/agents/find/full': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.05',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Agent Discovery: ranked shortlist of AI agents that can do X and are safe to pay. Filters by capability keyword, category, payment rails (x402/MCP/ERC-8004), liveness (30-day Ghost Index rule), and evidence tier. Each candidate includes trust tier, liveness verdict, verified payment rails, scores, and endpoints. Top-3 preview free at /api/agents/find.',
      mimeType: 'application/json',
      extensions: {
        bazaar: {
          discoverable: true,
          category: 'reputation',
          tags: ['ai-agents', 'discovery', 'counterparty', 'trust', 'x402', 'kya'],
          ...declareDiscoveryExtension({
            method: 'GET',
            queryParams: { q: 'wallet risk scoring', rails: 'x402', alive: 'true' },
            queryParamsSchema: {
              properties: {
                q: { type: 'string', description: 'Capability keyword (required), e.g. "trading", "risk scoring", "code review"' },
                category: { type: 'string', description: 'developer | tokenized | service | model_family | mcp_server' },
                rails: { type: 'string', description: 'Payment rail filter, e.g. "x402"' },
                alive: { type: 'string', description: '"true" = only agents alive per the 30-day liveness rule' },
                min_tier: { type: 'string', description: '"evidence_ranked" = exclude indexed-only agents' },
                limit: { type: 'string', description: 'Max candidates, 1-50 (default 25)' },
              },
              required: ['q'],
            },
            output: {
              example: {
                query: 'wallet risk scoring',
                filters: { category: null, rails: 'x402', alive: true, min_tier: null },
                total_matches: 7,
                tier: 'full',
                candidates: [
                  {
                    rank: 1,
                    handle: 'example_agent',
                    name: 'Example Agent',
                    primary_category: 'service',
                    tier: 'evidence_ranked',
                    verified: true,
                    liveness: 'alive',
                    payment_rails: [{ rail: 'x402', status: 'verified', evidence_tier: 'verified_api' }],
                    scores: { visibility: 80, reputation: 62, weekly_delta: 3 },
                    profile_url: 'https://agentcrush.xyz/agent/example_agent',
                    trust_eval_url: 'https://agentcrush.xyz/api/trust/evaluate?handle=example_agent',
                  },
                ],
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

  if (pathname.startsWith('/mission-control') || isGuardedApi(pathname)) {
    const denied = missionControlGuard(request)
    if (denied) return denied
    return NextResponse.next()
  }

  // Pro API keys skip the x402 gate on premium endpoints
  const apiKey = extractApiKey(request)
  if (apiKey) {
    const { valid } = await validateApiKey(apiKey)
    if (valid) {
      trackHit(pathname, request, 'pro_pass')
      trackKeyUsage(apiKey.slice(0, 15), pathname)
      return NextResponse.next()
    }
  }

  const res = await x402Handler(request)
  if (res?.status === 402) {
    trackHit(pathname, request, 'gated_402')
  } else if (request.headers.get('x-payment')) {
    trackHit(pathname, request, 'paid_pass')
  }
  return res
}

export const config = {
  matcher: [
    '/mission-control/:path*',
    '/api/mission-control/:path*',
    '/api/claim-requests/:path*',
    '/api/admin/:path*',
    '/api/build-approvals/:path*',
    '/api/agent/:path*/trust-summary',
    '/api/agent/:path*/history',
    '/api/agent/:path*/verification-status',
    '/api/trust/evaluate/full',
    '/api/oracle/attest',
    '/api/agents/find/full',
  ],
}
