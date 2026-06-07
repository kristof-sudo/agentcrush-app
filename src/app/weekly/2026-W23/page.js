import Link from 'next/link'

export const metadata = {
  title: 'W23 · June 2–8, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W23 2026. MCP Server Index launches as the 5th category ranking — plus ERC-8004 trust tooling consolidates and the autonomous pipeline goes live.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W23',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W23 2026',
    description: 'MCP Server Index: the 5th category ranking is live. ERC-8004 trust tooling consolidates. Autonomous pipeline ships.',
    url: 'https://agentcrush.xyz/weekly/2026-W23',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W23_cover.png', width: 1734, height: 907, alt: 'AgentCrush Weekly Digest — W23, June 2–8, 2026' }],
    type: 'article',
    publishedTime: '2026-06-08T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W23 2026',
    description: 'MCP Server Index: the 5th category ranking is live. ERC-8004 trust tooling consolidates.',
    images: ['https://agentcrush.xyz/weekly/W23_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W23 · June 2–8, 2026',
  description: 'Weekly signal digest: MCP Server Index as a 5th category ranking, ERC-8004 trust layer tooling consolidation, autonomous pipeline deployment.',
  url: 'https://agentcrush.xyz/weekly/2026-W23',
  image: 'https://agentcrush.xyz/weekly/W23_cover.png',
  datePublished: '2026-06-08T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings at W23 close — sourced from /api/rankings/*/llm-summary
const MODEL_FAMILIES = [
  { rank: 1, name: 'Qwen',       score: 83 },
  { rank: 2, name: 'Gemini',     score: 82 },
  { rank: 3, name: 'Mistral AI', score: 74 },
  { rank: 4, name: 'DeepSeek',   score: 74 },
  { rank: 5, name: 'Llama',      score: 70 },
  { rank: 6, name: 'Cohere',     score: 53 },
  { rank: 7, name: 'Hermes',     score: 34 },
]

const MCP_TOP5 = [
  { rank: 1, name: 'GitHub MCP',            tools: 25, score: 28.8 },
  { rank: 2, name: 'AgentCrush MCP',        tools: 12, score: 22.0 },
  { rank: 3, name: 'Stripe Agent Toolkit',  tools: 20, score: 20.7 },
  { rank: 4, name: 'Filesystem MCP',        tools: 8,  score: 18.7 },
  { rank: 5, name: 'Puppeteer MCP',         tools: 7,  score: 17.8 },
]

export default function W23Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W23 · June 2–8, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W23_cover.png"
          alt="AgentCrush Weekly Digest — W23, June 2–8, 2026"
          width={1734}
          height={907}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W23 · June 2–8, 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published June 8, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
          <span className="text-white/15">·</span>
          <Link href="/weekly/2026-W23/json" className="text-violet-400/50 hover:text-violet-300 transition-colors">JSON</Link>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            W23 was the week the index became five categories. The{' '}
            <Link href="/rankings/mcp-servers" className="text-orange-400/80 hover:text-orange-300 underline underline-offset-2">
              MCP Server Rankings
            </Link>{' '}
            launched as the first new top-level category since the index opened — scored on tools,
            registry listings, transport coverage, and GitHub signal. GitHub MCP leads at 28.8;
            the official Anthropic reference servers hold the middle tier; the infrastructure layer
            is now trackable as a first-class surface.
          </p>
          <p>
            The ecosystem signal this week was the ERC-8004 trust layer tooling arriving all at once.
            The registry crossed <span className="text-white/85">~1,146 registered agents</span>, and
            within 48 hours three independent tooling projects shipped to answer the same question: which
            of these agents should you actually trust? Boon Protocol (voting), Argus (reputation scoring),
            and avisradar (oracle). When the directory hits noise saturation, the tooling layer arrives.
            We&apos;ve been tracking this pattern — it&apos;s the same one Virtuals and Agentverse went through.
          </p>
          <p>
            On the infrastructure side: the autonomous pipeline went live this week. Daily briefs,
            decision card, approval queue, trust-fall posting, and engagement executor are all running
            on timers. The index is now self-operating six days a week — briefs at 03:30 UTC, decisions
            at 04:00, execution at 07:00, trust-fall at 07:30, engagement at 07:45, midday check at 11:00.
          </p>
        </div>

        {/* Rankings */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Where the rankings stand</h2>

          {/* MCP — featured new category */}
          <div className="rounded-lg border border-orange-400/20 bg-gradient-to-br from-orange-400/[0.04] to-transparent px-4 py-4 mb-3"
               style={{ borderLeftColor: '#f97316', borderLeftWidth: 2 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono font-semibold text-orange-400">MCP Servers</p>
                <span className="text-[10px] font-mono bg-orange-400/10 text-orange-300/70 px-1.5 py-0.5 rounded">NEW W23</span>
              </div>
              <Link href="/rankings/mcp-servers" className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">v1.0-mcp · full ranking →</Link>
            </div>
            <div className="space-y-1.5 mb-3">
              {MCP_TOP5.map(({ rank, name, tools, score }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <span className="text-white/30 font-mono w-5 text-right">{rank}</span>
                  <span className="text-white/75 flex-1">{name}</span>
                  <span className="text-white/40 font-mono text-xs">{tools} tools</span>
                  <span className="text-orange-300/80 font-mono font-semibold w-10 text-right">{score}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/25 leading-relaxed">
              Scored on: GitHub stars 30% · tool_count 25% · registry listings 20% · forks 15% · followers 10%.
              15 servers seeded at launch. Submit yours via the index page.
            </p>
          </div>

          {/* Model families */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4 mb-3"
               style={{ borderLeftColor: '#a78bfa', borderLeftWidth: 2 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono font-semibold" style={{ color: '#a78bfa' }}>Model Families</p>
              <Link href="/rankings/model-families" className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">v1.4 · full ranking →</Link>
            </div>
            <div className="space-y-1.5">
              {MODEL_FAMILIES.map(({ rank, name, score }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <span className="text-white/30 font-mono w-5 text-right">{rank}</span>
                  <span className="text-white/75 flex-1">{name}</span>
                  <span className="text-white/85 font-mono font-semibold">{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Other categories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { category: 'Tokenized',  color: '#39ff14', leader: 'AIXBT',           score: 79,   href: '/rankings/tokenized-agents',   meta: '16 ranked · v1.1' },
              { category: 'Service',    color: '#f0a500', leader: 'A2A',             score: 77,   href: '/rankings/service-agents',     meta: '28 ranked · v1.1' },
              { category: 'Developer',  color: '#00d4ff', leader: '54 evidence-ranked', score: null, href: '/rankings',              meta: '1,289 tracked · v2.c' },
            ].map(({ category, color, leader, score, href, meta }) => (
              <Link key={category} href={href}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    style={{ borderLeftColor: color, borderLeftWidth: 2 }}>
                <p className="text-xs font-mono font-semibold mb-1" style={{ color }}>{category}</p>
                <p className="text-sm text-white/75">
                  {leader}{score != null && <span className="text-white/85 font-mono font-semibold"> · {score}</span>}
                </p>
                <p className="text-[10px] text-white/30 mt-1 font-mono">{meta}</p>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
            Standings at W23 close. Live at{' '}
            <span className="font-mono">/api/rankings/*/llm-summary</span>.
          </p>
        </section>

        {/* Ecosystem signals */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">ERC-8004 trust layer tooling arrived in a cluster.</span>{' '}
              Three independent projects launched within 48 hours of each other:{' '}
              <span className="text-white/75">Boon Protocol</span> (community-voted reputation via $BOON burns),{' '}
              <span className="text-white/75">Argus</span> (multi-dimensional on-chain scoring oracle, 200K+ agent
              registry problem → filtered signal), and{' '}
              <span className="text-white/75">avisradar</span> (405 agents queryable via reputation oracle).
              Plus AgentAudit targeting EU AI Act compliance for on-chain agents. The registry saturation
              problem is being solved by the market in real time.
            </p>
            <p>
              <span className="text-white/80 font-semibold">MCP is consolidating as the interface standard faster than the model layer.</span>{' '}
              Coinbase shipped Base MCP this week — the third major blockchain MCP integration of 2026. An
              ecosystem-wide survey cited 88% of orgs experimenting with agents but only 10% scaling; the
              bottleneck identified was orchestration, and MCP adoption was up 35% year-over-year. The
              interface layer is moving faster than either the model or framework layers.
            </p>
            <p>
              <span className="text-white/80 font-semibold">x402 volume routing is shifting from theoretical to production.</span>{' '}
              Canvas shipped an autonomous UI prototype with x402 payments. Michaelgent and Clarabotagent on
              The Graph Network are paying autonomously on-chain in production. Agent Realm&apos;s 6-figure x402
              curve and Travala&apos;s hotel-booking agent integration moved the conversation from &ldquo;endpoints exist&rdquo;
              to &ldquo;agents are routing volume.&rdquo; Cross-chain expansion (Base, Solana, XRPL) removed the
              single-chain friction.
            </p>
            <p>
              <span className="text-white/80 font-semibold">A2A protocol hit 150+ orgs in production.</span>{' '}
              Google, Microsoft, and AWS are all running A2A in production deployments. The MCP vs A2A framing
              that emerged this week — &ldquo;MCP for tools, A2A for teamwork&rdquo; — is the cleanest summary of how
              the agent interface layer is splitting. A London hackathon is scheduled June 13.
            </p>
          </div>
        </section>

        {/* Data bar */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Categories ranked', value: '5' },
              { label: 'MCP servers seeded', value: '15' },
              { label: 'ERC-8004 trust tools', value: '4' },
              { label: 'Autonomous timers live', value: '8' },
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
              <Link href="/rankings/mcp-servers" className="text-orange-400/80 hover:text-orange-300 underline underline-offset-2">
                /rankings/mcp-servers
              </Link>{' '}
              — MCP Server Index, the 5th category ranking (v1.0-mcp scoring formula)
            </li>
            <li>
              <span className="text-white/80">mcp_server_metadata table</span> — tool_count,
              transport_types, registry_listings, npx_install per server
            </li>
            <li>
              <span className="text-white/80">agent_score_mcp_server_v1 view</span> — live scoring
              across 5 signals, query via{' '}
              <span className="font-mono text-white/75">/api/mcp/v1?method=get_category_ranking&amp;category=mcp_server</span>
            </li>
            <li>
              <Link href="/api/agents/dataset" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">
                /api/agents/dataset
              </Link>{' '}
              — bulk dataset endpoint (JSON / JSONL / CSV) for all 5 categories, CORS-open
            </li>
            <li>
              Autonomous pipeline — 8 systemd timers on VPS (brief, decision card ×2, executor ×2,
              trust-fall, engagement, midday check)
            </li>
            <li>
              Trust-fall lane — autonomous X posts for tightly-scoped events (rank movers ≥+5,
              weekly digest, new evidence-ranked), deduped via event_key
            </li>
            <li>
              Engagement executor — dispatches approved reply/quote/like actions from Telegram
              approval queue
            </li>
            <li>
              <span className="text-white/75">primary_category check constraint</span> extended to
              include <span className="font-mono text-white/75">&apos;mcp_server&apos;</span> — 5th valid
              category value in the agents table
            </li>
          </ul>
        </section>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/rankings/mcp-servers" className="hover:text-white/70 transition-colors">MCP Servers →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">Blog →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
