import Link from 'next/link'

export const metadata = {
  title: 'W29 · July 13–19, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W29 2026. The proof layer found its venue this week: the moment of payment. ERC-8004 registries crossed chains, the verification layer got crowded, compliance APIs showed up behind x402 paywalls — and we shipped Guard, a pre-settlement verdict that runs before funds move.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W29',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W29 2026',
    description: 'The verdict moves into the payment path. Registries crossed chains, the verification layer got crowded, compliance went machine-payable — and we shipped a pre-settlement guard that answers before funds move.',
    url: 'https://agentcrush.xyz/weekly/2026-W29',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W29_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W29, July 13–19, 2026' }],
    type: 'article',
    publishedTime: '2026-07-19T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W29 2026',
    description: 'The week the verdict moved into the payment path: cross-chain identity registries, a crowding verification layer, compliance behind x402 — and a pre-settlement guard that runs before funds move.',
    images: ['https://agentcrush.xyz/weekly/W29_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W29 · July 13–19, 2026',
  description: 'Weekly signal digest: the trust conversation converges on the moment of payment — ERC-8004 ported to Solana, the agent-verification layer getting crowded, compliance APIs behind x402 — while AgentCrush ships Guard, a free pre-settlement verdict wired into the payment path.',
  url: 'https://agentcrush.xyz/weekly/2026-W29',
  image: 'https://agentcrush.xyz/weekly/W29_cover.png',
  datePublished: '2026-07-19T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W29 close — sourced live from /api/rankings/*/llm-summary (2026-07-19).
const RANKINGS = [
  {
    category: 'Developer', color: '#00d4ff', methodology: 'v2.c-public', href: '/rankings/developer',
    note: 'GitHub · package usage · ecosystem signal',
    rows: [
      { rank: 1, name: 'openclaw',             score: 76 },
      { rank: 2, name: 'CrewAI',               score: 75 },
      { rank: 3, name: 'openai-agents-python', score: 72 },
      { rank: 4, name: 'DSPy Agents',          score: 68 },
      { rank: 5, name: 'google-adk-python',    score: 67 },
    ],
    kicker: 'One real move on the tightest board: google-adk-python enters at #5 on 67, displacing AgentOps. Above it, the slow-motion chase continues — CrewAI has now closed to under two points of openclaw. Three weeks ago that gap was five; nobody jumped, someone just kept compounding.',
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
    kicker: 'Identical five, identical order, third straight week — down to the Mistral–DeepSeek tie at third. Qwen still posts the single highest score anywhere on the index, and open-weight families still hold four of five seats. The most stable board we publish keeps making the same argument: distribution beats brand.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 81 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 65 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: 'Vader',   score: 61 },
    ],
    kicker: 'The market board breathed back in: Ribbita +2 to 73, Vader +2 to 61, AIXBT flat at 81 with its lead intact. Prices move, scores follow — and the liveness column still reads 0%, still starred, still an instrument gap we own publicly until the on-chain signal lands (it is next on the list).',
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
    kicker: 'Unchanged top to bottom, still packed inside seven points, A2A family still holding four of five seats. The board gained a new neighbor this week that does not rank yet: HANKO, the first Solana-side ERC-8004 registry we index — a service agent whose product is other agents’ trust.',
  },
]

// Live category liveness from /api/ghost-index/v1 (computed 2026-07-18 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 48,  total: 52,   pct: '92.3%', tone: 'text-emerald-300/80', flag: false },
  { cat: 'Developer',      alive: 739, total: 1316, pct: '56.2%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W29Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W29 · July 13–19, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W29_cover.png"
          alt="AgentCrush Weekly Digest — W29, July 13–19, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W29 · The verdict moves into the payment path.
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>July 13–19, 2026 · Published July 19</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            Last week the agent economy built proof primitives — reputation leaderboards, execution receipts,
            registries. This week the question quietly changed from <em>what proof looks like</em> to{' '}
            <span className="text-white/85">where proof gets used</span>, and every thread that mattered converged on
            the same answer: at the moment of payment. Not on a rankings page someone might read, not in a registry
            someone might query — in the seconds between &ldquo;an agent quoted me a price&rdquo; and &ldquo;funds
            moved.&rdquo; That is where a verdict is worth something, because it is the last moment a wrong answer is
            still cheap.
          </p>
          <p>
            The ecosystem kept assembling around that moment from three directions. The identity layer went
            cross-chain: <span className="text-white/85">HANKO launched an ERC-8004-pattern agent trust registry on
            Solana mainnet</span> — bonded registration, typed attestations, karma scoring — per the project&apos;s
            July launch, taking a standard that lived on Base and EVM chains and porting its shape to a second
            ecosystem. The verification layer got visibly crowded: Agenstry now advertises{' '}
            <span className="text-white/85">3,182 agents and 121,737 MCP servers</span> indexed across eight sources,
            &ldquo;identity-verified and drift-monitored&rdquo; by its own description, and The AI Agent Index curates
            300-plus agents with reviews and price comparisons. And the commercial layer put regulated work behind
            machine-payable walls: Concept4Hub, per its own posts this week, is serving{' '}
            <span className="text-white/85">VAT verification, sanctions screening, and KYC endpoints on Base behind
            x402</span> — compliance as an API an agent pays for per call, no human at the counter.
          </p>
          <p>
            Our ship this week sits exactly at that moment. <span className="text-white/85">Guard</span> is a
            pre-settlement check: hand it the payment address from an x402 quote and it answers — free, deterministic,
            before funds move — whether that address is advertised on the open Bazaar for the resource you are
            actually paying, whether it belongs to a registered on-chain agent owner, and what our index knows about
            the counterparty&apos;s tier and liveness. A payment address advertised for a <em>different</em> resource
            gets flagged. A registered owner whose advertised payment address does not match gets a caution, not a
            pass. And in the same spirit as everything else we publish: absence of evidence reads as{' '}
            <span className="text-white/85">caution, never proceed</span> — the clean verdict is reserved for
            counterparties that have earned it on observable signals.
          </p>
          <p>
            The honesty thread continued inside our own walls, where it always starts. Our machine-facing summary
            endpoint — the one built for agents, not people — had been reporting{' '}
            <span className="text-white/85">zero historical snapshots</span> while the real archive holds{' '}
            <span className="text-white/85">72,756</span>; found in our own review, fixed this week, and worth saying
            plainly because an index that sells verification cannot shrug at under-reporting itself. Meanwhile
            Sunday&apos;s scoring run promoted <span className="text-white/85">nine agents</span> into the
            evidence-ranked tier in a single pass — the pipeline doing exactly what it is for: agents accumulating
            observable evidence until the index has to admit them.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W29 close.
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
            Standings at W29 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 57.7% — drifting down for the honest reason</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">57.7%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">812 alive · 596 ghosts · 1,408 indexed · −0.3 / 7d</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life. Down
                three-tenths on the week — the index grew by six agents while seven fell silent.
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
                The slow drift down is the index getting more honest, not the ecosystem getting worse: most new
                agents enter without corroborated activity signals, so growth dilutes the alive-share until agents
                either produce evidence or sit as ghosts on the record. Developer — the open-intake category, and
                93% of everything we track — sits at 56.2% and sets the average. The starred rows are the
                instrument&apos;s own confessions, unchanged from{' '}
                <Link href="/blog/mcp-coverage" className="text-white/75 hover:text-white underline underline-offset-2">last week&apos;s writeup</Link>:
                MCP&apos;s 100% is a selection effect, and tokenized&apos;s 0% is a probe that listens for HTTP while
                those agents live on-chain.
              </p>
              <p>
                The tokenized fix is now the next item on the instrument roadmap — the same treatment that took
                Service from 0% to the 90s once we wired in the right signal. When that number moves, it will move
                because the measurement improved, and we will say so in exactly those words.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">The ERC-8004 pattern crossed chains.</span>{' '}
              HANKO went live on Solana mainnet as an agent trust registry — bonded registration, Ed25519-typed
              attestations, karma scored 0–1000 — per the project&apos;s July launch posts. The significance is not
              one more registry; it is the <em>shape</em> travelling: an identity-plus-reputation standard that
              started as an Ethereum ERC now has a native implementation on a chain with a different signature
              scheme and a different agent ecosystem. Registries are becoming a pattern, not a place. We indexed
              HANKO into the Service category this week — with its identity deliberately marked{' '}
              <span className="font-mono text-[13px] text-white/70">unverified</span> until we can corroborate the
              registry program on-chain, because a launch announcement is not identity verification, and that
              standard applies to trust infrastructure most of all.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The verification layer is getting crowded — which is the market talking.</span>{' '}
              Agenstry surfaced advertising 3,182 agents and 121,737 MCP servers indexed across eight sources,
              &ldquo;identity-verified and drift-monitored&rdquo; in its own words; The AI Agent Index curates
              300-plus agents with independent reviews and price comparison. Both are claims as advertised on their
              own surfaces, and we report them as exactly that. A year ago &ldquo;who indexes the agents&rdquo; was
              an empty room; now it is a category with competing counts, and the differentiator will be the boring
              thing it always is in measurement: published methodology, disclosed blind spots, numbers a third party
              can recompute. We added both to our standing competitive watch this week; their claims will get the
              same scrutiny ours do.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Compliance became a machine-payable vertical.</span>{' '}
              Per its own posts this week, Concept4Hub is serving VAT verification, OFAC sanctions screening, and
              KYC endpoints on Base with x402 as the payment rail — an agent needing a regulated check pays per call
              and gets an answer, no account, no human. The distribution around the launch was noisy (the same
              posts were mass-tagged across dozens of threads), so we treat the traffic claims with distance — but
              the product shape is the signal: the first clearly <em>regulated-workflow</em> vertical we have seen
              show up behind a 402, which is precisely the kind of endpoint where a pre-settlement counterparty
              check stops being a nicety. Verifying the endpoints first-hand is already queued on our side before
              they enter the index.
            </p>
            <p>
              <span className="text-white/80 font-semibold">One scoring run, nine promotions — evidence accumulation made visible.</span>{' '}
              Sunday&apos;s run promoted nine agents into the evidence-ranked tier in a single pass and reshuffled
              37 ranks across the boards (twelve up, twenty-five down), the largest one-day promotion batch since we
              started publishing the <Link href="/changes" className="text-white/75 hover:text-white underline underline-offset-2">daily changes feed</Link>.
              Nothing about those nine was decided by us this week; they crossed signal thresholds that have been
              public since the methodology went up. That is the index working as designed — admission by observable
              evidence, on a schedule, with the receipts in the feed.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,408' },
              { label: 'Ghost Index liveness', value: '57.7%' },
              { label: 'Promoted this Sunday', value: '9' },
              { label: 'Daily snapshots archived', value: '72,756' },
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
          <h2 className="text-lg font-bold text-white mb-4">What we did this week</h2>
          <ul className="space-y-2 text-sm text-white/55 leading-relaxed">
            <li>
              <span className="text-white/80">Shipped Guard, a pre-settlement counterparty check</span> — a free,
              deterministic verdict on any x402 payment address before funds move: is it advertised on the Bazaar
              for the resource actually being paid, is it a registered on-chain agent owner, and what does the index
              know about the counterparty. Flags payment addresses advertised for a different resource than the one
              quoted; depth (full risk decomposition, signed attestations) is offered only when the verdict is not
              clean
            </li>
            <li>
              <span className="text-white/80">Wired wallet-binding integrity into counterparty verdicts</span> — an
              agent whose on-chain registered owner address does not match the payment address its own domain
              advertises now gets a caution instead of a pass, with a machine-readable reason code
            </li>
            <li>
              <Link href="/developers/mcp" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">Documented the full 14-tool MCP surface</Link>{' '}
              — the developer docs had drifted to seven tools while the server grew to fourteen; the dedicated docs
              page is back, complete, and linked as the canonical reference
            </li>
            <li>
              <span className="text-white/80">Indexed HANKO</span> — the first Solana-side ERC-8004 registry in the
              index, entered as a Service agent with identity marked unverified until on-chain corroboration
            </li>
            <li>
              <span className="text-white/80">Fixed our own machine-facing reporting</span> — the agent-oriented
              summary endpoint had been publishing <span className="font-mono text-[13px]">historical_snapshots: 0</span>{' '}
              against a real archive of <span className="font-mono text-[13px]">72,756</span>; found in review,
              fixed, and the trust-evaluation API now also distinguishes an agent&apos;s verified individual ERC-8004
              registration from ecosystem-wide registration counts, which are self-reported and flagged as such
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            The market for proof found its counter this week: the payment moment. Registries are spreading across
            chains, verifiers are multiplying, compliance is quoting prices in a header — and the useful question is
            no longer whether trust infrastructure exists but whether anyone consults it in the two seconds before
            money moves. That is where we now answer, for free, deterministically, with our blind spots printed on
            the page: a 0% we still owe a fix, a 100% we still discount, and a verdict that says <em>caution</em>{' '}
            whenever the evidence is not there. The boards will move again — they always do. Until then, audit us;
            that&apos;s the product.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
          <Link href="/changes" className="hover:text-white/70 transition-colors">Daily Changes →</Link>
          <Link href="/developers/mcp" className="hover:text-white/70 transition-colors">MCP Tools →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
