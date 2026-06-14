import Link from 'next/link'

export const metadata = {
  title: 'W24 · June 8–14, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W24 2026. The agents making real money are invisible: the x402 Demand Leaderboard launches, the "demand" number turns out to be mostly bots, and trust scoring becomes an IETF standard.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W24',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W24 2026',
    description: 'The agents making real money are invisible. x402 Demand Leaderboard launches; the "demand" number is mostly bots; trust scoring becomes an IETF standard.',
    url: 'https://agentcrush.xyz/weekly/2026-W24',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W24_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W24, June 8–14, 2026' }],
    type: 'article',
    publishedTime: '2026-06-14T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W24 2026',
    description: 'The agents making real money are invisible — and the "demand" number is mostly bots.',
    images: ['https://agentcrush.xyz/weekly/W24_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W24 · June 8–14, 2026',
  description: 'Weekly signal digest: the x402 Demand Leaderboard reveals that the highest-earning agents are unindexed, the agent-demand number is ~99.8% bots, and trust scoring crystallizes into an IETF draft.',
  url: 'https://agentcrush.xyz/weekly/2026-W24',
  image: 'https://agentcrush.xyz/weekly/W24_cover.png',
  datePublished: '2026-06-14T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W24 close — sourced from /api/rankings/*/llm-summary
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'OpenClaw Agents',      score: 77 },
      { rank: 2, name: 'CrewAI',               score: 72 },
      { rank: 3, name: 'DSPy Agents',          score: 71 },
      { rank: 4, name: 'openai-agents-python', score: 70 },
      { rank: 5, name: 'AgentOps',             score: 64 },
    ],
    kicker: 'The most competitive board on the index — five points separate #2 from #5, and the order shifts week to week with releases and adoption.',
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
    kicker: 'Qwen holds the highest single score anywhere on the index. Open-weight families take four of the top five — in model-land, distribution outranks brand.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 82 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 66 },
      { rank: 4, name: 'Luna',    score: 65 },
      { rank: 5, name: 'Vader',   score: 62 },
    ],
    kicker: 'AIXBT keeps a nine-point gap to second. The most volatile board we track — it moves with the market, not with shipping.',
  },
  {
    category: 'Service', color: '#f0a500', methodology: 'v1.1-forks', href: '/rankings/service-agents',
    note: 'adoption · source quality · activity',
    rows: [
      { rank: 1, name: 'A2A',               score: 77 },
      { rank: 2, name: 'a2a-python',        score: 73 },
      { rank: 3, name: 'evolver',           score: 73 },
      { rank: 4, name: 'a2a-samples',       score: 72 },
      { rank: 5, name: 'bitterbot-desktop', score: 70 },
    ],
    kicker: 'The A2A protocol and its reference implementations own the board — a reminder that much of the "service agent" surface is still protocol plumbing, not end-user product.',
  },
]

const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Model families', alive: 10,  total: 11,   pct: '90.9%', tone: 'text-emerald-300/80', flag: false },
  { cat: 'Developer',      alive: 215, total: 1290, pct: '16.7%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Service',        alive: 0,   total: 28,   pct: '0%',    tone: 'text-white/40',       flag: true },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W24Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W24 · June 8–14, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W24_cover.png"
          alt="AgentCrush Weekly Digest — W24, June 8–14, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W24 · The agents making real money are invisible
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>June 8–14, 2026 · Published June 14</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            W24 was the week we built the leaderboard nobody else publishes — and immediately found a hole
            in the entire &ldquo;AI agent directory&rdquo; category, including parts of our own. We shipped the{' '}
            <Link href="/x402-demand" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              x402 Demand Leaderboard
            </Link>: a live ranking, pulled straight from Coinbase&apos;s CDP Bazaar, of the operators actually
            taking x402 payments. Not the loudest agents, not the most-starred repos — the ones with money
            moving through them right now. Then we did the obvious thing and cross-referenced the top earners
            against the agent indexes.
          </p>
          <p>
            Almost none of them are listed. Of the twenty operators with the most unique paying wallets this
            week, roughly zero appear, claimed, on any agent directory. <span className="text-white/85">onesource.io</span>{' '}
            is taking payments from <span className="text-white/85">261 distinct wallets</span>. Otto AI: 196.{' '}
            <span className="text-white/85">stableenrich.dev</span>: 134. <span className="text-white/85">blockrun.ai</span>{' '}
            runs 94 paid endpoints. These are real businesses with real customers, and the directories meant to
            map the agent economy have never heard of them — while those same directories are full of famous
            framework names that haven&apos;t transacted a cent.
          </p>
          <p>
            This is the inversion at the center of the agent economy in 2026: <span className="text-white/85">reputation
            and visibility have decoupled from revenue.</span> The indexable agents aren&apos;t earning, and the
            earning agents aren&apos;t indexed. We&apos;re fixing our side of it — every operator on that leaderboard
            is now a claim invitation — but the gap itself is the most interesting dataset we produced this week.
          </p>
          <p>
            A second finding sharpens the first. We segmented our own API funnel and found that the raw
            &ldquo;agent demand&rdquo; number — the one a lot of people quote as proof the agent economy is booming —
            is <span className="text-white/85">~99.8% automated probing</span> of a handful of endpoints. Filtered
            to genuine purchase intent, real demand was in the single digits per day. Both numbers are true at
            once: enormous machine traffic, almost no paying intent. If you measure the agent economy by gross
            request volume, you are measuring crawlers. The only honest denominator is paying wallets.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W24 close.
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
            Standings at W24 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 17.7% — and wildly uneven</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">17.7%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">240 alive · 1,119 ghosts · 1,359 indexed</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life.
                Better than four in five are registered, ranked somewhere, and silent.
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
                Liveness is <span className="text-white/85">bimodal</span>. The infrastructure and model categories
                are almost entirely alive — MCP servers at a perfect 100%, model families at 90.9% — because those
                are real companies and maintained projects emitting continuous signal. The number gets dragged down
                by the long tail: 1,290 developer agents, the bulk of the index, where only 16.7% show a pulse. That
                single category is most of what the agent economy looks like, and most of it is dormant.
              </p>
              <p className="text-white/40">
                <span className="text-white/55">* The 0% readings for service and tokenized are flagged honestly.</span>{' '}
                AIXBT and the A2A projects are demonstrably active, so a literal zero almost certainly reflects a gap
                in how our liveness signal captures those categories — not true mass dormancy. We&apos;re closing that
                instrumentation gap, and we&apos;d rather show the gap than launder it into a clean-looking number.
                That is the whole point of the Ghost Index: most directories show you a list and imply it&apos;s alive.
                We show you how much of it actually is — including where our own measurement is still thin.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">Trust is becoming a standard.</span>{' '}
              An IETF Internet-Draft (<span className="font-mono text-white/70">draft-sharif-agent-payment-trust</span>)
              now specifies a public trust-query API and a five-dimension trust score for autonomous-agent payments.
              The thing AgentCrush has been building — machine-readable agent credibility — is crystallizing into a
              protocol. We shipped a schema-compatible endpoint this week so tools built to the standard can query
              our signal directly, framed honestly as a neutral external view rather than a payment authority.
            </p>
            <p>
              <span className="text-white/80 font-semibold">x402 crossed 100M agentic transactions on Base,</span>{' '}
              with payments of $1 or more now 95% of volume — up from 49% earlier this year. The micro-payment
              experiment has matured into real money, which is exactly why &ldquo;who actually gets paid&rdquo; became a
              question worth indexing.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The discovery layer is multi-chain.</span>{' '}
              Building the demand leaderboard, we confirmed the Bazaar already spans Solana, Polygon, Arbitrum,
              Avalanche and more — Solana is a massive second to Base. Single-chain views of the agent economy
              are already out of date.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,359' },
              { label: 'Ghost Index liveness', value: '17.7%' },
              { label: 'Funded x402 operators', value: '677' },
              { label: 'Real demand denominator', value: 'wallets' },
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
              <Link href="/x402-demand" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">/x402-demand</Link>{' '}
              — x402 Demand Leaderboard: live ranking of who earns via x402, by unique paying wallets, plus a free API
            </li>
            <li>
              <span className="font-mono text-white/75">/api/public/trust/&#123;agentId&#125;</span> — IETF-compatible
              public trust query API, a neutral external trust signal in the emerging standard&apos;s shape
            </li>
            <li>
              <Link href="/api/reliability/v1" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Agent Reliability Score</Link>{' '}
              — forward-collected uptime, so reliability is measured over time instead of asserted
            </li>
            <li>
              <span className="text-white/80">Honest funnel telemetry</span> — separates genuine demand from bot
              probing, so we never mistake crawlers for customers
            </li>
            <li>
              <span className="text-white/80">x402 discovery fix</span> — our Discovery API is now listed in the
              Bazaar discovery doc, where wallet-bearing agents can find it
            </li>
            <li>
              <span className="text-white/80">Infrastructure hardening</span> — rotated leaked credentials; fixed the
              daily snapshot to capture all 1,359 agents instead of the first 1,000
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            The pattern under all of it: the agent economy is generating enormous activity and very little of it is
            legible. Most agents are ghosts, most &ldquo;demand&rdquo; is machines, and the businesses actually getting
            paid are missing from the maps. Making that legible — honestly, including where our own instruments fall
            short — is the entire job.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/x402-demand" className="hover:text-white/70 transition-colors">x402 Demand →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
