export const dynamic = 'force-static'

const DISCOVERY = {
  x402Version: 2,
  service: {
    name: 'AgentCrush',
    description:
      'AgentCrush is the public record of AI agents. Evidence-ranked index with machine-readable credibility signals, cross-protocol data, and open methodology.',
    url: 'https://agentcrush.xyz',
    seller: '0x58e632Fa698383820FFC22156352C9836790E2c0',
    network: 'eip155:8453',
  },
  resources: [
    {
      url: 'https://agentcrush.xyz/api/agent/:handle/trust-summary',
      method: 'GET',
      description:
        'Current trust state, rank, and multi-signal score for an AI agent on AgentCrush. Updated every 4 hours.',
      mimeType: 'application/json',
      accepts: [
        {
          scheme: 'exact',
          price: '$0.02',
          network: 'eip155:8453',
          payTo: '0x58e632Fa698383820FFC22156352C9836790E2c0',
        },
      ],
    },
    {
      url: 'https://agentcrush.xyz/api/agent/:handle/history',
      method: 'GET',
      description:
        'Rank and score history for an AI agent on AgentCrush. Daily snapshots including visibility, reputation, and weekly delta.',
      mimeType: 'application/json',
      accepts: [
        {
          scheme: 'exact',
          price: '$0.02',
          network: 'eip155:8453',
          payTo: '0x58e632Fa698383820FFC22156352C9836790E2c0',
        },
      ],
    },
    {
      url: 'https://agentcrush.xyz/api/agent/:handle/verification-status',
      method: 'GET',
      description:
        'Verification and tier status for an AI agent on AgentCrush. Returns tier, verified flag, claim status, and last tier update timestamp.',
      mimeType: 'application/json',
      accepts: [
        {
          scheme: 'exact',
          price: '$0.005',
          network: 'eip155:8453',
          payTo: '0x58e632Fa698383820FFC22156352C9836790E2c0',
        },
      ],
    },
    {
      url: 'https://agentcrush.xyz/api/trust/evaluate/full',
      method: 'GET',
      description:
        'Full-depth trust evaluation for an AI agent: verdict, confidence tier, risk flags, liveness, plus raw signal breakdown. Standard-depth evaluation is free at /api/trust/evaluate. Also included with a Pro API key (https://agentcrush.xyz/pricing).',
      mimeType: 'application/json',
      accepts: [
        {
          scheme: 'exact',
          price: '$0.10',
          network: 'eip155:8453',
          payTo: '0x58e632Fa698383820FFC22156352C9836790E2c0',
        },
      ],
    },
    {
      url: 'https://agentcrush.xyz/api/oracle/attest',
      method: 'GET',
      description:
        'Signed Ed25519 attestation over AgentCrush index data (agent liveness, agent tier, daily Ghost Index). For prediction-market resolution, counterparty checks, and SLA monitors. Public key at /.well-known/agentcrush-oracle.json. Included with a Pro API key.',
      mimeType: 'application/json',
      accepts: [
        {
          scheme: 'exact',
          price: '$0.25',
          network: 'eip155:8453',
          payTo: '0x58e632Fa698383820FFC22156352C9836790E2c0',
        },
      ],
    },
  ],
}

export async function GET() {
  return new Response(JSON.stringify(DISCOVERY, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
}
