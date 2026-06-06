import Link from 'next/link'

export const metadata = {
  title: 'W22 · May 25–31, 2026 — AgentCrush Weekly',
  description: 'AgentCrush weekly signal digest for W22 2026. Methodology hardening + Agent Payments Stack through the LLM Gateway.',
  alternates: {
    canonical: 'https://agentcrush.xyz/weekly/2026-W22',
    types: { 'application/rss+xml': 'https://agentcrush.xyz/weekly.xml' },
  },
  openGraph: {
    title: 'AgentCrush Weekly · W22 2026',
    description: 'Methodology hardening + Agent Payments Stack through the LLM Gateway — week of May 25–31, 2026.',
    url: 'https://agentcrush.xyz/weekly/2026-W22',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/weekly/W22_cover.png', width: 1731, height: 909, alt: 'AgentCrush Weekly Digest — W22, May 25–31, 2026' }],
    type: 'article',
    publishedTime: '2026-05-31T00:00:00.000Z',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Weekly · W22 2026',
    description: 'Methodology hardening + Agent Payments Stack through the LLM Gateway.',
    images: ['https://agentcrush.xyz/weekly/W22_cover.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'AgentCrush Weekly W22 · May 25–31, 2026',
  description: 'Weekly signal digest: confidence tiers across all four categories, risk-flag infrastructure, and the Agent Payments Stack pushed through the LLM Gateway.',
  url: 'https://agentcrush.xyz/weekly/2026-W22',
  image: 'https://agentcrush.xyz/weekly/W22_cover.png',
  datePublished: '2026-05-31T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  isPartOf: { '@type': 'WebPage', name: 'AgentCrush Weekly', url: 'https://agentcrush.xyz/weekly' },
}

// Standings as of W22 close (verified end-of-week, sourced from public
// /api/rankings/*/llm-summary endpoints).
const MODEL_FAMILIES = [
  { rank: 1, name: 'Qwen', score: 83 },
  { rank: 2, name: 'Gemini', score: 82 },
  { rank: 3, name: 'Mistral AI', score: 74 },
  { rank: 4, name: 'DeepSeek', score: 74 },
  { rank: 5, name: 'Llama', score: 70 },
  { rank: 6, name: 'Cohere', score: 53 },
  { rank: 7, name: 'Hermes', score: 34 },
]

const APS_TOP = [
  { rank: 1, name: 'Coinbase', layers: 5, score: 18 },
  { rank: 2, name: 'Stripe', layers: 5, score: 18 },
  { rank: 3, name: 'Circle', layers: 4, score: 13 },
  { rank: 4, name: 'Google AP2', layers: 2, score: 9 },
  { rank: 5, name: 'Brex', layers: 2, score: 8 },
]

export default function W22Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/weekly" className="hover:text-white/50 transition-colors">Weekly</Link>
          <span className="mx-2 text-white/15">/</span>
          W22 · May 25–31, 2026
        </p>

        {/* Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/weekly/W22_cover.png"
          alt="AgentCrush Weekly Digest — W22, May 25–31, 2026"
          width={1731}
          height={909}
          className="w-full rounded-xl border border-white/[0.08] mb-8"
        />

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/70 mb-2">
          Weekly Digest
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
          W22 · May 25–31, 2026
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-mono text-white/30">
          <span>Published May 31, 2026</span>
          <span className="text-white/15">·</span>
          <a href="/weekly.xml" className="text-[#00d4ff]/50 hover:text-[#00d4ff] transition-colors">RSS</a>
          <span className="text-white/15">·</span>
          <Link href="/weekly/2026-W22/json" className="text-violet-400/50 hover:text-violet-300 transition-colors">JSON</Link>
        </div>

        <hr className="my-8 border-white/[0.06]" />

        {/* Editorial */}
        <div className="space-y-5 text-[15px] text-white/65 leading-[1.75] mb-10">
          <p>
            If W21 was four rankings side by side, W22 was the week we made them defensible — and
            pushed the newest one through the LLM Gateway so AI agents can actually read it. The index
            covers <span className="text-white/85">1,339 indexed agents</span>, of which{' '}
            <span className="text-white/85">105 are evidence-ranked</span> across the four categories.
            The headcount tightened from W21 as new risk-flag filters activated; surviving entries carry
            more signal density per name.
          </p>
          <p>
            Two threads landed. First, <span className="text-white/85">confidence tiers</span> shipped across
            all four categories — every ranked agent now grades{' '}
            <span className="text-white/75">high / medium / low / provisional</span> based on the fraction of
            available signals it actually covers. The principle from W21 is now universal: a score and its
            certainty travel together. Second, the{' '}
            <Link href="/rankings/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">Agent Payments Stack</Link>{' '}
            got its full LLM Gateway treatment — a dedicated{' '}
            <span className="font-mono text-white/75">/api/rankings/agent-payments-stack/llm-summary</span>{' '}
            endpoint, a{' '}
            <Link href="/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">canonical answer page</Link>,{' '}
            and{' '}
            <Link href="/blog/agent-payments-stack-live" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">a blog post</Link>{' '}
            explaining why Coinbase and Stripe are the only two projects spanning five of six layers.
          </p>
          <p>
            We also wired up <span className="text-white/85">weekly_delta</span> — every agent now carries
            its seven-day rank change, computed nightly. The first real movement data lands in W23. From
            next week onwards, &ldquo;biggest moves&rdquo; in this digest will be computed, not curated.
          </p>
        </div>

        {/* Where the rankings stand */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Where the rankings stand</h2>

          {/* Model families — full standings */}
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

          {/* Category leaders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { category: 'Tokenized', color: '#39ff14', leader: 'AIXBT', score: 79, href: '/rankings/tokenized-agents', meta: '16 ranked · v1.1' },
              { category: 'Service', color: '#f0a500', leader: 'A2A', score: 77, href: '/rankings/service-agents', meta: '28 ranked · v1.1' },
              { category: 'Developer', color: '#00d4ff', leader: '54 evidence-ranked', score: null, href: '/rankings', meta: '1,289 tracked · v2.c' },
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
            Standings at W22 close. Every figure is live at the public{' '}
            <span className="font-mono">/api/rankings/*/llm-summary</span> endpoints. Scores shift as
            upstream signals (HuggingFace, LMArena, on-chain) refresh.
          </p>
        </section>

        {/* Agent Payments Stack — new featured ranking */}
        <section className="mb-10">
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4"
               style={{ borderLeftColor: '#00d4ff', borderLeftWidth: 2 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-mono font-semibold text-[#00d4ff]">Agent Payments Stack — top 5</p>
              <Link href="/rankings/agent-payments-stack" className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">v1.0-aps · full ranking →</Link>
            </div>
            <div className="space-y-1.5">
              {APS_TOP.map(({ rank, name, layers, score }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <span className="text-white/30 font-mono w-5 text-right">{rank}</span>
                  <span className="text-white/75 flex-1">{name}</span>
                  <span className="text-white/40 font-mono text-xs">{layers}/6 layers</span>
                  <span className="text-white/85 font-mono font-semibold w-10 text-right">{score}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
              Six-layer map of agent payments. Only Coinbase and Stripe span five layers; everyone else
              specializes. The full ranking covers 38 projects.
            </p>
          </div>
        </section>

        {/* Signal highlights */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Signal highlights</h2>
          <div className="space-y-4 text-sm text-white/55 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">Confidence tiers extended to every category.</span>{' '}
              Model families already had it. W22 added wrapper views for tokenized, service, and developer —
              each exposing a <span className="font-mono text-white/75">confidence_tier</span> column on top
              of the base score. Tokenized agents broadly grade high (six-signal coverage); service grades
              medium because adoption + recency + protocol breadth don&apos;t always co-occur; developer grades
              vary widely with active-weight density.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Risk flags shipped.</span>{' '}
              A unified <span className="font-mono text-white/75">agent_risk_flags_v1</span> view layers two
              concrete checks: <span className="text-white/75">concentration_risk</span> for tokenized
              agents whose top-10 holders exceed 80% of supply, and{' '}
              <span className="text-white/75">dormancy_risk</span> for developer agents with no GitHub push
              activity in 90+ days. Sybil and volume-anomaly checks are stubbed pending the right signal
              feeds.
            </p>
            <p>
              <span className="text-white/80 font-semibold">The LLM Gateway now covers all five categories.</span>{' '}
              Adding the Agent Payments Stack endpoint completed the set: an AI agent reading{' '}
              <span className="font-mono">agentcrush.xyz/llms-full.txt</span> can now find a canonical
              summary of every category we rank, in JSON, with methodology version + source URLs attached.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Methodology page got changelogs.</span>{' '}
              Each category section now carries its own version history — five entries deep — so anyone
              auditing a score can see when (and why) the methodology behind it changed.
            </p>
          </div>
        </section>

        {/* Data */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">This week in data</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Agents indexed', value: '1,339' },
              { label: 'Evidence-ranked', value: '105' },
              { label: 'LLM Gateway endpoints', value: '6' },
              { label: 'APS projects tracked', value: '38' },
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
              <span className="text-white/80">/api/rankings/agent-payments-stack/llm-summary</span> — dedicated
              LLM-Gateway endpoint with full methodology disclosure
            </li>
            <li>
              <Link href="/agent-payments-stack" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">
                /agent-payments-stack
              </Link>{' '}
              canonical answer page — TechArticle JSON-LD, six-layer explainer, for-LLMs box
            </li>
            <li>
              <Link href="/blog/agent-payments-stack-live" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">
                Blog: Agent Payments Stack live
              </Link>{' '}
              — Coinbase + Stripe at 5/6, governance hardest, XRPL added
            </li>
            <li>
              Confidence-tier wrappers for tokenized · service · developer categories
            </li>
            <li>
              Risk flags v1 — concentration_risk (tokenized) + dormancy_risk (developer), unified view
            </li>
            <li>
              <span className="text-white/75">weekly_delta</span> computation in the nightly snapshot — W23&apos;s
              movers will be data-driven
            </li>
            <li>
              <Link href="/methodology" className="text-[#00d4ff]/80 hover:text-[#00d4ff] underline underline-offset-2">/methodology</Link>{' '}
              — per-category changelog renderer + agent_payments_stack row added
            </li>
          </ul>
        </section>

        {/* Footer nav */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">Blog →</Link>
          <a href="/weekly.xml" className="hover:text-white/70 transition-colors">RSS →</a>
        </div>

      </main>
    </>
  )
}
