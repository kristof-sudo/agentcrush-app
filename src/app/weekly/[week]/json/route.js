export const dynamic = 'force-static'

const ISSUES = {
  '2026-W21': {
    week: '2026-W21',
    period: 'May 19–25, 2026',
    published: '2026-05-25T00:00:00.000Z',
    url: 'https://www.agentcrush.xyz/weekly/2026-W21',
    summary: 'Ranking moves across all four category indices, first multi-protocol agent milestone, x402 payment activity on Base mainnet.',
    stats: {
      agents_tracked: 1400,
      evidence_ranked: 138,
      snapshots: 7,
      ranking_moves: 40,
    },
    highlights: [
      'CrewAI remains the only cross-protocol agent (ERC-8004 + x402).',
      'First measurable x402 machine-caller activity on trust-summary endpoint.',
      'Qwen derivative count crossed 1,000 downstream fine-tunes.',
    ],
    categories: [
      { id: 'developer', note: 'Top 10 stable. Mid-table churn in positions 20–40.' },
      { id: 'model_family', note: 'Deployment signal variance drove 3 position swaps in the top 5.' },
      { id: 'tokenized', note: 'Liquidity-driven week. TVL signal moved two agents into evidence-ranked.' },
      { id: 'service', note: 'A2A source refresh. 4 new agents entered the tracked set.' },
    ],
  },
}

export async function GET(req, { params }) {
  const { week } = await params
  const issue = ISSUES[week]

  if (!issue) {
    return Response.json({ error: 'Week not found', available: Object.keys(ISSUES) }, { status: 404 })
  }

  return Response.json(issue, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
