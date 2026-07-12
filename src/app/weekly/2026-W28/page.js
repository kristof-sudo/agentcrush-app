import Link from 'next/link'

export const metadata = {
  title: 'W28 · July 6–12, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W28 2026. A quiet week on the boards — and one spent on how to read agent-liveness numbers: why our MCP category shows 100% alive and our tokenized category shows 0%, and why neither is a verdict on those agents.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W28',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W28 2026',
    description: 'The week we read our own instrument: a 100% and a 0% that are both artifacts, not verdicts. Plus four boards that barely moved — and why that stability is itself signal.',
    url: 'https://agentcrush.xyz/weekly/2026-W28',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W28_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W28, July 6–12, 2026' }],
    type: 'article',
    publishedTime: '2026-07-12T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W28 2026',
    description: 'A 100% and a 0% that are both instrument readings, not verdicts — and the selection effect behind the number. Plus four boards that held steady.',
    images: ['https://agentcrush.xyz/weekly/W28_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W28 · July 6–12, 2026',
  description: 'Weekly signal digest: a quiet week on the four category boards, a published finding on the selection effect behind our 100% MCP liveness, and an honest accounting of the tokenized 0% instrument gap.',
  url: 'https://agentcrush.xyz/weekly/2026-W28',
  image: 'https://agentcrush.xyz/weekly/W28_cover.png',
  datePublished: '2026-07-12T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W28 close — sourced live from /api/rankings/*/llm-summary (2026-07-12).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'openclaw',                score: 77 },
      { rank: 2, name: 'CrewAI',                  score: 75 },
      { rank: 3, name: 'openai-agents-python',    score: 72 },
      { rank: 4, name: 'DSPy Agents',             score: 68 },
      { rank: 5, name: 'AgentOps',                score: 63 },
    ],
    kicker: 'Same five, same order as last week — but CrewAI gained ground, narrowing the gap on openclaw from about five points to a shade over two. On the tightest board we track, the story is who is quietly compounding, not who jumped.',
  },
  {
    category: 'Model Families', color: '#a78bfa', methodology: 'v1.4', href: '/rankings/model-families',
    note: 'HuggingFace · LMArena · deployment breadth',
    rows: [
      { rank: 1, name: 'Alibaba Qwen',  score: 83 },
      { rank: 2, name: 'Google Gemini', score: 80 },
      { rank: 3, name: 'Mistral',       score: 74 },
      { rank: 4, name: 'DeepSeek',      score: 74 },
      { rank: 5, name: 'Meta Llama',    score: 70 },
    ],
    kicker: 'Identical to last week, down to the tie at third. Qwen still holds the highest score anywhere on the index and open-weight families keep four of five seats — brand loses to distribution again.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 81 },
      { rank: 2, name: 'Ribbita', score: 71 },
      { rank: 3, name: 'G.A.M.E', score: 65 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: 'Vader',   score: 59 },
    ],
    kicker: 'The market-driven board did its weekly breathing — AIXBT ticked up a point, Ribbita and Vader gave a couple back. The scores move because prices move; the liveness column, honestly, still does not move at all (0%, flagged below).',
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
    kicker: 'Unchanged at the top and still packed inside seven points. Fitting for the week: the A2A spec itself drew documentation-drift bug reports upstream — the reference tier is mature enough that people now argue about its footnotes.',
  },
]

// Live category liveness from /api/ghost-index/v1 (computed 2026-07-11 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 46,  total: 49,   pct: '93.9%', tone: 'text-emerald-300/80', flag: false },
  { cat: 'Developer',      alive: 742, total: 1313, pct: '56.5%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W28Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W28 · July 6–12, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W28_cover.png"
          alt="AgentCrush Weekly Digest — W28, July 6–12, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W28 · What a 100% and a 0% have in common
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>July 6–12, 2026 · Published July 12</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            It was a quiet week — on the boards, in the ecosystem, in our own commit log. The four category
            rankings barely moved; the loudest upstream event was a pair of documentation bugs filed against the
            A2A spec. Weeks like this are a good time to do the thing an index rarely does out loud:{' '}
            <span className="text-white/85">explain how to read its own numbers.</span>
          </p>
          <p>
            Two figures on our Ghost Index sit at the extremes. The MCP-server category reads{' '}
            <span className="text-white/85">100% alive</span>. The tokenized category reads{' '}
            <span className="text-white/85">0% alive</span>. Read naively, that says MCP servers are flawless and
            tokenized agents are all dead. Both readings are wrong — and they are wrong for the same reason: each is
            a fact about <em>our instrument</em>, not about those agents.
          </p>
          <p>
            The 100% is a{' '}
            <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              selection effect
            </Link>
            . We seeded 15 MCP servers in June, and we chose them because they already had corroboration — stars,
            multi-registry presence, recent commits — the very signals that also predict staying alive. We never
            indexed a server that had gone dark, so of course the ones we index are alive. 100% is not a quality
            verdict on MCP; it is the shadow of our own evidence bar, and we expect it to fall as coverage widens.
            We{' '}
            <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              wrote the whole thing up
            </Link>{' '}
            this week, including the three signals that get an MCP server into the ranked set.
          </p>
          <p>
            The 0% is the opposite failure and we have flagged it for weeks: AIXBT and the tokenized leaders are
            demonstrably active, but their life runs on-chain — token transfers, TVL, holder movement — and our
            liveness probe still only listens for an HTTP endpoint. So it hears silence and prints a zero. Service
            was in exactly this state three weeks ago (0% → 93.9% once we pointed the instrument at the right
            signal); tokenized is next on that list. We would rather publish the gap with a flag on it than launder
            a number we know is measuring the wrong thing.
          </p>
          <p>
            That is the whole discipline in one week: a 100% we distrust and a 0% we distrust, for symmetric
            reasons. An index is only as honest as its willingness to tell you where it cannot yet see.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W28 close.
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
          <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
            Standings at W28 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 58.0% — and the two rows that aren&apos;t what they look like</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">58.0%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">813 alive · 589 ghosts · 1,402 indexed · −0.7 / 7d</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life. A flat week
                on the average — and, as ever, the average hides more than it shows.
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

            <div className="space-y-3 text-[13px] text-white/55 leading-relaxed">
              <p>
                The two starred rows are the point of this week. <span className="text-white/75">MCP servers at
                100%</span> is a selection effect — we only indexed servers that already looked healthy, so the
                score reflects our sampling, not the MCP ecosystem. <span className="text-white/75">Tokenized at
                0%</span> is an instrument gap — those agents live on-chain, and our probe still only checks HTTP
                endpoints.
              </p>
              <p className="text-white/40">
                Neither number is a verdict on those agents. Both are honest readings of where our measurement is
                strong and where it is still blind. The full argument for the 100% —{' '}
                <Link href="/blog/mcp-coverage" className="text-white/75 hover:text-white underline underline-offset-2">the selection effect behind our MCP coverage</Link>{' '}
                — went up this week.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">The reference tier started arguing about its own footnotes.</span>{' '}
              The week&apos;s most concrete upstream signal was mundane in the way maturity is mundane: two
              documentation bugs filed against the A2A spec — event names and an Agent Card field that the docs
              describe but the proto no longer defines. Spec drift is what happens after a protocol is real enough
              that people build against the letter of it. On our Service board, the A2A family still holds the top
              four of five seats.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The MCP registry kept filling, quietly.</span>{' '}
              No architectural moves this week — just the steady drip of new server submissions and forks into the
              public registries. That is exactly the surface our{' '}
              <Link href="/blog/mcp-coverage" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">coverage roadmap</Link>{' '}
              is aimed at: as that long tail gets indexed, our 100% MCP-liveness number should come down, and it
              should — a wider net catches more silence.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Stability at the top is not nothing.</span>{' '}
              Across all four boards, the top fives held their order almost perfectly week over week. On indexes
              built to catch movement, a still frame is its own signal: nobody shipped enough to move, and the
              agents quietly compounding — CrewAI gaining a couple of points on openclaw — are easier to see when the
              rest of the board is holding position.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,402' },
              { label: 'Ghost Index liveness', value: '58.0%' },
              { label: 'Evidence-ranked', value: '145' },
              { label: 'MCP liveness (selection effect)', value: '100%' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-white/[0.06] px-3 py-2.5">
                <p className="text-base font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What shipped */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">What shipped</h2>
          <ul className="space-y-2 text-sm text-white/55 leading-relaxed">
            <li>
              <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">The MCP coverage writeup</Link>{' '}
              — why our MCP category reads 100% alive (a selection effect, not an infrastructure story), and the
              three signals that get a server into the ranked set
            </li>
            <li>
              <span className="text-white/80">Index maintenance</span> — the tokenized instrument gap stays flagged
              and queued for the same fix that took Service from 0% to 93.9%; liveness probing remains honest about
              what it can and cannot yet see
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            A quiet week, spent well: on a 100% we do not trust and a 0% we do not trust, and the discipline of
            saying so in public. The boards will move again — they always do. Until then, the most useful thing an
            index can publish is an honest map of its own blind spots. Ours are marked with an asterisk, on purpose.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/blog/mcp-coverage" className="hover:text-white/70 transition-colors">MCP Coverage →</Link>
          <Link href="/ghost-report" className="hover:text-white/70 transition-colors">Ghost Report →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
