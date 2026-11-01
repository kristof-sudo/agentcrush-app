import Link from 'next/link'

export const metadata = {
  title: 'State of the Index — October 2026 · AgentCrush',
  description: 'Monthly state of the AgentCrush index for October 2026. Ghost Index closed at 53.8%, up 0.9 points (52.9% → 53.8%) — first positive month since July. Evidence-ranked tier grew from 212 to 242 (+30 promotions). Developer board: openclaw fell from #1 to #3 as OpenAI Agents Python claimed the top. 223,497 daily snapshots archived.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/state-2026-10',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'State of the Index — October 2026 · AgentCrush',
    description: 'Ghost Index: 53.8% at month close, up 0.9 points over October — first positive month since July. Evidence-ranked tier: 242 agents (+30 in October). 223,497 daily snapshots archived. Developer board: OpenAI Agents Python to #1.',
    url: 'https://agentcrush.xyz/weekly/state-2026-10',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush — State of the Index, October 2026' }],
    type: 'article',
    publishedTime: '2026-11-01T05:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of the Index — October 2026 · AgentCrush',
    description: '53.8% alive. 242 evidence-ranked. 223,497 snapshots archived. October close.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'State of the Index — October 2026',
  description: 'Monthly report on the AgentCrush index for October 2026. Ghost Index trajectory, all four category rankings at month close, evidence-ranked tier expansion, and archive growth.',
  url: 'https://agentcrush.xyz/weekly/state-2026-10',
  image: 'https://agentcrush.xyz/og-default.png',
  datePublished: '2026-11-01T05:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush', url: 'https://agentcrush.xyz/weekly' },
}

// All four boards at October 2026 close — sourced live from /api/rankings/*/llm-summary (2026-11-01).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'OpenAI Agents Python', score: 73.82 },
      { rank: 2, name: 'CrewAI',               score: 71.81 },
      { rank: 3, name: 'openclaw',             score: 70.96 },
      { rank: 4, name: 'a2a-python',           score: 67.35 },
      { rank: 5, name: 'Google ADK Python',    score: 67.15 },
    ],
    kicker: 'The month\'s headline move: openclaw reversed its September run — fell from #1 (74.5) to #3 (70.96) as OpenAI Agents Python rose from #2 to #1 (73.82) and CrewAI reclaimed #2 (71.81). a2a-python rose from #5 to #4; Google ADK Python fell from #4 to #5. The five-slot spread compressed to 6.7 points — the tightest the Developer board has been, signaling narrowing distance between leading frameworks.',
  },
  {
    category: 'Model Families', color: '#a78bfa', methodology: 'v1.4-with-deployment', href: '/rankings/model-families',
    note: 'HuggingFace · LMArena · deployment breadth',
    rows: [
      { rank: 1, name: 'Alibaba Qwen',  score: 80 },
      { rank: 2, name: 'Google Gemini', score: 79 },
      { rank: 3, name: 'DeepSeek',      score: 72 },
      { rank: 4, name: 'Mistral',       score: 71 },
      { rank: 5, name: 'Meta Llama',    score: 70 },
    ],
    kicker: 'DeepSeek and Mistral traded places: DeepSeek held its score (72) and rose from #4 to #3 as Mistral dropped 2 points (73→71) and fell to #4. Qwen slipped 2 points (82→80) but retained the top position. Gemini held at 79 (#2) and Meta Llama was unchanged at 70 (#5). The order is otherwise the same as September with two families swapped in the middle.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tokenized-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · TVL',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 82 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 66 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: '717ai',   score: 59 },
    ],
    kicker: 'October saw broad compression across the board: AIXBT lost 1 point (83→82), Ribbita lost 2 points (75→73), Luna lost 1 point (65→64), G.A.M.E held at 66. Voice of the Gods (ADM, 61) dropped out; 717ai (WIRE) entered at #5 with 59. AIXBT holds #1 on social signal strength despite Ribbita\'s larger raw market cap. The liveness column still reads 0% — a standing instrument gap: the probe listens on HTTP while these agents live on-chain.',
  },
  {
    category: 'Service', color: '#f0a500', methodology: 'v1.1-service-forks', href: '/rankings/service-agents',
    note: 'adoption · source quality · activity',
    rows: [
      { rank: 1, name: 'A2A',               score: 77 },
      { rank: 2, name: 'a2a-python',        score: 74 },
      { rank: 3, name: 'evolver',           score: 73 },
      { rank: 4, name: 'bitterbot-desktop', score: 70 },
      { rank: 5, name: 'agent-teams-ai',    score: 70 },
    ],
    kicker: 'The top three held for the second consecutive month (A2A 77, a2a-python 74, evolver 73). a2a-samples, which returned to #4 in September, dropped out again; bitterbot-desktop rose from #5 to #4 (score unchanged at 70). agent-teams-ai re-entered at #5 — the same slot it held in August. The A2A protocol cluster still occupies the top four positions.',
  },
]

// Ghost Index category breakdown — live from /api/ghost-index/v1 (computed 2026-10-31T23:50:18 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 66,  total: 85,   pct: '77.6%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Developer',      alive: 693, total: 1332, pct: '52.0%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function StateOctober2026() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Archive</Link>
          <span className="mx-2 text-white/15">/</span>
          State of the Index — October 2026
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Monthly Report
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          State of the Index — October 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published November 1, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Summary */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The Ghost Index opened October at <span className="text-white/85">52.9%</span>, continuing
            directly from September&apos;s close, then dipped to its monthly low of{' '}
            <span className="text-white/85">52.6%</span> on October 16 before recovering steadily through
            the second half. It closed October 31 at <span className="text-white/85">53.8%</span> — a net
            gain of 0.9 percentage points, reversing September&apos;s −1.2 point decline and recording the
            index&apos;s first positive month since July. The indexed base grew by 10 agents (1,447 → 1,457)
            and alive agents expanded by 18 (766 → 784), indicating that October&apos;s recovery reflected
            genuine activity gains rather than base contraction. Service held at 77.6% (66 of 85); Developer
            gained to 52.0% (693 of 1,332), its highest reading since August.
          </p>
          <p>
            October&apos;s headline board move was on the Developer ranking: openclaw reversed its September
            run, falling from <span className="text-white/85">#1 to #3</span> (74.5→70.96) as OpenAI Agents
            Python claimed the top slot (73.82) and CrewAI reclaimed #2 (71.81). The five-slot spread
            compressed to 6.7 points — the tightest the board has been, reflecting narrowing distance between
            the leading frameworks. On Model Families, DeepSeek and Mistral traded places: DeepSeek held
            its score (72) and rose to #3 while Mistral dropped 2 points (73→71) to #4; Qwen slipped 2
            points but retained the top (80). On Tokenized, October saw broad compression — AIXBT lost 1
            point (82), Ribbita lost 2 points (73), Luna lost 1 point (64), and Voice of the Gods dropped
            out; 717ai entered at #5 with 59. The Service top three held for the second consecutive month
            (A2A 77, a2a-python 74, evolver 73); agent-teams-ai re-entered at #5.
          </p>
          <p>
            The evidence-ranked tier reached <span className="text-white/85">242 agents</span> at October
            close — 30 more than September&apos;s 212, the largest single-month expansion since August&apos;s
            +29. The archive compounded to{' '}
            <span className="text-white/85">223,497 daily snapshots</span> as of November 1, adding
            approximately 45,020 new records in October alone. Every snapshot is Merkle-anchored to Base
            at 04:30 UTC the following morning and independently recomputable via{' '}
            <Link href="/oracle" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">/oracle</Link>.
            October marks month seven of an unbroken nightly snapshot run since April 2026.
          </p>
        </div>

        {/* Rankings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">All four boards at October close</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            Live from <span className="font-mono">/api/rankings/*/llm-summary</span> as of November 1, 2026.
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
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 53.8% — up 0.9 points from September</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">53.8%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">784 alive · 673 ghosts · 1,457 indexed · Oct 1 open: 52.9%</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                +0.9 points across October. Dipped to 52.6% on Oct 16, then recovered to hold a 53.4–54.0%
                range through the second half. First positive month since July. Every number here is
                independently recomputable via{' '}
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
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">October 2026 in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed',              value: '1,457' },
              { label: 'Ghost Index liveness',        value: '53.8%' },
              { label: 'Snapshots archived',          value: '223,497' },
              { label: 'Evidence-ranked (Oct close)', value: '242' },
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
