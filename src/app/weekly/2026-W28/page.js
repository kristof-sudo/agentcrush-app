import Link from 'next/link'

export const metadata = {
  title: 'W28 · July 6–12, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W28 2026. The agent economy spent the week building the proof layer — reputation leaderboards, execution receipts, on-chain tool registries, spec-hardening — while we published a lesson in reading proof honestly: why our MCP category shows 100% liveness and our tokenized category shows 0%, and why neither is a verdict.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W28',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W28 2026',
    description: 'Identity is table stakes; the contested layer is proof. The week reputation, receipts and adjudication became the whole conversation — and we published how to read a trust number honestly.',
    url: 'https://agentcrush.xyz/weekly/2026-W28',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W28_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W28, July 6–12, 2026' }],
    type: 'article',
    publishedTime: '2026-07-12T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W28 2026',
    description: 'The week the agent economy built the proof layer — reputation, receipts, adjudication — and we published how to read a trust number honestly.',
    images: ['https://agentcrush.xyz/weekly/W28_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W28 · July 6–12, 2026',
  description: 'Weekly signal digest: the agent economy moves from identity to proof — reputation leaderboards, execution attestations, on-chain tool registries, A2A spec-hardening — while AgentCrush publishes a lesson in reading its own trust numbers honestly and hardens Virtuals coverage to 57,606 agents.',
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
      { rank: 1, name: 'openclaw',             score: 77 },
      { rank: 2, name: 'CrewAI',               score: 75 },
      { rank: 3, name: 'openai-agents-python', score: 72 },
      { rank: 4, name: 'DSPy Agents',          score: 68 },
      { rank: 5, name: 'AgentOps',             score: 63 },
    ],
    kicker: 'Same five, same order as last week — but CrewAI kept compounding, narrowing the gap on openclaw from about five points to a shade over two. On the tightest board we track, the story is rarely who jumped; it is who is quietly closing while nobody watches.',
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
    kicker: 'Identical to last week, down to the tie at third. Qwen still holds the single highest score anywhere on the index, and open-weight families keep four of five seats — in model-land, distribution keeps beating brand, week after week.',
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
    kicker: 'The market-driven board did its weekly breathing — AIXBT ticked up to extend its lead to ten points while Ribbita and Vader gave a couple back. The scores move because prices move; the liveness column, honestly, still does not move at all (0%, flagged below).',
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
    kicker: 'Unchanged at the top and still packed inside seven points, with a2a-python edging up a point. Fitting, given the week: the A2A spec itself drew documentation-drift bug reports upstream — the reference tier is mature enough that people now argue about its footnotes.',
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
          W28 · Identity is table stakes. The contested layer is proof.
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
            It was a quiet week on the surface — no protocol launched, no board lurched — and underneath it the
            agent economy kept working on the same problem it has been circling for a month:{' '}
            <span className="text-white/85">not whether agents can pay or prove who they are, but whether you can
            verify what they actually did.</span> Identity is settled infrastructure now. The contested layer this
            week was <em>proof</em> — reputation, receipts, adjudication — and nearly every thread that got traction
            was some builder trying to nail a piece of it down.
          </p>
          <p>
            You could watch it accrete. ERC-8004 kept shifting from &ldquo;register an identity&rdquo; to{' '}
            <span className="text-white/85">reputation as a public artifact</span>: on-chain reputation leaderboards
            with verified-feedback counts, and framing of ERC-8004 as the review standard for paid x402 endpoints.
            Builders shipped <span className="text-white/85">execution receipts</span> — a github-signed, publicly
            logged proof that a given agent skill-run actually happened, so you can pay for verified work rather than
            claimed work. Tools themselves became things agents <em>discover and pay for</em> without a human in the
            loop, via on-chain tool registries. And the A2A spec drew a run of bug reports for documentation that no
            longer matches its own proto — the unglamorous signal that a protocol is real enough to argue about. The
            shape under all of it: once anyone can pay and anyone can prove identity, the only thing left worth
            selling is proof of conduct.
          </p>
          <p>
            Our contribution to the proof conversation this week wasn&apos;t another primitive — it was a lesson in{' '}
            <span className="text-white/85">reading proof honestly</span>. Two numbers on our own Ghost Index sit at
            the extremes: the MCP-server category reads <span className="text-white/85">100% alive</span>, the
            tokenized category reads <span className="text-white/85">0% alive</span>. Read naively, that says MCP
            servers are flawless and tokenized agents are all dead. Both readings are wrong, and wrong for the same
            reason — each is a fact about our instrument, not about those agents. The 100% is a{' '}
            <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              selection effect
            </Link>: we only ever indexed MCP servers that already had corroboration — stars, multi-registry
            presence, recent commits — the very signals that also predict staying alive, so of course the ones we
            index are alive. The 0% is the opposite failure: tokenized agents live on-chain, and our liveness probe
            still only listens for an HTTP endpoint, so it hears silence and prints a zero. We{' '}
            <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              wrote the whole thing up
            </Link>{' '}this week, including the three signals that get a server into the ranked set.
          </p>
          <p>
            That is the discipline in one week: a 100% we distrust and a 0% we distrust, for symmetric reasons — and
            a public note explaining why, because an index selling proof to others has no business laundering its
            own. We spent the rest of the week on plumbing that makes the numbers more honest, not louder: we{' '}
            <span className="text-white/85">hardened our Virtuals ingestion so the index cleanly tracks the full
            57,606-agent set</span> (it had been silently truncating as that dataset grew past 38,000), and we{' '}
            <span className="text-white/85">corrected our headline evidence-ranked count to 145</span>, removing a
            double-count that had quietly inflated it. Neither is glamorous. Both are the job.
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
                score reflects our sampling, not the MCP ecosystem. As we widen coverage into the long tail of
                public registries, we expect this number to <em>fall</em>, and that will be the instrument getting
                more honest, not the ecosystem getting worse.
              </p>
              <p>
                <span className="text-white/75">Tokenized at 0%</span> is the opposite failure — an instrument gap,
                not dormancy. Those agents live on-chain; our probe still only checks HTTP. Service sat in exactly
                this state three weeks ago (0% → 93.9% once we wired in the right signal), and tokenized is next on
                that list. The full argument for the 100% —{' '}
                <Link href="/blog/mcp-coverage" className="text-white/75 hover:text-white underline underline-offset-2">the selection effect behind our MCP coverage</Link>{' '}
                — went up this week. Neither number is a verdict on those agents; both are honest readings of where
                our measurement is strong and where it is still blind.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">Reputation became a public artifact, and execution grew receipts.</span>{' '}
              The week&apos;s clearest theme was ERC-8004 graduating from identity to reputation: on-chain
              reputation leaderboards with verified-feedback tallies, and repeated framing of ERC-8004 as the review
              standard for paid x402 endpoints. Alongside it, builders shipped proof-of-execution — a
              github-signed, publicly logged attestation that a specific agent skill-run actually happened, so
              payment can be gated on verified work rather than claimed work. It is the same instinct we build on:
              identity tells you <em>who</em>; the contested, valuable layer is proving <em>what they did</em>.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Tools turned into things agents discover and pay for — no human in the loop.</span>{' '}
              A well-explained Farcaster thread walked through OpenSea&apos;s on-chain tool registry (ERC-8257):
              agents find a tool, pay for it, and invoke it without an approval prompt — effectively the MCP idea
              pushed on-chain. The MCP registry itself kept filling under the surface (new server submissions
              landing through the week), and a security-certification proposal surfaced upstream. The connective
              tissue of the agent economy is quietly becoming machine-navigable end to end; our own MCP board still
              leads on that surface.
            </p>
            <p>
              <span className="text-white/80 font-semibold">A2A started arguing about its own footnotes.</span>{' '}
              The most concrete upstream signal was mundane in the way maturity is mundane: two documentation-drift
              bug reports against the A2A spec — streaming event names and an Agent Card <span className="font-mono text-[13px] text-white/70">security</span>{' '}
              field that the docs still describe but the proto no longer defines — plus a proposal to anchor Agent
              Card signing keys in DNSSEC (a DANE-style binding). The last A2A release is 44 days stale, yet people
              are filing precise bugs against its letter. That is what a protocol looks like after it becomes real
              enough to build against. On our Service board, the A2A family still holds four of five seats.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Scale kept arriving on exactly the surface where our instrument is blind.</span>{' '}
              Robinhood Chain&apos;s mainnet week accelerated tokenized-agent launches, and the ecosystem traded
              ever-larger x402 volume claims. Our own index now tracks <span className="text-white/75">57,606
              Virtuals-listed agents</span> — a set that grew fast enough this week to break our ingestion until we
              hardened it — and reads 0% liveness across all of them, because those agents live in token transfers
              and on-chain calls our HTTP probe never hears. The scale is real; our measurement of its liveness is
              the gap we keep flagging, on the record, until we close it the way we closed Service.
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
              { label: 'Evidence-ranked (corrected)', value: '145' },
              { label: 'Virtuals agents tracked', value: '57,606' },
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
              <Link href="/blog/mcp-coverage" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">Published the MCP coverage writeup</Link>{' '}
              — why our MCP category reads 100% alive (a selection effect, not an infrastructure story), why we
              expect that number to fall as coverage widens, and the three signals that get a server into the ranked
              set
            </li>
            <li>
              <span className="text-white/80">Hardened Virtuals ingestion</span> — the index now cleanly tracks the
              full <span className="font-mono text-[13px]">57,606</span>-agent Virtuals set; the sync had been
              silently truncating as the dataset grew past ~38,000 rows, so tokenized coverage is whole again
            </li>
            <li>
              <span className="text-white/80">Corrected the headline evidence-ranked count</span> — now{' '}
              <span className="font-mono text-[13px]">145</span>, using a single direct tier count instead of summing
              per-category views, which had double-counted agents ranked in more than one category
            </li>
            <li>
              <span className="text-white/80">Kept the tokenized 0% flagged</span> — queued for the same instrument
              fix that took Service from 0% to 93.9%; the number stays honest and marked until the on-chain liveness
              signal lands
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            A quiet week, spent on the right thing. The agent economy has stopped asking whether agents can pay or
            prove who they are, and started asking whether you can prove what they did — reputation, receipts,
            adjudication. That is a market for proof, and a market for proof only works if the instruments are
            honest about their own blind spots. This week ours are marked with an asterisk, on purpose: a 100% we
            distrust, a 0% we distrust, and the plumbing underneath quietly made more accurate. The boards will move
            again — they always do. Until then, audit us; that&apos;s the product.
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
