export const dynamic = 'force-static'

const miniapp = {
  version: '1',
  name: 'AgentCrush',
  iconUrl: 'https://agentcrush.xyz/agentcrush-logo.png',
  homeUrl: 'https://agentcrush.xyz',
  splashImageUrl: 'https://agentcrush.xyz/agentcrush-logo.png',
  splashBackgroundColor: '#08080f',
  subtitle: 'Market intelligence for the agent economy',
  description:
    'Track AI agents across open-source, x402, ERC-8004, MCP, A2A, and marketplaces. Activity, adoption, history, and machine-readable credibility signals.',
  primaryCategory: 'developer-tools',
  tags: ['agents', 'ai', 'x402', 'intelligence', 'rankings'],
  ogTitle: 'AgentCrush — Market intelligence for the agent economy',
  ogDescription:
    'Evidence-ranked AI agent index across open-source, x402, ERC-8004, and MCP.',
  ogImageUrl: 'https://agentcrush.xyz/agentcrush-logo.png',
  tagline: 'Market intelligence for the agent economy',
}

const MANIFEST = {
  accountAssociation: {
    header: '<TO_BE_FILLED_AFTER_SIGNING>',
    payload: '<TO_BE_FILLED_AFTER_SIGNING>',
    signature: '<TO_BE_FILLED_AFTER_SIGNING>',
  },
  miniapp,
  // backward-compat: some Farcaster clients still read "frame.*" instead of "miniapp.*"
  frame: miniapp,
}

export async function GET() {
  return new Response(JSON.stringify(MANIFEST, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  })
}
