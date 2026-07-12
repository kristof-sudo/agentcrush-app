export const dynamic = 'force-static'

const ISSUES = [
  {
    week: '2026-W28',
    title: 'AgentCrush Weekly · W28 · July 6–12, 2026',
    link: 'https://agentcrush.xyz/weekly/2026-W28',
    pubDate: 'Sun, 12 Jul 2026 00:00:00 +0000',
    description: 'Identity is table stakes; the contested layer is proof. The agent economy spent the week building it — reputation leaderboards, execution receipts, on-chain tool registries, A2A spec-hardening — while we published how to read a trust number honestly, hardened Virtuals coverage to 57,606 agents, and corrected our evidence-ranked count to 145.',
  },
  {
    week: '2026-W27',
    title: 'AgentCrush Weekly · W27 · June 29 – July 5, 2026',
    link: 'https://agentcrush.xyz/weekly/2026-W27',
    pubDate: 'Sun, 05 Jul 2026 00:00:00 +0000',
    description: 'The ecosystem asked what happens when agents disagree; we shipped the evidence layer — one-click verification against Base, per-agent proofs, full history on every profile, the Ghost Report, and dead-agent alerts.',
  },
  {
    week: '2026-W22',
    title: 'AgentCrush Weekly · W22 · May 25–31, 2026',
    link: 'https://agentcrush.xyz/weekly/2026-W22',
    pubDate: 'Sun, 31 May 2026 00:00:00 +0000',
    description: 'Confidence tiers extended to every category, risk-flag infrastructure ships, and the Agent Payments Stack gets its full LLM Gateway treatment.',
  },
  {
    week: '2026-W21',
    title: 'AgentCrush Weekly · W21 · May 19–25, 2026',
    link: 'https://agentcrush.xyz/weekly/2026-W21',
    pubDate: 'Sun, 25 May 2026 00:00:00 +0000',
    description: 'Ranking moves across all four category rankings, first multi-protocol agent milestone, x402 payment activity on Base mainnet.',
  },
]

export async function GET() {
  const items = ISSUES.map(
    (i) => `
    <item>
      <title>${i.title}</title>
      <link>${i.link}</link>
      <guid isPermaLink="true">${i.link}</guid>
      <pubDate>${i.pubDate}</pubDate>
      <description><![CDATA[${i.description}]]></description>
    </item>`
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AgentCrush Weekly</title>
    <link>https://agentcrush.xyz/weekly</link>
    <description>Weekly signal digest from the AgentCrush index — ranking moves, ecosystem events, protocol activity.</description>
    <language>en-us</language>
    <atom:link href="https://agentcrush.xyz/weekly.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
