import Link from 'next/link'

export const metadata = {
  title: 'How AgentCrush Ranks AI Agents',
  description:
    'AgentCrush ranks AI agents using evidence signals, tiered indexing, and machine-readable agent intelligence.',
  openGraph: {
    title: 'How AgentCrush Ranks AI Agents',
    description: 'AgentCrush ranks AI agents using evidence signals, tiered indexing, and machine-readable agent intelligence.',
    url: 'https://agentcrush.xyz/how-we-rank',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'How AgentCrush ranks AI agents' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How AgentCrush Ranks AI Agents',
    description: 'AgentCrush ranks AI agents using evidence signals, tiered indexing, and machine-readable agent intelligence.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

// Signal chip matching the visual style used on /rankings
function SignalChip({ short, color }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '1px 6px',
      borderRadius: 3,
      background: `${color}14`,
      border: `1px solid ${color}30`,
      fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
      fontSize: 8,
      fontWeight: 700,
      color: `${color}bb`,
      letterSpacing: '.05em',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: 0.8, flexShrink: 0 }} />
      {short}
    </span>
  )
}

const LIVE_SIGNALS = [
  {
    short: 'GH',
    color: '#00d4ff',
    label: 'GitHub activity',
    desc: 'Stars, commits, release frequency, and contributor volume on the primary repository.',
  },
  {
    short: 'PKG',
    color: '#a78bfa',
    label: 'Package usage',
    desc: 'Download counts from npm, PyPI, and similar registries. Available for agents with published packages.',
  },
  {
    short: 'ECO',
    color: '#fb7185',
    label: 'Ecosystem relationships',
    desc: 'Integration links, framework adoption, and dependency depth in the AgentCrush relationship graph.',
  },
  {
    short: 'HN',
    color: '#fbbf24',
    label: 'HN discourse',
    desc: 'Hacker News mentions, technical discussions, and launch posts.',
  },
  {
    short: 'TRUST',
    color: '#94a3b8',
    label: 'Trust state',
    desc: 'Verified identity, claim status, and tier history recorded on the agent profile.',
  },
]

const SECTIONS = [
  {
    id: 'evidence-model',
    title: 'Evidence, not popularity',
    body: (
      <>
        <p>
          AgentCrush ranks AI agents using verifiable public signals, not self-reported claims or popularity
          votes. An agent does not appear in{' '}
          <Link href="/rankings" className="text-violet-400 hover:text-violet-300 transition-colors">
            /rankings
          </Link>{' '}
          by being well-known — it gets there by generating real evidence that can be independently checked.
        </p>
        <p className="mt-3">
          Today over 60 agents are evidence-ranked and over 1,200 are indexed. Both counts grow automatically
          as agents accumulate signals and as new agents are submitted or discovered.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 rounded border border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.05)] px-3 py-1.5 text-xs font-mono font-semibold transition hover:bg-[rgba(57,255,20,0.1)]"
            style={{ color: '#39ff14' }}
          >
            Evidence rankings →
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-mono text-white/50 transition hover:text-white/80"
          >
            Browse all indexed agents →
          </Link>
        </div>
      </>
    ),
  },
  {
    id: 'tiers',
    title: 'How tiers work',
    body: (
      <>
        <p>Every agent on AgentCrush is assigned a tier based on current evidence coverage:</p>
        <div className="mt-4 space-y-3">
          {[
            {
              value: 'evidence_ranked',
              color: '#39ff14',
              borderColor: 'rgba(57,255,20,0.3)',
              bg: 'rgba(57,255,20,0.04)',
              desc: 'Sufficient signal across multiple evidence categories to support a reliable public rank. These agents appear in /rankings with a full score breakdown and evidence chips.',
            },
            {
              value: 'indexed',
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.1)',
              bg: 'rgba(255,255,255,0.02)',
              desc: 'Tracked and discoverable in /explore, but does not yet meet the evidence threshold for /rankings. Over 1,300 agents are indexed today. Coverage is live and growing.',
            },
            {
              value: 'archived',
              color: 'rgba(255,255,255,0.22)',
              borderColor: 'rgba(255,255,255,0.06)',
              bg: 'rgba(255,255,255,0.01)',
              desc: 'Not publicly surfaced. Used for duplicate entries, sunset projects, and manual curation. Not promoted or discoverable.',
            },
          ].map((tier) => (
            <div
              key={tier.value}
              className="rounded-xl border p-4"
              style={{ borderColor: tier.borderColor, background: tier.bg }}
            >
              <p
                className="font-mono text-xs font-semibold mb-1.5"
                style={{ color: tier.color }}
              >
                {tier.value}
              </p>
              <p className="text-xs text-white/50">{tier.desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'live-signals',
    title: 'Live scoring signals',
    body: (
      <>
        <p>
          The following signals are active in the v2 scoring model. Each agent score is a weighted
          combination of whichever signals have data available. The evidence chips visible on{' '}
          <Link href="/rankings" className="text-violet-400 hover:text-violet-300 transition-colors">
            /rankings
          </Link>{' '}
          show which signals contributed to each position.
        </p>
        <div className="mt-4 space-y-2">
          {LIVE_SIGNALS.map((s) => (
            <div
              key={s.short}
              className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="mt-0.5">
                <SignalChip short={s.short} color={s.color} />
              </span>
              <div>
                <p className="text-xs font-medium text-white/75">{s.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/30">
          Signals are only included in a score when real data exists. An agent missing a signal is not
          penalized — the remaining signals are reweighted proportionally.
        </p>
      </>
    ),
  },
  {
    id: 'incomplete-signals',
    title: 'Signals in progress or planned',
    body: (
      <>
        <p>
          AgentCrush is transparent about what is not yet scored. Signals marked{' '}
          <span className="font-mono text-[11px] font-semibold" style={{ color: '#fbbf24' }}>Collecting</span>{' '}
          are being gathered and monitored as shadow evidence but do not currently affect public rankings.
          Signals marked{' '}
          <span className="font-mono text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Planned</span>{' '}
          are not yet collecting data.
        </p>
        <div className="mt-4 space-y-2">
          {[
            {
              label: 'Dependency graph evidence',
              status: 'Collecting — not yet scored',
              statusColor: '#fbbf24',
              desc: 'Dependency graph data is now being actively collected: the pipeline discovers which repos reference each agent and writes those edges to the evidence store. This data does not yet replace or supplement the current public ranking formula — it is running as a shadow signal while the scoring model is hardened.',
            },
            {
              label: 'Docs quality evidence',
              status: 'Collecting — not yet scored',
              statusColor: '#fbbf24',
              desc: 'Documentation completeness signals (README depth, example count, API spec presence, changelog freshness) are now being collected per agent. Not yet included in public scores — being monitored as a shadow signal alongside the dependency graph data for the next scoring hardening cycle.',
            },
            {
              label: 'Reddit discourse signal',
              status: 'Planned — API pending',
              statusColor: '#94a3b8',
              desc: 'Community discussion on r/MachineLearning and related subreddits is a planned signal. Currently blocked pending Reddit API access approval.',
            },
            {
              label: 'Native AgentCrush signals',
              status: 'Planned',
              statusColor: '#94a3b8',
              desc: 'Profile views, search frequency, watchlist counts, and claim activity are planned future inputs. Not included in scoring today.',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
            >
              <span
                className="shrink-0 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded mt-0.5"
                style={{
                  color: item.statusColor,
                  background: `${item.statusColor}18`,
                  border: `1px solid ${item.statusColor}33`,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.status}
              </span>
              <div>
                <p className="text-xs font-medium text-white/60">{item.label}</p>
                <p className="text-xs text-white/35 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'indexed-vs-ranked',
    title: 'Indexed vs evidence-ranked',
    body: (
      <>
        <p>
          AgentCrush indexes broadly to support discovery: new projects, early-stage agents, niche tools,
          and historical data all belong in the index. The{' '}
          <Link href="/explore" className="text-violet-400 hover:text-violet-300 transition-colors">
            /explore
          </Link>{' '}
          directory is intentionally wider than{' '}
          <Link href="/rankings" className="text-violet-400 hover:text-violet-300 transition-colors">
            /rankings
          </Link>
          .
        </p>
        <p className="mt-3">
          An indexed agent is never penalized for not being ranked. It remains discoverable, linkable, and
          profile-complete. As evidence accumulates — new releases, growing downloads, ecosystem
          integrations — the scoring pipeline automatically reassesses eligibility.
        </p>
        <p className="mt-3">
          Tier promotion (indexed to evidence_ranked) happens through the weekly scoring pipeline. An agent
          that meets the threshold during a Sunday run will appear in /rankings the following week.
        </p>
      </>
    ),
  },
  {
    id: 'cadence',
    title: 'Update cadence',
    body: (
      <div className="space-y-3">
        {[
          {
            label: 'Signal collection',
            desc: 'Ecosystem signals — GitHub, package registries, HN — are refreshed on a scheduled cadence by the AgentCrush pipeline workers running on the VPS.',
          },
          {
            label: 'Score computation',
            desc: 'Scores are recomputed when new signal data arrives. The v2 model weights are deterministic: the same inputs always produce the same score.',
          },
          {
            label: 'Tier promotion',
            desc: 'The indexed to evidence_ranked promotion pipeline runs weekly on Sundays. An agent meeting the evidence threshold will be promoted on the next run.',
          },
          {
            label: 'v2 stability monitoring',
            desc: 'The v2 scoring model is being monitored for week-over-week consistency. Until several consecutive runs confirm stability, the legacy global_rank remains the canonical reference for displayed rankings.',
          },
          {
            label: 'Historical record',
            desc: 'AgentCrush tracks daily movement over time, so rankings are not just a current snapshot — they become a historical view of how agent activity, evidence, and reputation change. Daily records have accumulated since April 2026.',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
          >
            <p className="text-xs font-semibold text-white/70 mb-1">{item.label}</p>
            <p className="text-xs text-white/40">{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'machine-data',
    title: 'Machine-readable agent intelligence',
    body: (
      <>
        <p>
          Rank, score, tier, and verification state are available via x402-protected API endpoints — no API
          key or subscription required. Payments settle in USDC on Base mainnet per call.
        </p>
        <div className="mt-4 space-y-2">
          {[
            {
              path: '/api/agent/:handle/trust-summary',
              price: '$0.02',
              desc: 'Current rank, score, tier, archetype, and verified state.',
            },
            {
              path: '/api/agent/:handle/history',
              price: '$0.02',
              desc: '30-day rank and score history with trend summary.',
            },
            {
              path: '/api/agent/:handle/verification-status',
              price: '$0.005',
              desc: 'Tier, verified flag, and claim status only. Lightweight check.',
            },
          ].map((ep) => (
            <div
              key={ep.path}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.05]">
                <code className="text-xs text-white/70 font-mono">{ep.path}</code>
                <span className="ml-auto text-[10px] font-semibold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded shrink-0">
                  {ep.price}
                </span>
              </div>
              <p className="px-3 py-2 text-xs text-white/40">{ep.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/api-docs"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            API documentation →
          </Link>
          <Link
            href="/for-agents"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            For AI agents →
          </Link>
        </div>
      </>
    ),
  },
]

export default function HowWeRankPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="mb-6 rounded-xl border border-[rgba(0,212,255,0.20)] bg-[rgba(0,212,255,0.04)] px-4 py-3">
        <p className="text-xs text-white/70 leading-relaxed">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#00d4ff] mr-2">◆ Heads up</span>
          This page covers the <strong>developer-agent universal ranking methodology (v2.c-public)</strong>. As of May 2026, AgentCrush also has per-category methodologies for <Link href="/rankings/model-families" className="text-[#00d4ff] hover:text-cyan-300 underline underline-offset-2">model families</Link>, <Link href="/rankings/tokenized-agents" className="text-[#00d4ff] hover:text-cyan-300 underline underline-offset-2">tokenized agents</Link>, and <Link href="/rankings/service-agents" className="text-[#00d4ff] hover:text-cyan-300 underline underline-offset-2">service agents</Link>. The full hub is at <Link href="/methodology" className="text-[#00d4ff] hover:text-cyan-300 underline underline-offset-2 font-semibold">/methodology</Link>.
        </p>
      </div>

      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Methodology · Developer agents
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">How we rank AI agents</h1>
        <p className="mt-3 text-sm text-white/50 max-w-xl">
          Evidence signals, tiered indexing, and honest limits. How AgentCrush scores and ranks developer-tool AI agents (frameworks, runtimes, dev tools).
        </p>
      </div>

      {/* TOC */}
      <nav className="mb-10 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">On this page</p>
        <ol className="space-y-1">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-xs text-white/55 hover:text-white transition-colors"
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">{s.title}</h2>
            <div className="text-sm text-white/60 leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-3 border-t border-white/[0.06] pt-8">
        <Link
          href="/rankings"
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          ← Evidence rankings
        </Link>
        <Link
          href="/explore"
          className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
        >
          Browse all indexed agents →
        </Link>
        <Link
          href="/submit"
          className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
        >
          Submit an agent →
        </Link>
      </div>
    </main>
  )
}
