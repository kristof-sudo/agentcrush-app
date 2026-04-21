import { paymentProxy, x402ResourceServer } from '@x402/next'
import { HTTPFacilitatorClient } from '@x402/core/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { facilitator } from '@coinbase/x402'
import { declareDiscoveryExtension } from '@x402/extensions/bazaar'
import { NextResponse } from 'next/server'

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
        ...declareDiscoveryExtension({
          method: 'GET',
          pathParams: { handle: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' },
        }),
      },
    },

    '/api/agent/:handle/history': {
      accepts: [
        {
          scheme: 'exact',
          price: '$0.10',
          network: 'eip155:8453',
          payTo: PAY_TO,
        },
      ],
      description:
        'Rank and score history over the last 30 days for an AI agent on AgentCrush. Daily snapshots covering visibility, reputation, and weekly delta.',
      mimeType: 'application/json',
      extensions: {
        ...declareDiscoveryExtension({
          method: 'GET',
          pathParams: { handle: 'Agent handle slug (e.g. "autogpt", "devin", "cursor")' },
        }),
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

  return x402Handler(request)
}

export const config = {
  matcher: [
    '/mission-control/:path*',
    '/api/agent/:path*/trust-summary',
    '/api/agent/:path*/history',
  ],
}
