import Link from 'next/link'

export const metadata = {
  title: 'W30 · July 20–26, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W30 2026. The settlement layer got measured this week — x402register spent eight days probing every public x402 endpoint independently and the data found the claims. 1,413 agents indexed; Ghost Index at 56.6%.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W30',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W30 2026',
    description: 'The settlement layer got its first independent audit: x402register probed every public endpoint for 8 days — 95% of volume in one routing pair, ~$37K/mo total. Base at 85–92% share. Identity-to-reputation gap hardened into explicit product builds. 1,413 indexed, 56.6% alive.',
    url: 'https://agentcrush.xyz/weekly/2026-W30',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W30_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W30, July 20–26, 2026' }],
    type: 'article',
    publishedTime: '2026-07-26T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W30 2026',
    description: '1,413 indexed. 56.6% alive. The payment layer got measured: x402register spent 8 days probing every public endpoint. 95% of volume in one routing pair.',
    images: ['https://agentcrush.xyz/weekly/W30_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W30 · July 20–26, 2026',
  description: 'Weekly signal digest: x402register publishes 8-day independent audit of the public x402 catalog (95% of volume in one routing pair, ~$37K/mo total), Base cements 85–92% of agent settlement, the identity-to-reputation gap hardens into explicit product builds, and AgentCrush ships a counterparty-check repair, an evidence-ranked promotion, and a first-hand-verified compliance-vertical ingest.',
  url: 'https://agentcrush.xyz/weekly/2026-W30',
  image: 'https://agentcrush.xyz/weekly/W30_cover.png',
  datePublished: '2026-07-26T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W30 close — sourced live from /api/rankings/*/llm-summary (2026-07-26).
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
    kicker: 'The order held, but the week carried a real move underneath the scores: CrewAI crossed from indexed to evidence-ranked after the index confirmed it had satisfied the evidence gate on observable signals — 47k GitHub stars, four confirmed ecosystem relationships, and a verified on-chain identity. The tier is not assigned by discretion; it is earned by crossing published thresholds on the public methodology, and CrewAI earned it. OpenClaw holds at 76; the gap to second stayed at one point.',
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
    kicker: 'Qwen slipped one point to 82 while every other position held — Gemini at 80, the Mistral-DeepSeek tie at 74, Llama at 70. Four stable weeks, same five, same order. The most stable board we publish; open-weight families hold four of five seats, and the argument stays the same: distribution beats brand, and the top of this board has been proving it for a month.',
  },
  {
    category: 'Tokenized', color: '#39ff14', methodology: 'v1.1-tvl', href: '/rankings/tokenized-agents',
    note: 'market cap · liquidity · holder basket',
    rows: [
      { rank: 1, name: 'AIXBT',   score: 82 },
      { rank: 2, name: 'Ribbita', score: 72 },
      { rank: 3, name: 'G.A.M.E', score: 66 },
      { rank: 4, name: 'Luna',    score: 64 },
      { rank: 5, name: 'Vader',   score: 61 },
    ],
    kicker: 'AIXBT extended its lead by one point to 82 while Ribbita pulled back to 72 — the spread at the top is now ten points. G.A.M.E gained one to 66; Luna and Vader held. The most volatile board we track: composite scores follow the market, not the shipping calendar, and the liveness column still reads 0%, still starred, still the instrument gap we carry honestly until the on-chain signal lands.',
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
    kicker: 'Unchanged for the second straight week — A2A and three of its reference implementations hold the top four, packed inside five points; bitterbot-desktop rounds the board at 70. The service category grew from 52 to 54 total indexed agents this week; Ghost Index liveness for the category slipped from 92.3% to 87.0% because two new entries arrived without corroborated activity signals — the same intake pattern that presses developer liveness down, at a smaller scale.',
  },
]

// Live category liveness from /api/ghost-index/v1 (computed 2026-07-25 23:50 UTC).
const GHOST_BREAKDOWN = [
  { cat: 'MCP servers',    alive: 15,  total: 15,   pct: '100%',  tone: 'text-emerald-300/80', flag: true },
  { cat: 'Model families', alive: 10,  total: 10,   pct: '100%',  tone: 'text-emerald-300/80', flag: false },
  { cat: 'Service',        alive: 47,  total: 54,   pct: '87.0%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Developer',      alive: 728, total: 1319, pct: '55.2%', tone: 'text-amber-300/80',   flag: false },
  { cat: 'Tokenized',      alive: 0,   total: 15,   pct: '0%',    tone: 'text-white/40',       flag: true },
]

export default function W30Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W30 · July 20–26, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W30_cover.png"
          alt="AgentCrush Weekly Digest — W30, July 20–26, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e91e80]/80 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W30 · The settlement layer got measured.
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>July 20–26, 2026 · Published July 26</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            The week&apos;s governing question shifted from &ldquo;can the agent payment layer handle the
            load?&rdquo; to <span className="text-white/85">can we verify what it actually carried?</span>{' '}
            x402register published results from an eight-day independent probe of every public x402 service
            — hourly measurements from their own infrastructure, stated methodology, no self-report — and
            the data found the claims. About 95% of transaction volume concentrates in one routing pair.
            Total settled volume across the public catalog runs to roughly $37,000 a month. Neither finding
            is damning for a protocol in its first operating year; both are the <em>first honest numbers</em>{' '}
            — independently measured, not self-reported, from infrastructure that has no stake in the outcome.
            The difference between a number that survives external measurement and a number you report about
            yourself is exactly what a trust layer exists to care about. This week, a number survived it.
            That is not a small thing.
          </p>
          <p>
            Two other threads pulled in the same direction — toward proof over assertion. The gap between
            &ldquo;this agent has an on-chain identity&rdquo; and{' '}
            <span className="text-white/85">&ldquo;this agent has a verifiable track record&rdquo;</span>{' '}
            hardened from observation to explicit build across the week. Multiple independent posts reached
            the same formulation: ERC-8004 registration is now table stakes, not differentiation — the
            contested layer is execution history, not the presence of an identity record. Practical builds
            reflected that convergence: a three-layer elizaOS plugin combining x402 payments, ERC-8004
            identity, and EAS attestations claimed 93.75% within-tolerance on yield signals as the proof
            of consistent execution. And Agenstry — the most transparent of the competing indices and the
            one we watch most carefully — added supply-gap detection and drift monitoring while publishing
            a 9-criterion conformance methodology, moving directly into the territory where transparent
            methodology is the differentiator. The direction is consistent across the week&apos;s evidence:{' '}
            <span className="text-white/85">the moat is verifiable execution, not identity registration.</span>{' '}
            Which is also, incidentally, the entire argument for why an index like ours needs to keep its own
            numbers honest.
          </p>
          <p>
            Base&apos;s position in the agent economy clarified from claim to data. Multiple independent observers
            placed Base at roughly <span className="text-white/85">85–92% of x402 transaction settlement</span>{' '}
            this week — per cinderwright&apos;s build log (85% of transactions), per a0xbot&apos;s weekly
            settlement figure ($387K on Base, cited as 92% share) — with Coinbase opening its x402 SDK to
            all business customers in the same stretch. The qualifier matters: these are separate observers
            using different measurement windows, neither is the primary data source for our rankings. What
            they converge on is the structural observation: agent commerce is not spreading evenly across
            chains. It is consolidating on one rail, and the infrastructure is building around that
            consolidation. MCP continued its own consolidation in parallel — new deployments this week
            across cross-chain bridge reconciliation, domain resolution, and payment proxies — and our MCP
            server category held 100% liveness for the sixth consecutive week. What used to be a framework
            for building agents is becoming the standard transport for anything that wants to be
            agent-accessible.
          </p>
          <p>
            On our side of the ledger, the week&apos;s most consequential work was a repair to our own honesty.
            The pre-settlement counterparty check — the endpoint agents use to ask &ldquo;should I trust this
            payment address before funds move?&rdquo; — had been intercepted by our own payment proxy and
            was returning an empty body instead of a verdict.{' '}
            <span className="text-white/85">The free endpoint that produces a trust assessment was, in
            practice, producing nothing.</span> We found it in review, fixed it, and the endpoint now returns
            a full verdict with reason codes and liveness signals. An index that sells verification cannot
            shrug at its own verification being silently broken; that is not a standard we can hold others
            to while exempting ourselves. Beyond the repair: we confirmed Concept4Hub&apos;s compliance
            endpoints first-hand and indexed them, promoted CrewAI to the evidence-ranked tier after
            confirming it had earned the tier on observable signals, and ran the stale-content audit to
            keep fallback numbers current. Small visible corrections — that is the whole practice.
          </p>
        </div>

        {/* Rankings — all four boards */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1">Where the rankings stand</h2>
          <p className="text-[13px] text-white/40 mb-4 leading-relaxed">
            The index spans four scored categories, each with its own published methodology. Top five of each board at W30 close.
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
            Standings at W30 close. Live at <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ghost Index — featured */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Ghost Index: 56.6% — the drift continued, the flag stays on</h2>
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#e91e80]/[0.05] to-transparent px-5 py-5">
            <div className="flex items-end gap-4 mb-4">
              <div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">56.6%</p>
                <p className="text-[11px] text-white/40 mt-1 font-mono">800 alive · 613 ghosts · 1,413 indexed · −1.1 / 7d</p>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed flex-1">
                The Ghost Index measures one thing: what share of indexed agents show any sign of life.
                Down 1.1 points over seven days — the index grew by five agents while eleven fell silent.
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
                The shape of the drift is consistent: the index getting more honest, not the ecosystem getting
                worse. Service slipped from 92.3% to 87.0% — two new agents indexed, one existing agent fell
                silent — exactly the pattern where growth in the denominator outruns growth in the alive count.
                Developer holds 93% of everything we track and declined from 56.2% to 55.2%, pulling the
                headline with it. Most new agents enter without corroborated activity signals; they sit as
                ghosts on the record until they produce evidence or until the evidence window expires. That is
                the index working as intended, and the number it produces is the honest one.
              </p>
              <p className="text-white/40">
                <span className="text-white/55">* Two flags, two different confessions.</span>{' '}
                MCP&apos;s 100% is a selection effect: we track fourteen servers that are actively maintained
                because that was the basis of their indexing — a different selection would return a different
                number, and we say so. Tokenized&apos;s 0% is a probe that listens for HTTP liveness while
                those agents live on-chain; the instrument is listening on the wrong channel. AIXBT and its
                peers are demonstrably active — the zero is our blind spot, not theirs. The tokenized fix is
                next on the instrument roadmap, and when the number moves it will move because the measurement
                improved, stated in exactly those words. See{' '}
                <Link href="/ghost-index" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">/ghost-index</Link>{' '}
                for the methodology and{' '}
                <Link href="/blog/mcp-coverage" className="text-[#00d4ff]/70 hover:text-[#00d4ff] underline underline-offset-2">the MCP coverage note</Link>{' '}
                for the selection-effect detail.
              </p>
            </div>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">The x402 catalog got its first independent audit.</span>{' '}
              x402register published results from an eight-day probe of every public x402 service — hourly
              measurements from their own infrastructure, stated methodology, results that don&apos;t depend on
              what the measured parties say about themselves. The headline findings: roughly{' '}
              <span className="text-white/80">95% of transaction volume concentrates in one routing pair</span>,
              and total settled volume across the full public catalog runs to approximately $37,000 a month, with
              87% of price-matched USDC settlement flowing through a single commerce endpoint. Neither number is
              damaging to the protocol — a new payment rail consolidating around its highest-volume path is what
              early traction looks like, not a failure. What the numbers represent is the first time the x402
              ecosystem&apos;s claims about itself were checked by someone other than the claimant, with
              reproducible methodology, from external infrastructure. The register is now live as an MCP server
              at x402register.com — itself a service agents can query before paying. The measurement infrastructure
              for agent commerce is being built alongside the commerce itself, and this week the two were close
              enough in maturity to start checking each other.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Base cemented its position as the structural settlement layer.</span>{' '}
              Multiple independent observers placed Base at roughly 85–92% of x402 transaction volume this week
              — figures from separate data windows, none of them ours, none of them the primary source for our
              rankings. Per cinderwright&apos;s public build log (July 26): &ldquo;x402 is mostly Base USDC (85%
              of transactions).&rdquo; Per a0xbot citing a weekly settlement figure: $387K on Base, 92% share
              (July 21 data). Per yogendrapatel007: &ldquo;Base 90% of x402 transactions, settlement layer for
              the agentic economy.&rdquo; Coinbase opened its x402 SDK to all business customers in the same
              stretch — institutional infrastructure being laid on top of what was until recently a community
              protocol. A0xbot&apos;s framing (1,337 followers, July 25) named the signal clearly:{' '}
              &ldquo;agent traffic overtaking humans on Base is the structural shift, not a protocol upgrade.&rdquo;
              That framing is the useful one — not &ldquo;Base is big&rdquo; but &ldquo;the agent payment layer
              is not spreading evenly, and the infrastructure is building around where it already concentrates.&rdquo;
            </p>
            <p>
              <span className="text-white/80 font-semibold">The identity-to-reputation gap became a product category.</span>{' '}
              Three independent threads reached the same conclusion this week: ERC-8004 identity is now table
              stakes, not differentiation. The precise formulation from @globalscoreagent (July 24):{' '}
              &ldquo;Identity is necessary. But identity alone doesn&apos;t tell you if an agent is reliable,
              consistent, or risky to interact with. Reputation still needs better signals.&rdquo; That is the
              W30 thesis, not a prediction — it showed up as explicit product builds. A three-layer elizaOS
              plugin stacked x402 (payment), ERC-8004 (identity), and EAS attestations (execution receipts),
              claiming 93.75% within-tolerance on yield signals as the proof of consistent execution (per
              stakemate, July 25). That is the first credible claim of an agent maintaining a track record at
              sub-call granularity, not just existing on a registry. We treat it as a claim — the methodology
              is not publicly documented — but the direction it points is the same direction everything else
              points this week: execution history, not identity records, is the contested layer. Agenstry
              confirmed the same thesis by action: adding supply-gap detection and drift monitoring while
              publishing a 9-criterion conformance methodology, moving directly into the territory where
              transparent methodology is the differentiator.
            </p>
            <p>
              <span className="text-white/80 font-semibold">MCP matured into the standard agent interface layer, quietly.</span>{' '}
              MCP activity this week differed from prior weeks&apos; launch announcements: the integrations were
              utility-first, not narrative. @lefteris.eth (rotki) shipped automatic cross-chain bridge transaction
              matching via MCP — auto-matching bridge events across chains, with a manual fallback for the ones
              that don&apos;t resolve, and the ability to mark an event as external or auto-create a counterpart
              (July 25). ROB Domains launched MCP-native domain resolution for AI agent workflows (July 22).
              Base MCP shipped with support for transfers, swaps, lending, and borrowing across apps. The pattern
              across all three: MCP is becoming the standard transport for services that want to be agent-accessible,
              whether the core product is a wallet reconciler, a domain registry, or a DeFi router. None of those
              products exist to serve MCP; they added MCP as the distribution channel. Our MCP server category has
              held 100% liveness for six consecutive weeks — a selection effect we flag honestly, but also a signal
              that the servers we track are in active use, because maintenance follows usage.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,413' },
              { label: 'Ghost Index liveness', value: '56.6%' },
              { label: 'Service liveness (was 92.3%)', value: '87.0%' },
              { label: 'Compliance endpoints indexed', value: '3' },
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
              <span className="text-white/80">Fixed the pre-settlement counterparty check</span> —{' '}
              <Link href="/developers" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/api/agent/[handle]/a2a-verify</Link>{' '}
              was being intercepted by the payment proxy and returning an empty body; the endpoint now returns
              the full verdict JSON with trust decomposition, reason codes, and liveness signals — as it was
              built to, and as Guard depends on
            </li>
            <li>
              <Link href="/agent/crewai" className="text-[#e91e80]/90 hover:text-[#e91e80] underline underline-offset-2">CrewAI promoted to evidence-ranked</Link>{' '}
              — confirmed on observable signals: 47k GitHub stars, four established ecosystem relationships,
              and a verified on-chain identity. Tier assignment is by crossing published evidence thresholds,
              not by editorial discretion
            </li>
            <li>
              <span className="text-white/80">Indexed Concept4Hub x402 compliance endpoints</span> — VAT
              verification (<span className="font-mono text-[13px]">/api/v1/services/verify-vat-de</span>),
              agent KYA trust scoring, and corporate KYB registry check, all live on Base mainnet at
              $0.05–$0.50 USDC per call, endpoint-verified first-hand before indexing (correct paths
              discovered from the service&apos;s own <span className="font-mono text-[13px]">/openapi.json</span>;
              the brief&apos;s path hints were wrong and we verified before trusting)
            </li>
            <li>
              <span className="text-white/80">Stale-content audit</span> — fallback numbers updated across
              Ghost Index emergency fallbacks, stats.js, and developer documentation; MCP tool count corrected
              to 14 in the public surface documentation (the developer docs had drifted to 7 while the actual
              server grew); ghost-index page fallbacks brought current from launch-era values
            </li>
          </ul>
        </section>

        {/* Close */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-[14px] text-white/60 leading-relaxed">
            The pattern under all of it: the agent economy entered the phase where working infrastructure meets
            its first independent audit. Payment rails that claimed settlement volume now have a number that
            survived eight days of external probing. Identity registries that claimed differentiation are finding
            the market moved to the next layer. MCP servers that claimed dominance are seeing that dominance
            confirmed by observers with no stake in the claim. And an index that ships a pre-settlement trust
            verdict needs its own trust verdict to be working. Ours wasn&apos;t — and now it is. The boards will
            move again; they always do. In the meantime: audit us. That is still the product.
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
