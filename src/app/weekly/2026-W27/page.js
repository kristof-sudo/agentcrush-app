import Link from 'next/link'

export const metadata = {
  title: 'W27 · June 29 – July 5, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W27 2026. The ecosystem asked what happens when agents disagree; we spent the week making our index auditable — one-click verification against Base, per-agent proofs, full history charts, and dead-agent alerts.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W27',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W27 2026',
    description: 'The dispute-resolution gap became the conversation; MCP turned into an ops surface; we shipped the audit trail — recompute our record against Base in your browser.',
    url: 'https://agentcrush.xyz/weekly/2026-W27',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W27_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W27, June 29 – July 5, 2026' }],
    type: 'article',
    publishedTime: '2026-07-05T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W27 2026',
    description: 'The week anyone could start auditing us: one-click verification against Base, per-agent proofs, full history on every profile, dead-agent alerts.',
    images: ['https://agentcrush.xyz/weekly/W27_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W27 · June 29 – July 5, 2026',
  description: 'Weekly signal digest: the agent economy confronts its unhappy path (disputes, refunds, arbitration), MCP matures into an operations surface, and AgentCrush ships browser-verifiable rankings, per-agent proofs, full history charts and dead-agent alerts.',
  url: 'https://agentcrush.xyz/weekly/2026-W27',
  image: 'https://agentcrush.xyz/weekly/W27_cover.png',
  datePublished: '2026-07-05T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W27 close — sourced live from /api/rankings/*/llm-summary (2026-07-05).
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
    kicker: 'A quiet week at the top — the same five, in the same order, within a point of last week. The stability itself is signal: on the tightest board we track, nobody shipped enough to move.',
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
    kicker: 'Unchanged, and Qwen still holds the highest score anywhere on the index. Open-weight families keep four of five seats — distribution over brand, week after week.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 80 },
      { rank: 2, name: 'Ribbita', score: 73 },
      { rank: 3, name: 'G.A.M.E', score: 65 },
      { rank: 4, name: 'Luna',    score: 65 },
      { rank: 5, name: 'Vader',   score: 61 },
    ],
    kicker: 'Ribbita gained two points and Luna caught G.A.M.E for third — the market-driven board did its weekly shuffle while the liveness column stayed our flagged blind spot (0%, honestly marked below).',
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
    kicker: 'The protocol-plumbing tier keeps tightening: a2a-python jumped to second and the whole board now sits within seven points — reference implementations are becoming real tools.',
  },
]

// Live category liveness from /api/ghost-index/v1 (computed 2026-07-04 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 47,  total: 49,   pct: '95.9%', tone: 'text-emerald-300/80', flag: false },
  { cat: 'Developer',      alive: 748, total: 1308, pct: '57.2%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W27Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W27 · June 29 – July 5, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W27_cover.png"
          alt="AgentCrush Weekly Digest — W27, June 29 – July 5, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W27 · The week anyone could start auditing us
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>June 29 – July 5, 2026 · Published July 5</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The question of the week arrived in one line: <span className="text-white/85">&ldquo;what happens when
            two agents disagree?&rdquo;</span> The stack that dominated June&apos;s conversation — x402 for payment,
            ERC-8004 for identity, A2A for coordination — is a happy-path stack. It moves money, names
            counterparties, passes messages. What it cannot yet do is handle the unhappy path: a refund dispute, a
            job one side calls done and the other calls broken, an agent that takes payment and goes silent. Thread
            after thread this week circled the same missing layer, and the phrase that stuck was
            <span className="text-white/85"> arbitration</span>. Our read is one step more basic: before anyone can
            arbitrate anything, both sides need a record neither of them can rewrite. Evidence precedes judgment.
          </p>
          <p>
            So we spent the week building the evidence layer out in public. The daily Merkle anchor on Base has been
            running since late June; what was missing was the ability for <em>you</em> to check it without trusting
            us. Now there&apos;s a{' '}
            <Link href="/oracle" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              one-click verifier
            </Link>{' '}
            that recomputes the full daily record in your browser and compares it against the root on Base — plus an
            independent script you can run without touching our site at all, and{' '}
            <Link href="/api/verify/agent/crewai" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              per-agent proofs
            </Link>{' '}
            that show any single agent&apos;s daily rank is part of what was committed on-chain. The claim is
            deliberately narrow and checkable: we cannot quietly rewrite our own history. Run the script; if the
            roots ever diverge, you&apos;ve caught us.
          </p>
          <p>
            The same week, the index grew a time dimension. Every agent profile now carries its{' '}
            <span className="text-white/85">full recorded history</span> — daily rank, score and liveness since we
            began tracking it, every point of it anchored — and a{' '}
            <Link href="/watchlist" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">
              watchlist
            </Link>{' '}
            that turns the index from a thing you visit into a thing that tells you when something you depend on
            goes dark: star your stack, get signed webhook alerts for deaths, resurrections and rank moves. No
            account — the URL is the subscription. And for the moment a machine needs the answer before money
            moves, the MCP server gained a free{' '}
            <span className="font-mono text-[13px] text-white/70">verify_counterparty</span> tool: proceed, caution
            or reject, liveness-aware, with machine-readable reasons.
          </p>
          <p>
            One honest note from our own unhappy path: a credential rotation in late June silently broke the x402
            payment gate for about three days — every paid endpoint returned errors instead of price quotes. We
            found it in the telemetry, fixed it within hours of diagnosis, and the daily health check now probes the
            paywall so that class of failure can&apos;t hide again. An index that publishes other people&apos;s
            downtime should publish its own.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W27 close.
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
            Standings at W27 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 58.7% — flat, and now watchable</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">58.7%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">820 alive · 577 ghosts · 1,397 indexed · −0.1 / 7d</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life. A flat week —
                and with the new <Link href="/ghost-report" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">Ghost Report</Link>,
                the dark side of the index now has names.
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
                The week&apos;s liveness story wasn&apos;t the average — it was the roll call. The{' '}
                <Link href="/ghost-report" className="text-white/75 hover:text-white underline underline-offset-2">Ghost Report</Link>{' '}
                now lists the most-starred agent repos with no public signal in 90+ days: 43 famous names carrying
                roughly 404,000 combined GitHub stars, silent. Stars never decay; liveness does. That gap — past
                hype against present silence — is the most shareable number we publish, and every figure in it is
                recomputable from the anchored record.
              </p>
              <p className="text-white/40">
                <span className="text-white/55">* Tokenized still reads 0%, and the flag stays on.</span>{' '}
                AIXBT and the tokenized leaders are demonstrably active; the zero is our instrument&apos;s blind
                spot, not their dormancy. Service was in this exact state three weeks ago and is now at 95.9% —
                tokenized is next on the instrumentation list. We&apos;d rather show the gap than launder it.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">The unhappy path became the conversation.</span>{' '}
              The most-engaged threads of the week all circled the same gap: x402 moves money, ERC-8004 names the
              counterparty, A2A passes the messages — and none of them can handle a dispute. Refunds, disagreements
              over whether work was delivered, agents that take payment and vanish: the ecosystem named its missing
              arbitration layer this week. Our position is that arbitration needs evidence first — records neither
              party can rewrite — which is exactly the layer we ship.
            </p>
            <p>
              <span className="text-white/80 font-semibold">MCP grew up into an operations surface.</span>{' '}
              The week&apos;s MCP news wasn&apos;t connectivity, it was ops: mcprobe launched as an auditor for
              agent↔server connections (the week&apos;s most-engaged builder post), monitoring services began
              scoring x402 endpoints over 30-day windows, and Apify announced 20,000+ web-automation tools heading
              to x402 on Base. When a protocol gets linters, uptime monitors and marketplaces, it has stopped being
              an experiment.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The rails keep commoditizing beneath the stack.</span>{' '}
              Cloudflare&apos;s monetization gateway is shipping with x402 support, and BNB Chain launched an Agent
              Studio with AWS that bakes ERC-8004 identity in at creation. Payment and identity are becoming
              defaults you inherit rather than layers you choose — which keeps pushing the differentiating question
              up the stack, to the one the week kept asking: can you prove what your counterparty did?
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,397' },
              { label: 'Ghost Index liveness', value: '58.7%' },
              { label: 'Famous agents gone dark', value: '43' },
              { label: 'Their combined GitHub stars', value: '404k' },
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
              <Link href="/oracle" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">One-click verification</Link>{' '}
              — recompute our full daily record in your browser and compare it against the root anchored on Base;
              plus an independent script that verifies us without touching our site
            </li>
            <li>
              <span className="text-white/80">Per-agent proofs</span> — any single agent&apos;s daily rank now comes
              with a Merkle inclusion proof against the on-chain root, at{' '}
              <span className="font-mono text-[13px]">/api/verify/agent/&#123;handle&#125;</span>
            </li>
            <li>
              <span className="text-white/80">Full history on every profile</span> — the complete recorded life of
              each agent (daily rank, score, liveness), charted, with every point anchored
            </li>
            <li>
              <Link href="/ghost-report" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">The Ghost Report</Link>{' '}
              — the most-starred agent repos with no public signal in 90+ days: 43 names, ~404k combined stars,
              honestly framed (dark ≠ dead)
            </li>
            <li>
              <Link href="/watchlist" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Watchlist + dead-agent alerts</Link>{' '}
              — star the agents you depend on; get signed webhook or RSS alerts when one dies, resurrects or moves.
              Accountless — the URL is the subscription
            </li>
            <li>
              <span className="text-white/80">verify_counterparty</span> — a free MCP tool answering the
              pre-transaction question (proceed / caution / reject, liveness-aware, machine-readable reasons);
              verdict thresholds recalibrated against live score distributions the same week
            </li>
            <li>
              <span className="text-white/80">/explore rebuilt</span> — the full-index browser is ~70% lighter and
              defaults to the evidence-ranked view
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            The pattern under the week: the agent economy discovered its unhappy path, and the unhappy path runs on
            evidence. Disputes need records; records need to be unrewritable; unrewritable needs to be checkable by
            the other side, not just asserted. That&apos;s the week we shipped — a verifier anyone can click, proofs
            any agent can fetch, history no one can quietly edit, and alerts for the moment something you depend on
            goes quiet. Including, on the record above, the three days our own paywall was down. Audit us; that&apos;s
            the product.
          </p>
        </div>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/oracle" className="hover:text-white/70 transition-colors">Verify →</Link>
          <Link href="/ghost-report" className="hover:text-white/70 transition-colors">Ghost Report →</Link>
          <Link href="/watchlist" className="hover:text-white/70 transition-colors">Watchlist →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
