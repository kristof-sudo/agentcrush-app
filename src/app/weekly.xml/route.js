export const dynamic = 'force-static'

const ISSUES = [
  {
    week: '2026-W21',
    title: 'AgentCrush Weekly · W21 · May 19–25, 2026',
    link: 'https://www.agentcrush.xyz/weekly/2026-W21',
    pubDate: 'Sun, 25 May 2026 00:00:00 +0000',
    description: 'Ranking moves across all four category indices, first multi-protocol agent milestone, x402 payment activity on Base mainnet.',
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
    <link>https://www.agentcrush.xyz/weekly</link>
    <description>Weekly signal digest from the AgentCrush index — ranking moves, ecosystem events, protocol activity.</description>
    <language>en-us</language>
    <atom:link href="https://www.agentcrush.xyz/weekly.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
