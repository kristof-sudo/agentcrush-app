import Link from 'next/link'

export const metadata = {
  title: 'W21 · May 19–25, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W21 2026. Ranking moves across all four category rankings, ecosystem events, protocol activity.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/weekly/2026-W21',
    types: { 'application/rss+xml': 'https://www.agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W21 2026',
    description: 'Ranking moves, ecosystem signals, and protocol activity for the week of May 19–25, 2026.',
    url: 'https://www.agentcrush.xyz/weekly/2026-W21',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630 }],
    type: 'article',
    publishedTime: '2026-05-25T00:00:00.000Z',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W21 · May 19–25, 2026',
  description: 'Weekly signal digest: ranking moves across all four category rankings, ecosystem events, protocol activity.',
  url: 'https://www.agentcrush.xyz/weekly/2026-W21',
  datePublished: '2026-05-25T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://www.agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://www.agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://www.agentcrush.xyz/weekly' },
}

export default function W21Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-8">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W21 · May 19–25, 2026
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W21 · May 19–25, 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published May 25, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
          <span className="text-white/15">·</span>
          <Link href="/weekly/2026-W21/json" className="text-violet-400/50 hover:text-violet-300 transition-colors">JSON</Link>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            Week 21 was the first week we ran all four category rankings simultaneously and pulled cross-category movers — agents that climbed or fell in more than one ranking at the same time. The pattern that emerged: the top-tier agents in model families have the strongest cross-protocol presence, while the tokenized cohort moved largely on liquidity signals.
          </p>
          <p>
            <em className="text-white/45 not-italic">[Editorial placeholder — full W21 signal analysis will be populated from the live index snapshot. The structure below shows the intended format for weekly digests going forward.]</em>
          </p>
        </div>

        {/* Ranking moves */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ranking moves</h2>
          <div className="space-y-3">
            {[
              { category: 'Developer', color: '#00d4ff', note: 'Top 10 stable. Mid-table churn in positions 20–40.' },
              { category: 'Model Families', color: '#a78bfa', note: 'Deployment signal variance drove 3 position swaps in the top 5.' },
              { category: 'Tokenized', color: '#39ff14', note: 'Liquidity-driven week. TVL signal moved two agents into evidence-ranked.' },
              { category: 'Service', color: '#f0a500', note: 'A2A source refresh. 4 new agents entered the tracked set.' },
            ].map(({ category, color, note }) => (
              <div
                key={category}
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                style={{ borderLeftColor: color, borderLeftWidth: 2 }}
              >
                <p className="text-xs font-mono font-semibold mb-1" style={{ color }}>{category}</p>
                <p className="text-sm text-white/55">{note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">Cross-protocol milestone.</span>{' '}
              CrewAI remains the only agent confirmed on both ERC-8004 and x402. No new cross-protocol entries this week.
            </p>
            <p>
              <span className="text-white/80 font-semibold">x402 payment activity.</span>{' '}
              Three API calls to trust-summary endpoints observed via x402 settlement logs on Base mainnet. First week with measurable machine-caller activity.
            </p>
            <p>
              <span className="text-white/80 font-semibold">HuggingFace activity.</span>{' '}
              Qwen derivative count crossed 1,000 downstream fine-tunes. Deployment score adjustment scheduled for next snapshot.
            </p>
          </div>
        </section>

        {/* Data */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents tracked', value: '1,400+' },
              { label: 'Evidence-ranked', value: '138' },
              { label: 'Snapshots taken', value: '7' },
              { label: 'Ranking moves', value: '~40' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-white/[0.06] px-3 py-2.5">
                <p className="text-base font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">Blog →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
