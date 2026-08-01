import Link from 'next/link'

export const metadata = {
  title: 'State of the Index — July 2026 · AgentCrush',
  description: 'Monthly state of the AgentCrush index for July 2026. Ghost Index declined 2.8 points across the month (58.5% → 55.7%) as the archive crossed 91,000 daily snapshots. Evidence-ranked tier grew from 145 to 162. Developer board leadership changed: CrewAI moved to #1.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/state-2026-07',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'State of the Index — July 2026 · AgentCrush',
    description: 'Ghost Index: 55.7% at month close, down 2.8 points over July. Evidence-ranked tier: 162 agents (+17 in July). 91,114 daily snapshots archived. Developer board: CrewAI moved to #1.',
    url: 'https://agentcrush.xyz/weekly/state-2026-07',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — State of the Index, July 2026' }],
    type: 'article',
    publishedTime: '2026-08-01T05:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of the Index — July 2026 · AgentCrush',
    description: '55.7% alive. 162 evidence-ranked. 91,114 snapshots archived. July close.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'State of the Index — July 2026',
  description: 'Monthly report on the AgentCrush index for July 2026. Ghost Index trajectory, all four category rankings at month close, evidence-ranked tier expansion, and archive growth.',
  url: 'https://agentcrush.xyz/weekly/state-2026-07',
  image: 'https://agentcrush.xyz/og-default.png',
  datePublished: '2026-08-01T05:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush', url: 'https://agentcrush.xyz/weekly' },
}

// All four boards at July 2026 close — sourced live from /api/rankings/*/llm-summary (2026-08-01).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'CrewAI',               score: 75 },
      { rank: 2, name: 'openclaw',             score: 73 },
      { rank: 3, name: 'openai-agents-python', score: 72 },
      { rank: 4, name: 'DSPy Agents',          score: 68 },
      { rank: 5, name: 'google-adk-python',    score: 67 },
    ],
    kicker: 'The month\'s most consequential move: CrewAI crossed to #1 after being confirmed on observable signals — 47k GitHub stars, four ecosystem relationships, and a verified on-chain identity satisfied the evidence gate in mid-July. OpenClaw fell from 76 to 73 and dropped to #2. The rest of the board held through the month.',
  },
  {
    category: 'Model Families', color: '#a78bfa', methodology: 'v1.4', href: '/rankings/model-families',
    note: 'HuggingFace · LMArena · deployment breadth',
    rows: [
      { rank: 1, name: 'Alibaba Qwen',  score: 82 },
      { rank: 2, name: 'Google Gemini', score: 80 },
      { rank: 3, name: 'Mistral',       score: 74 },
      { rank: 4, name: 'DeepSeek',      score: 74 },
      { rank: 5, name: 'Meta Llama',    score: 70 },
    ],
    kicker: 'The most stable board we publish — same five, same order, same scores as the start of July. Qwen at 82, Gemini at 80, Mistral and DeepSeek tied at 74, Llama at 70. Open-weight families hold four of five seats and the argument stays unchanged: deployment breadth compounds where brand does not.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 81 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 65 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: 'Vader',   score: 60 },
    ],
    kicker: 'AIXBT holds #1 at 81 (down 1 from July start). Ribbita moved up 1 to 73. G.A.M.E, G.A.M.E and Vader each down 1. Luna held at 64. The liveness column still reads 0% — the instrument probes HTTP endpoints while these agents live on-chain. The Ghost Index entry below carries the full flag.',
  },
  {
    category: 'Service', color: '#f0a500', methodology: 'v1.1-forks', href: '/rankings/service-agents',
    note: 'adoption · source quality · activity',
    rows: [
      { rank: 1, name: 'A2A',               score: 77 },
      { rank: 2, name: 'a2a-python',        score: 74 },
      { rank: 3, name: 'evolver',           score: 73 },
      { rank: 4, name: 'a2a-samples',       score: 72 },
      { rank: 5, name: 'bitterbot-desktop', score: 70 },
    ],
    kicker: 'No movement across July. A2A and three of its reference implementations hold the top four, packed inside five points; bitterbot-desktop at 70. The service board closed July exactly as it opened it.',
  },
]

// Ghost Index category breakdown — live from /api/ghost-index/v1 (computed 2026-07-31 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 45,  total: 54,   pct: '83.3%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Developer',      alive: 717, total: 1319, pct: '54.4%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function StateJuly2026() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Archive</Link>
          <span className="mx-2 text-white/15">/</span>
          State of the Index — July 2026
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Monthly Report
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          State of the Index — July 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published August 1, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Summary */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The Ghost Index closed July at <span className="text-white/85">55.7%</span> — down 2.8 percentage
            points from 58.5% on July 2, on a base that grew by 16 net new agents across the month.
            The pattern is consistent with prior months: the index gets more agents before it gets more evidence.
            New entrants arrive without corroborated activity signals; they sit as ghosts on the record until
            they produce evidence or the window expires. That is the number working correctly, not a system
            under stress. The Developer category drove the headline — 717 alive of 1,319 indexed (54.4%), down
            from 56.6% at the end of W30. Service held at 83.3% (45 of 54). MCP servers and model families
            both stayed at 100%, both with the selection notes we carry honestly on every report.
          </p>
          <p>
            The evidence-ranked tier expanded from roughly 145 agents at the start of July to{' '}
            <span className="text-white/85">162 at month close — 17 promotions</span> over the month.
            The most visible: CrewAI crossed to the top of the Developer ranking after satisfying the evidence
            gate on observable signals (47k GitHub stars, four confirmed ecosystem relationships, a verified
            on-chain identity). Tier promotion is not editorial discretion; it is a threshold crossing on
            published methodology. Seventeen agents crossed it in July.
          </p>
          <p>
            On the other boards: the Model Family ranking was perfectly stable through the month — same five
            families, same scores, same order. The Service board was equally static. The Tokenized board saw
            minor score fluctuations of ±1 point, consistent with market moves rather than methodology changes.
            The archive compounded to{' '}
            <span className="text-white/85">91,114 daily snapshots</span> as of August 1, Merkle-anchored on
            Base every night. Each snapshot is the historical record nobody can backfill; the archive is the
            product.
          </p>
        </div>

        {/* Rankings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">All four boards at July close</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            Live from <span className="font-mono">/api/rankings/*/llm-summary</span> as of August 1, 2026.
          </p>

          <div className="space-y-3">
            {RANKINGS.map(({ category, color, methodology, href, note, rows, kicker }) => (
              <div key={category}
                   className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4"
                   style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-mono font-semibold" style={{ color }}>{category}</p>
                    <span className="text-[10px] font-mono text-white/25">{note}</span>
                  </div>
                  <Link href={href} className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">{methodology} · full ranking →</Link>
                </div>
                <div className="space-y-1.5 mb-3">
                  {rows.map(({ rank, name, score }) => (
                    <div key={name} className="flex items-center gap-3 text-sm">
                      <span className="text-white/30 font-mono w-5 text-right">{rank}</span>
                      <span className="text-white/75 flex-1">{name}</span>
                      <span className="font-mono font-semibold w-10 text-right" style={{ color }}>{score}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed">{kicker}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ghost Index block */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 55.7% — month closed 3 points lower</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">55.7%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">787 alive · 626 ghosts · 1,413 indexed · July 2 open: 58.5%</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                −2.8 points across July. The index grew by 16 agents; the alive share declined. The archive is nightly; every
                number here is independently recomputable via <Link href="/oracle" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">/oracle</Link>.
              </p>
            </div>

            <div className="rounded border border-white/[0.06] overflow-hidden mb-4">
              {GHOST_BREAKDOWN.map(({ cat, alive, total, pct, tone, flag }) => (
                <div key={cat} className="flex items-center gap-3 px-3 py-2 text-sm border-b border-white/[0.05] last:border-0">
                  <span className="text-white/70 flex-1">{cat}{flag && <span className="text-white/30">*</span>}</span>
                  <span className="text-white/35 font-mono text-xs w-20 text-right">{alive} / {total}</span>
                  <span className={`font-mono font-semibold w-14 text-right ${tone}`}>{pct}</span>
                </div>
              ))}
            </div>

            <p className="text-[12px] text-white/35 leading-relaxed">
              <span className="text-white/50">* Two standing flags.</span>{' '}
              MCP&apos;s 100% reflects a selection effect — we track actively maintained servers. Tokenized&apos;s
              0% is an instrument gap: the probe listens on HTTP while those agents live on-chain. The fix is on
              the roadmap; when the number moves it will move because the measurement improved, stated in those words.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">July 2026 in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed',          value: '1,413' },
              { label: 'Ghost Index liveness',     value: '55.7%' },
              { label: 'Snapshots archived',       value: '91,114' },
              { label: 'Evidence-ranked (July close)', value: '162' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-white/[0.06] px-3 py-2.5">
                <p className="text-base font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Standing paragraph */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/55 leading-relaxed">
            The index runs autonomously — daily snapshots at 02:00 UTC, nightly liveness scoring at 23:50 UTC,
            Sunday ranking runs, and Merkle anchoring to Base at 04:30 UTC. Every number here is live and
            independently recomputable via{' '}
            <Link href="/oracle" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">/oracle</Link>.
            The archive is the product: each nightly snapshot is a timestamped record of the agent economy
            that cannot be backfilled. The data is available machine-readable at{' '}
            <span className="font-mono text-white/60">/api/ghost-index/v1</span>,{' '}
            <span className="font-mono text-white/60">/api/rankings/*/llm-summary</span>, and{' '}
            <span className="font-mono text-white/60">/api/agent-economy/llm-summary</span>.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/changes" className="hover:text-white/70 transition-colors">Daily Changes →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
