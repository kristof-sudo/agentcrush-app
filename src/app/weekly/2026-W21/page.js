import Link from 'next/link'

export const metadata = {
  title: 'W21 · May 18–24, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W21 2026. Where the four category rankings stand, what shipped, and the protocol signals worth noting.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W21',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W21 2026',
    description: 'Where the four category rankings stand, what shipped, and the protocol signals worth noting — week of May 18–24, 2026.',
    url: 'https://agentcrush.xyz/weekly/2026-W21',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W21_cover.png', width: 1729, height: 910, alt: 'AgentCrush Weekly Digest — W21, May 18–24, 2026' }],
    type: 'article',
    publishedTime: '2026-05-24T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W21 2026',
    description: 'Where the four category rankings stand, what shipped, and the protocol signals worth noting.',
    images: ['https://agentcrush.xyz/weekly/W21_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W21 · May 18–24, 2026',
  description: 'Weekly signal digest: where the four category rankings stand, what shipped, and protocol signals.',
  url: 'https://agentcrush.xyz/weekly/2026-W21',
  image: 'https://agentcrush.xyz/weekly/W21_cover.png',
  datePublished: '2026-05-24T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Live standings as of 2026-05-24, sourced from the public llm-summary
// endpoints (agentcrush.xyz/api/rankings/*/llm-summary). Every number here is
// verifiable at those URLs — verify-before-post discipline.
const MODEL_FAMILIES = [
  { rank: 1, name: 'Qwen', score: 83 },
  { rank: 2, name: 'Gemini', score: 82 },
  { rank: 3, name: 'Mistral AI', score: 76 },
  { rank: 4, name: 'DeepSeek', score: 75 },
  { rank: 5, name: 'Llama', score: 70 },
  { rank: 6, name: 'Cohere', score: 55 },
  { rank: 7, name: 'Hermes', score: 34 },
]

export default function W21Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W21 · May 18–24, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W21_cover.png"
          alt="AgentCrush Weekly Digest — W21, May 18–24, 2026"
          width={1729}
          height={910}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W21 · May 18–24, 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published May 24, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
          <span className="text-white/15">·</span>
          <Link href="/weekly/2026-W21/json" className="text-violet-400/50 hover:text-violet-300 transition-colors">JSON</Link>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            Week 21 was an infrastructure week. The index now runs four category rankings side by side —
            model families, tokenized agents, service agents, and developer agents — covering{' '}
            <span className="text-white/85">1,338 indexed agents</span>, of which{' '}
            <span className="text-white/85">138 are evidence-ranked</span> (7 model families, 16 tokenized,
            28 service, 87 developer). The shift this week wasn&apos;t a leaderboard shake-up; it was
            making each ranking explain itself.
          </p>
          <p>
            Two things landed. First, the{' '}
            <Link href="/rankings/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Agent Payments Stack index</Link>{' '}
            went live — a neutral six-layer map of who actually covers what in agent payments, from settlement to
            application. Coinbase and Stripe tie at five of six layers; Circle sits at four. Second, we shipped a{' '}
            <span className="text-white/85">confidence tier</span> on scores: every ranked agent now carries a
            signal-coverage grade (high / medium / low / provisional), so a score built on five signals reads
            differently from one built on three. The principle is simple — a number without its sample size is
            a guess in a suit.
          </p>
        </div>

        {/* Where the rankings stand */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Where the rankings stand</h2>

          {/* Model families — full standings (verifiable, 7 of them) */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4 mb-3"
               style={{ borderLeftColor: '#a78bfa', borderLeftWidth: 2 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono font-semibold" style={{ color: '#a78bfa' }}>Model Families</p>
              <Link href="/rankings/model-families" className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">v1.4 · full ranking →</Link>
            </div>
            <div className="space-y-1.5">
              {MODEL_FAMILIES.map(({ rank, name, score }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <span className="text-white/30 font-mono w-5 text-right">{rank}</span>
                  <span className="text-white/75 flex-1">{name}</span>
                  <span className="text-white/85 font-mono font-semibold">{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category leaders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { category: 'Tokenized', color: '#39ff14', leader: 'aixbt', score: 83, href: '/rankings/tokenized-agents', meta: '16 ranked · v1.1' },
              { category: 'Service', color: '#f0a500', leader: 'a2aproject/A2A', score: 77, href: '/rankings/service-agents', meta: '28 ranked · v1.1' },
              { category: 'Developer', color: '#00d4ff', leader: '87 evidence-ranked', score: null, href: '/rankings/developer', meta: '1,288 tracked · v2.c' },
            ].map(({ category, color, leader, score, href, meta }) => (
              <Link key={category} href={href}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
                <p className="text-xs font-mono font-semibold mb-1" style={{ color }}>{category}</p>
                <p className="text-sm text-white/75">
                  {leader}{score != null && <span className="text-white/85 font-mono font-semibold"> · {score}</span>}
                </p>
                <p className="text-[10px] text-white/30 mt-1 font-mono">{meta}</p>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
            Standings as of May 24, 2026. Every figure is live at the public{' '}
            <span className="font-mono">/api/rankings/*/llm-summary</span> endpoints. Scores shift as
            upstream signals (HuggingFace, LMArena, on-chain) refresh.
          </p>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">Multi-signal scoring inverts single-source rankings.</span>{' '}
              Qwen leads the model-family composite at 83, but no single signal crowns it: HuggingFace downloads,
              LMArena Elo, citations, and cross-protocol deployment each point to a different leader. The composite
              is the only honest ranking — and the unique thing only AgentCrush computes.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Confidence tiers shipped.</span>{' '}
              Six of seven model families now grade <span className="text-white/75">high</span> (full five-signal
              coverage); Hermes grades <span className="text-white/75">medium</span> (four of five). The score and
              its certainty now travel together.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Payments-stack coverage is concentrated.</span>{' '}
              Across the 38 projects in the new Agent Payments Stack index, only two — Coinbase and Stripe — span
              five of the six layers. The rest specialize. Breadth is rare.
            </p>
          </div>
        </section>

        {/* Data */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,338' },
              { label: 'Evidence-ranked', value: '138' },
              { label: 'Category rankings', value: '4' },
              { label: 'x402 endpoints', value: '7' },
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
