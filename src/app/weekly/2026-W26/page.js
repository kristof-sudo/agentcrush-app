import Link from 'next/link'

export const metadata = {
  title: 'W26 · June 22–28, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W26 2026. Forty thousand agents went to work trading real assets — and the week’s question stopped being "can agents pay?" and became "can I verify what’s paying me?" We answered by making our own numbers checkable.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W26',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W26 2026',
    description: '40,000 agents started trading real assets; trust-layer consolidation became the whole conversation; we shipped a verifiable historic record and closed the liveness gap we flagged against ourselves.',
    url: 'https://agentcrush.xyz/weekly/2026-W26',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W26_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W26, June 22–28, 2026' }],
    type: 'article',
    publishedTime: '2026-06-28T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W26 2026',
    description: 'Scale arrived — 40,000 agents trading real assets. So we made our own numbers checkable.',
    images: ['https://agentcrush.xyz/weekly/W26_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W26 · June 22–28, 2026',
  description: 'Weekly signal digest: 40,000 agents begin trading tokenized stocks, the x402 conversation consolidates around trust, and AgentCrush ships a cryptographically verifiable historic record plus a third (runtime) signal family.',
  url: 'https://agentcrush.xyz/weekly/2026-W26',
  image: 'https://agentcrush.xyz/weekly/W26_cover.png',
  datePublished: '2026-06-28T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W26 close — sourced live from /api/rankings/*/llm-summary (2026-06-28).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'OpenClaw Agents',      score: 77 },
      { rank: 2, name: 'CrewAI',               score: 72 },
      { rank: 3, name: 'openai-agents-python', score: 72 },
      { rank: 4, name: 'DSPy Agents',          score: 68 },
      { rank: 5, name: 'AgentOps',             score: 63 },
    ],
    kicker: 'Still the tightest board on the index — but openai-agents-python climbed into a tie for second while DSPy slipped to fourth. Fourteen points separate first from fifth; the order moves with every release.',
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
    kicker: 'Qwen holds the single highest score anywhere on the index, and open-weight families take four of the top five. In model-land, distribution still outranks brand.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 80 },
      { rank: 2, name: 'Ribbita', score: 71 },
      { rank: 3, name: 'G.A.M.E', score: 65 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: 'Vader',   score: 60 },
    ],
    kicker: 'AIXBT keeps a nine-point lead. The most volatile board we track — it moves with the market, not with shipping — and the one category where our liveness signal is still blind (0% in the Ghost Index, flagged honestly below).',
  },
  {
    category: 'Service', color: '#f0a500', methodology: 'v1.1-forks', href: '/rankings/service-agents',
    note: 'adoption · source quality · activity',
    rows: [
      { rank: 1, name: 'A2A',               score: 77 },
      { rank: 2, name: 'evolver',           score: 73 },
      { rank: 3, name: 'bitterbot-desktop', score: 70 },
      { rank: 4, name: 'a2a-samples',       score: 69 },
      { rank: 5, name: 'a2a-python',        score: 68 },
    ],
    kicker: 'A2A and its reference implementations still own the board, but evolver and bitterbot-desktop edged up — the protocol-plumbing tier is starting to mature into tools people actually run.',
  },
]

// Live category liveness from /api/ghost-index/v1 (computed 2026-06-27 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 47,  total: 48,   pct: '97.9%', tone: 'text-emerald-300/80', flag: false },
  { cat: 'Developer',      alive: 747, total: 1306, pct: '57.2%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W26Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W26 · June 22–28, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W26_cover.png"
          alt="AgentCrush Weekly Digest — W26, June 22–28, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W26 · We made our own numbers checkable
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>June 22–28, 2026 · Published June 28</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            W26 was the week roughly <span className="text-white/85">40,000 agents went to work</span>. Virtuals,
            Ondo Finance and Treasures put more than 430 tokenized stocks within reach of a swarm of on-chain
            agents, and &ldquo;agents as traders&rdquo; went from thesis to live data almost overnight. The loudest
            post of the week put it bluntly: <span className="text-white/85">&ldquo;what happens when 40,000 AI bots
            start trading stocks with no human in the loop?&rdquo;</span> But the more interesting reaction wasn&apos;t
            awe — it was a question. Of those forty thousand, which are economically real, and which can you trust
            to move money? That question — not whether agents <em>can</em> pay, but whether you can <em>verify</em>{' '}
            what&apos;s paying you — was the whole week.
          </p>
          <p>
            You could watch it consolidate in real time. Across Farcaster and X, the x402 conversation finished its
            shift from &ldquo;can agents pay?&rdquo; to <span className="text-white/85">&ldquo;can I trust what&apos;s
            paying me?&rdquo;</span> Three sub-threads hardened into one layer: schema-validated, deterministic
            contracts; custody and signer architecture; and endpoint risk-scoring. ERC-8004 identity went
            multi-chain in the same stretch — BaseHub registration is live, and Vyper&apos;s Arc testnet wired
            ERC-8004 identity, x402 settlement and Circle payment flows into a single deployment. Identity is now
            table stakes. The contested layer is <span className="text-white/85">proof</span> — liveness, reputation,
            receipts.
          </p>
          <p>
            So we spent the week turning AgentCrush from a thing that <em>asserts</em> numbers into a thing that can{' '}
            <em>prove</em> them. Two shipments did most of the work. Runtime liveness became a{' '}
            <span className="text-white/85">third, independent signal family</span> — actual endpoint uptime,
            collected forward over time rather than self-reported — joining code signal and economic signal so no
            score rests on a single source. And we shipped a{' '}
            <Link href="/api/verify" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              verifiable historic record
            </Link>: every day we publish a Merkle root over the full snapshot
            (<span className="font-mono text-[13px] text-white/70">agent_id|rank|score|is_alive</span>), chained day
            to day. Recompute it yourself and prove we never quietly rewrote a ranking. It returns{' '}
            <span className="font-mono text-white/80">verified: true</span>, live.
          </p>
          <p>
            And we closed a gap we&apos;d flagged against ourselves. In W24 the Ghost Index showed service and
            tokenized agents at <span className="text-white/85">0% alive</span>, and we said plainly that was an
            instrumentation hole, not mass dormancy — we&apos;d rather show the gap than launder it. This week we
            closed half of it: with the right signal wired in, <span className="text-white/85">service liveness went
            from 0% to 97.9%</span> (47 of 48). Tokenized is still at 0% and still flagged honestly — AIXBT and its
            peers are demonstrably active, so that zero is our blind spot, not theirs, and it&apos;s next. Showing
            the gap and then closing it on the record is the entire point.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W26 close.
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
            Standings at W26 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 58.8% — above half, and finally honest</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">58.8%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">819 alive · 575 ghosts · 1,394 indexed · +0.5 / 7d</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life. After a
                deduplication pass and the service-liveness fix, the honest number is now above half.
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
                Two things moved the number this period. We deduplicated the index — archiving split, duplicate and
                non-agent rows so famous agents resolve to one real entry — and we wired a working liveness signal
                into the service category, which jumped from <span className="text-white/85">0% to 97.9%</span>.
                What&apos;s left is the shape of the economy itself: the infrastructure and model tiers are at or
                near 100%, while the <span className="text-white/85">1,306-agent developer long tail sits at
                57.2%</span> — most of the index, and the category still doing the most to pull the average down.
              </p>
              <p className="text-white/40">
                <span className="text-white/55">* Tokenized still reads 0%, and we&apos;re leaving the flag on.</span>{' '}
                AIXBT and the tokenized leaders are demonstrably active, so a literal zero reflects a gap in how our
                liveness signal captures that category — not true dormancy. Service was in exactly this state in W24
                and is now fixed; tokenized is next. We&apos;d rather show you where our own instrument is still thin
                than launder it into a clean-looking number. See the methodology at{' '}
                <Link href="/ghost-index" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">/ghost-index</Link>{' '}
                and the deep dive at{' '}
                <Link href="/blog/liveness-is-layer-zero" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">liveness is layer zero</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">40,000 agents started trading real assets.</span>{' '}
              Virtuals, Ondo Finance and Treasures together put 430+ tokenized stocks in reach of roughly 40,000
              on-chain agents — the first real test of the agent economy at scale, and the start of a serious
              systemic-risk conversation about autonomous coordination with no human in the loop. It also sharpens
              our thesis: a registry of 40,000 agents is worthless if it can&apos;t tell you which of them are
              economically real. That is the question the Ghost Index exists to answer.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The x402 conversation consolidated around trust.</span>{' '}
              Volume is no longer the story; verification is. The week&apos;s threads were about schema-deterministic
              contracts, custody and signer design, and endpoint risk-scoring — the receipt-and-verification layer
              that sits on top of working payment rails. &ldquo;Settlement is solved; settlement <em>proof</em> is
              not&rdquo; became the consensus frame, which is precisely why we shipped a verifiable historic record
              this week.
            </p>
            <p>
              <span className="text-white/80 font-semibold">ERC-8004 identity went multi-chain.</span>{' '}
              BaseHub registration is live and agents are registering daily; Vyper&apos;s Arc testnet is the first
              public implementation pairing ERC-8004 identity with x402 payments and Circle settlement. Identity is
              shipping faster than expected — which pushes the open problem one layer up, to the composability of
              identity, payments and spending controls.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,394' },
              { label: 'Ghost Index liveness', value: '58.8%' },
              { label: 'Service liveness (was 0%)', value: '97.9%' },
              { label: 'Agents trading stocks', value: '~40,000' },
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
              <Link href="/api/verify" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">/api/verify</Link>{' '}
              — a cryptographically verifiable historic record: a daily Merkle root over every snapshot, chained day
              to day, that anyone can recompute to prove we never silently rewrote a ranking
            </li>
            <li>
              <Link href="/api/reliability/v1" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Runtime liveness</Link>{' '}
              — a third, independent signal family: forward-collected endpoint uptime, so reliability is measured
              over time alongside code signal and economic signal, never resting on one source
            </li>
            <li>
              <span className="text-white/80">Service liveness fix</span> — closed the instrumentation gap we
              flagged honestly in W24; service liveness went from 0% to 97.9% once the right signal was wired in
            </li>
            <li>
              <Link href="/ghost-index" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Ghost Index recompute</Link>{' '}
              — deduplicated the index (archiving split, duplicate and non-agent rows) so liveness now rests on a
              clean denominator: a defensible 58.8%
            </li>
            <li>
              <span className="text-white/80">Self-healing rankings</span> — blended scores now reconcile hourly,
              in-database, so the boards can&apos;t drift into nonsense between worker runs
            </li>
            <li>
              <Link href="/blog/liveness-is-layer-zero" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">liveness is layer zero</Link>{' '}
              — why liveness is the precondition for every other signal you might score an agent on
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            The pattern under all of it: the agent economy hit real scale this week — forty thousand agents trading
            real assets — and scale turns &ldquo;trust me&rdquo; into a liability. The market answered by
            consolidating a trust layer. We answered by making our own numbers checkable: a record anyone can
            recompute, a third signal family that doesn&apos;t depend on self-report, and a gap we flagged against
            ourselves and then closed. Legible, on the record, including where we&apos;re still thin. That is the
            entire job.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/api/verify" className="hover:text-white/70 transition-colors">Verify →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
