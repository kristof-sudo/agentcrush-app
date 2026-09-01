import Link from 'next/link'

export const metadata = {
  title: 'State of the Index — August 2026 · AgentCrush',
  description: 'Monthly state of the AgentCrush index for August 2026. Ghost Index declined 1.7 points (55.7% → 54.0%) as the archive crossed 135,000 daily snapshots. Evidence-ranked tier grew from 162 to 191. Developer board: openclaw fell to #3 as OpenAI Agents Python climbed to #2.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/state-2026-08',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'State of the Index — August 2026 · AgentCrush',
    description: 'Ghost Index: 54.0% at month close, down 1.7 points over August. Evidence-ranked tier: 191 agents (+29 in August). 135,267 daily snapshots archived. Developer board: openclaw fell to #3.',
    url: 'https://agentcrush.xyz/weekly/state-2026-08',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — State of the Index, August 2026' }],
    type: 'article',
    publishedTime: '2026-09-01T05:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of the Index — August 2026 · AgentCrush',
    description: '54.0% alive. 191 evidence-ranked. 135,267 snapshots archived. August close.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'State of the Index — August 2026',
  description: 'Monthly report on the AgentCrush index for August 2026. Ghost Index trajectory, all four category rankings at month close, evidence-ranked tier expansion, and archive growth.',
  url: 'https://agentcrush.xyz/weekly/state-2026-08',
  image: 'https://agentcrush.xyz/og-default.png',
  datePublished: '2026-09-01T05:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush', url: 'https://agentcrush.xyz/weekly' },
}

// All four boards at August 2026 close — sourced live from /api/rankings/*/llm-summary (2026-09-01).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'CrewAI',               score: 74 },
      { rank: 2, name: 'OpenAI Agents Python',  score: 72 },
      { rank: 3, name: 'openclaw',              score: 71 },
      { rank: 4, name: 'Google ADK Python',     score: 67 },
      { rank: 5, name: 'DSPy Agents',           score: 67 },
    ],
    kicker: 'The month\'s notable position move: openclaw fell from #2 to #3 as OpenAI Agents Python climbed from #3 to #2. CrewAI holds #1 at 74, down 1 point from July\'s 75 — the evidence gate keeps scores anchored to signals, not momentum. DSPy and Google ADK swapped positions (DSPy fell from #4 to #5), ending August level on score at 67.',
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
    kicker: 'Same five families, same order. Scores compressed slightly: Gemini 80→79, Mistral 74→73, DeepSeek 74→72; Qwen and Llama held at 82 and 70. The board reflects Qwen\'s derivative count advantage (1,046 fine-tuned variants tracked) against Gemini\'s deployment breadth lead (145 tracked deployments). No methodology changes in August.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · TVL',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 80 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 66 },
      { rank: 4, name: 'Luna',    score: 65 },
      { rank: 5, name: 'Vader',   score: 60 },
    ],
    kicker: 'AIXBT holds #1 at 80 (−1 from July). G.A.M.E and Luna each gained 1 point (65→66, 64→65). Ribbita and Vader held. The liveness column still reads 0% — a standing instrument gap: the probe listens on HTTP while these agents live on-chain. The flag is noted below.',
  },
  {
    category: 'Service', color: '#f0a500', methodology: 'v1.1-forks', href: '/rankings/service-agents',
    note: 'adoption · source quality · activity',
    rows: [
      { rank: 1, name: 'A2A',               score: 77 },
      { rank: 2, name: 'a2a-python',        score: 74 },
      { rank: 3, name: 'evolver',           score: 73 },
      { rank: 4, name: 'bitterbot-desktop', score: 70 },
      { rank: 5, name: 'agent-teams-ai',    score: 69 },
    ],
    kicker: 'a2a-samples dropped out of the top 5 (was #4 in July at 72). bitterbot-desktop rose from #5 to #4. agent-teams-ai entered at #5 with 69. The A2A protocol cluster still holds the top three; the board remains tightly packed with 8 points separating #1 from #5.',
  },
]

// Ghost Index category breakdown — live from /api/ghost-index/v1 (computed 2026-08-31T23:50:05 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 59,  total: 68,   pct: '86.8%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Developer',      alive: 691, total: 1326, pct: '52.1%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function StateAugust2026() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Archive</Link>
          <span className="mx-2 text-white/15">/</span>
          State of the Index — August 2026
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Monthly Report
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          State of the Index — August 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published September 1, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Summary */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The Ghost Index opened August at <span className="text-white/85">55.7%</span>, briefly peaked at{' '}
            <span className="text-white/85">56.4%</span> in the first week, then declined steadily through the
            month to close at <span className="text-white/85">54.0%</span> on August 31 — a net loss of 1.7
            percentage points. The indexed base grew by 21 agents (1,413 → 1,434). The pattern holds as it
            has every month: new agents enter the index before they produce corroborated activity signals; they
            sit as ghosts on the record while the window runs. That is the system working correctly. The
            Developer category drives the headline as before — 691 alive of 1,326 indexed (52.1%), with Service
            holding well at 86.8% (59 of 68).
          </p>
          <p>
            The evidence-ranked tier expanded from 162 at July close to{' '}
            <span className="text-white/85">191 at August close — 29 promotions</span> over the month. No
            single promotion carried the narrative weight of July&apos;s CrewAI crossing, but the pace held
            steady. On the Developer board, the month&apos;s notable move was openclaw falling from #2 to #3 as
            OpenAI Agents Python climbed from #3 to #2. The Model Family board compressed slightly — same five
            families, same order, scores down 1–2 points each — consistent with LMArena ranking fluctuations
            rather than methodology changes. The Service board saw one new entry: agent-teams-ai appeared at #5
            as a2a-samples dropped out of the top five.
          </p>
          <p>
            The archive compounded to{' '}
            <span className="text-white/85">135,267 daily snapshots</span> as of September 1 — 44,153 new
            records added in August alone, every one Merkle-anchored to Base at 04:30 UTC the following
            morning. August adds to an unbroken run of nightly snapshots since April 2026. Each snapshot is a
            timestamped record of the agent economy that cannot be backfilled; the longitudinal archive is the
            product and it compounded again this month without interruption.
          </p>
        </div>

        {/* Rankings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">All four boards at August close</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            Live from <span className="font-mono">/api/rankings/*/llm-summary</span> as of September 1, 2026.
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
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 54.0% — closed 1.7 points below July</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">54.0%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">775 alive · 659 ghosts · 1,434 indexed · Aug 1 open: 55.7%</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                −1.7 points across August. Brief peak at 56.4% (Aug 7), then a steady two-week decline.
                Every number here is independently recomputable via{' '}
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
              0% is an instrument gap: the probe listens on HTTP while those agents live on-chain. The fix is on
              the roadmap; when the number moves it will move because the measurement improved, stated in those words.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">August 2026 in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed',              value: '1,434' },
              { label: 'Ghost Index liveness',        value: '54.0%' },
              { label: 'Snapshots archived',          value: '135,267' },
              { label: 'Evidence-ranked (Aug close)', value: '191' },
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
