import Link from 'next/link'

export const metadata = {
  title: 'Developers | AgentCrush',
  description:
    'Machine-readable interfaces, embeddable surfaces, and public technical docs for the AgentCrush agent intelligence index.',
}

const SURFACES = [
  {
    label: 'MCP Server',
    badge: 'Free · v0',
    href: '/developers/mcp',
    endpoint: 'POST https://www.agentcrush.xyz/api/mcp',
    description:
      'Read-only MCP tools for querying AgentCrush agent intelligence from any MCP-compatible AI client or agent. No auth, no payment.',
    details: [
      'lookup_agent — rank, score, tier, archetype for a single agent',
      'search_agents — keyword search across the index',
      'compare_agents — side-by-side rank and signal comparison',
      'get_history — daily rank and score snapshots (up to 90 days)',
    ],
    cta: 'MCP docs →',
  },
  {
    label: 'API Docs',
    badge: 'x402 · Pay-per-call',
    href: '/api-docs',
    endpoint: null,
    description:
      'Machine-callable REST endpoints for agent trust state, rank history, and verification status. Pay-per-call in USDC on Base via the x402 protocol — no subscriptions, no API keys.',
    details: [
      '/api/agent/{handle}/trust-summary — $0.02 · rank, score, archetype, ERC-8004 context',
      '/api/agent/{handle}/history — $0.02 · 30-day daily rank and score snapshots',
      '/api/agent/{handle}/verification-status — $0.005 · tier, verified flag, claim status',
    ],
    cta: 'API docs →',
    note: 'x402 paid endpoints are separate from free MCP v0.',
  },
  {
    label: 'Agent Economy Index',
    badge: 'Public · v0',
    href: '/agent-economy-index',
    endpoint: null,
    description:
      'V0 public tracker of indexed agents, evidence-ranked agents, protocol surfaces, and agent economy signals. Updated continuously from ecosystem signals.',
    details: null,
    cta: 'View index →',
  },
  {
    label: 'Ranking Methodology',
    badge: 'Public',
    href: '/how-we-rank',
    endpoint: null,
    description:
      'Explains evidence signals (GitHub activity, ecosystem integrations, adoption data), shadow signals, scoring limitations, and how rankings should be interpreted.',
    details: null,
    cta: 'Read methodology →',
  },
  {
    label: 'Embeddable Badges',
    badge: 'SVG · Free',
    href: null,
    endpoint: null,
    description:
      'Embed a live AgentCrush badge on any page or README. Returns an SVG with current rank and tier. No API key required.',
    details: [
      'GET /embed/{handle} — returns SVG badge for any indexed agent',
    ],
    example: {
      label: 'Example: CrewAI badge',
      href: '/embed/crewai',
      text: '/embed/crewai',
    },
    cta: null,
  },
]

export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Developers
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          AgentCrush for Developers
        </h1>
        <p className="mt-3 text-sm text-white/50 max-w-xl leading-relaxed">
          Public technical surfaces for building with AgentCrush agent intelligence — MCP tools,
          REST APIs, embeds, and reference docs.
        </p>
      </div>

      {/* Surfaces */}
      <div className="space-y-5">
        {SURFACES.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-5"
          >
            {/* Title row */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="text-base font-semibold text-white">{s.label}</span>
              <span className="text-xs text-violet-400/80 border border-violet-400/20 rounded px-2 py-0.5">
                {s.badge}
              </span>
            </div>

            {/* Endpoint pill */}
            {s.endpoint && (
              <div className="font-mono text-xs text-violet-300 bg-white/[0.04] border border-white/[0.06] rounded px-3 py-1.5 mb-3 w-fit">
                {s.endpoint}
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-white/50 leading-relaxed mb-3">{s.description}</p>

            {/* Note */}
            {s.note && (
              <p className="text-xs text-white/30 mb-3 italic">{s.note}</p>
            )}

            {/* Detail list */}
            {s.details && (
              <ul className="mb-4 space-y-1">
                {s.details.map((d) => (
                  <li key={d} className="flex gap-2 text-xs text-white/35">
                    <span className="text-violet-400/50 mt-0.5 shrink-0">·</span>
                    <span className="font-mono">{d}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Embed example */}
            {s.example && (
              <div className="mb-4">
                <a
                  href={s.example.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {s.example.text}
                </a>
                <span className="text-xs text-white/25 ml-2">({s.example.label})</span>
              </div>
            )}

            {/* CTA */}
            {s.href && s.cta && (
              <Link
                href={s.href}
                className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] rounded px-3 py-1.5 transition-colors inline-block"
              >
                {s.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Profiles / compare note */}
      <div className="mt-8 rounded-lg border border-white/[0.05] bg-white/[0.01] px-5 py-4">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Agent profiles &amp; comparisons
        </p>
        <p className="text-xs text-white/35 leading-relaxed mb-3">
          Every indexed agent has a public profile page and can be compared side-by-side.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent/crewai"
            className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
          >
            /agent/crewai
          </Link>
          <Link
            href="/compare/crewai-vs-autogpt"
            className="text-xs font-mono text-violet-400/70 hover:text-violet-300 transition-colors"
          >
            /compare/crewai-vs-autogpt
          </Link>
          <Link
            href="/explore"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Browse all →
          </Link>
        </div>
      </div>

      {/* Case study */}
      <div className="mt-4 px-1">
        <p className="text-xs text-white/25">
          Case study:{' '}
          <Link
            href="/blog/x402-discovery-postmortem"
            className="text-violet-400/60 hover:text-violet-300 transition-colors"
          >
            x402 discovery post-mortem →
          </Link>
        </p>
      </div>

    </main>
  )
}
