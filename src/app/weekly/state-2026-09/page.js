import Link from 'next/link'

export const metadata = {
  title: 'State of the Index — September 2026 · AgentCrush',
  description: 'Monthly state of the AgentCrush index for September 2026. Ghost Index closed at 52.9%, down 1.2 points (54.1% → 52.9%). Evidence-ranked tier grew from 191 to 212 (+21 promotions). Developer board: openclaw climbed from #3 to #1 as CrewAI fell to #3. 178,477 daily snapshots archived.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/state-2026-09',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'State of the Index — September 2026 · AgentCrush',
    description: 'Ghost Index: 52.9% at month close, down 1.2 points over September. Evidence-ranked tier: 212 agents (+21 in September). 178,477 daily snapshots archived. Developer board: openclaw to #1.',
    url: 'https://agentcrush.xyz/weekly/state-2026-09',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — State of the Index, September 2026' }],
    type: 'article',
    publishedTime: '2026-10-01T05:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of the Index — September 2026 · AgentCrush',
    description: '52.9% alive. 212 evidence-ranked. 178,477 snapshots archived. September close.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'State of the Index — September 2026',
  description: 'Monthly report on the AgentCrush index for September 2026. Ghost Index trajectory, all four category rankings at month close, evidence-ranked tier expansion, and archive growth.',
  url: 'https://agentcrush.xyz/weekly/state-2026-09',
  image: 'https://agentcrush.xyz/og-default.png',
  datePublished: '2026-10-01T05:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush', url: 'https://agentcrush.xyz/weekly' },
}

// All four boards at September 2026 close — sourced live from /api/rankings/*/llm-summary (2026-10-01).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'openclaw',                 score: 74.5 },
      { rank: 2, name: 'OpenAI Agents Python',      score: 73.4 },
      { rank: 3, name: 'CrewAI',                    score: 71.6 },
      { rank: 4, name: 'Google ADK Python',          score: 67.1 },
      { rank: 5, name: 'a2a-python',                score: 67.1 },
    ],
    kicker: 'The month\'s headline move: openclaw climbed from #3 (71) to #1 (74.5) while CrewAI fell from #1 (74) to #3 (71.6). OpenAI Agents Python held at #2 with a slight score gain (72→73.4). DSPy Agents dropped out of the top 5; a2a-python entered at #5 (67.1). Google ADK Python held #4 at 67 throughout.',
  },
  {
    category: 'Model Families', color: '#a78bfa', methodology: 'v1.4', href: '/rankings/model-families',
    note: 'HuggingFace · LMArena · deployment breadth',
    rows: [
      { rank: 1, name: 'Alibaba Qwen',  score: 82 },
      { rank: 2, name: 'Google Gemini', score: 79 },
      { rank: 3, name: 'Mistral',       score: 73 },
      { rank: 4, name: 'DeepSeek',      score: 72 },
      { rank: 5, name: 'Meta Llama',    score: 70 },
    ],
    kicker: 'Same five families, same order, same scores as August. Qwen\'s derivative count advantage (1,046 fine-tuned variants tracked) and Gemini\'s deployment breadth lead (145 tracked deployments) held the top two positions unchanged. No methodology changes in September.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · TVL',
    rows: [
      { rank: 1, name: 'AIXBT',           score: 83 },
      { rank: 2, name: 'Ribbita',          score: 75 },
      { rank: 3, name: 'G.A.M.E',         score: 66 },
      { rank: 4, name: 'Luna',             score: 65 },
      { rank: 5, name: 'Voice of the Gods', score: 61 },
    ],
    kicker: 'AIXBT gained 3 points to reach 83 (#1 since the board launched). Ribbita gained 2 points (73→75). G.A.M.E and Luna held. Voice of the Gods (ADM) entered at #5 with 61, displacing Vader. The liveness column still reads 0% — a standing instrument gap: the probe listens on HTTP while these agents live on-chain.',
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
    kicker: 'The top three held unchanged. a2a-samples returned to #4 (72) after dropping out in August; agent-teams-ai (which entered last month at #5) fell off. bitterbot-desktop held its score at 70 but slipped to #5. The A2A protocol cluster still occupies the top four; 7 points separate #1 from #5.',
  },
]

// Ghost Index category breakdown — live from /api/ghost-index/v1 (computed 2026-09-30T23:50:11 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 60,  total: 76,   pct: '78.9%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Developer',      alive: 681, total: 1331, pct: '51.2%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function StateSeptember2026() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Archive</Link>
          <span className="mx-2 text-white/15">/</span>
          State of the Index — September 2026
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Monthly Report
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          State of the Index — September 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published October 1, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Summary */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The Ghost Index opened September at <span className="text-white/85">54.1%</span>, dipped
            to a low of <span className="text-white/85">52.7%</span> on September 12, then stabilized
            in a narrow 52.9–53.4% band through the second half of the month, closing at{' '}
            <span className="text-white/85">52.9%</span> on September 30 — a net decline of 1.2
            percentage points. The indexed base grew by 12 agents (1,435 → 1,447) while alive agents
            fell by 11 (777 → 766). The pattern follows the same logic it has all year: the index
            onboards agents faster than their activity signals corroborate, and liveness settles
            gradually as the 30-day window fills. Service held at 78.9% (60 of 76); Developer stayed
            just above half at 51.2% (681 of 1,331).
          </p>
          <p>
            September&apos;s headline board move was on the Developer ranking: openclaw climbed from{' '}
            <span className="text-white/85">#3 to #1</span> (71→74.5), while CrewAI fell from{' '}
            <span className="text-white/85">#1 to #3</span> (74→71.6). OpenAI Agents Python held at #2
            with a modest score gain (72→73.4). DSPy Agents dropped out of the top 5; a2a-python entered
            at #5 at 67.1 — the first appearance of an A2A-protocol agent on the Developer board. The
            Model Families board was static: same five families, same order, same scores as August.
            On Tokenized, AIXBT strengthened its lead (+3 to 83) and Ribbita gained 2 points (75).
            Voice of the Gods (ADM) displaced Vader at #5 with a 61. The Service board saw
            a2a-samples return to #4 (72) as agent-teams-ai dropped off.
          </p>
          <p>
            The evidence-ranked tier reached <span className="text-white/85">212 agents</span> at
            September close — 21 more than August&apos;s 191, continuing the steady expansion pace
            that has held since May. The archive compounded to{' '}
            <span className="text-white/85">178,477 daily snapshots</span> as of October 1, adding
            43,210 new records in September alone. Every snapshot is Merkle-anchored to Base at 04:30
            UTC the following morning and independently recomputable via{' '}
            <Link href="/oracle" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">/oracle</Link>.
            September marks month six of an unbroken nightly snapshot run since April 2026.
          </p>
        </div>

        {/* Rankings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">All four boards at September close</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            Live from <span className="font-mono">/api/rankings/*/llm-summary</span> as of October 1, 2026.
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
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 52.9% — closed 1.2 points below August</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">52.9%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">766 alive · 681 ghosts · 1,447 indexed · Sep 1 open: 54.1%</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                −1.2 points across September. Dipped to 52.7% on Sep 12, then held a 52.9–53.4% range
                through the second half. Every number here is independently recomputable via{' '}
                <Link href="/oracle" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">/oracle</Link>.
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
              0% is an instrument gap: the probe listens on HTTP while those agents live on-chain. The fix is
              in progress; when the number moves it will move because the measurement improved, stated in those words.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">September 2026 in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed',              value: '1,447' },
              { label: 'Ghost Index liveness',        value: '52.9%' },
              { label: 'Snapshots archived',          value: '178,477' },
              { label: 'Evidence-ranked (Sep close)', value: '212' },
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
