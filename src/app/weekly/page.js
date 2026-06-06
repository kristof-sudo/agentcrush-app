import Link from 'next/link'

export const metadata = {
  title: 'Weekly Digest · AgentCrush',
  description: 'Weekly signal digest from the AgentCrush index — ranking moves, ecosystem events, protocol activity.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
}

const ISSUES = [
  {
    week: '2026-W22',
    label: 'W22 · May 25–31, 2026',
    summary: 'Confidence tiers extended to every category, risk-flag infrastructure ships, and the Agent Payments Stack gets its full LLM Gateway treatment.',
    href: '/weekly/2026-W22',
  },
  {
    week: '2026-W21',
    label: 'W21 · May 18–24, 2026',
    summary: 'Where the four category rankings stand, the Agent Payments Stack index goes live, and confidence tiers ship on every score.',
    href: '/weekly/2026-W21',
  },
]

export default function WeeklyIndexPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          AgentCrush Weekly
        </h1>
        <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-lg">
          Every week: ranking moves across all four category rankings, ecosystem signals, and protocol activity — distilled from the live index.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/weekly.xml"
            className="text-xs font-mono text-[#00d4ff]/70 hover:text-[#00d4ff] transition-colors border border-[#00d4ff]/20 rounded px-3 py-1.5"
          >
            RSS feed →
          </a>
        </div>
      </div>

      <div className="space-y-4">
        {ISSUES.map((issue) => (
          <Link
            key={issue.week}
            href={issue.href}
            className="block rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 hover:border-white/[0.14] hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-xs font-mono text-[#00d4ff]/70">{issue.label}</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
              {issue.summary}
            </p>
            <p className="text-xs font-mono text-violet-400/50 mt-2 group-hover:text-violet-300 transition-colors">
              Read →
            </p>
          </Link>
        ))}
      </div>

    </main>
  )
}
