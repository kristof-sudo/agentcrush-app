import Link from 'next/link'

export const metadata = {
  title: 'Developers | AgentCrush',
  description:
    'Free MCP tools, paid x402 REST APIs, embeddable badges, and structured agent intelligence for developers and AI agents building with AgentCrush.',
  alternates: { canonical: 'https://www.agentcrush.xyz/developers' },
}

const MCP_ENDPOINT = 'https://www.agentcrush.xyz/api/mcp/v1'

const MCP_CONFIG = `{
  "mcpServers": {
    "agentcrush": {
      "url": "https://www.agentcrush.xyz/api/mcp/v1"
    }
  }
}`

const MCP_TOOLS = [
  {
    name: 'search_agents',
    args: '{ "query": "qwen", "filters": { "primary_category": "model_family", "evidence_ranked_only": true } }',
    desc: 'Search AI agents by name or keyword. Returns category, tier, and rank.',
  },
  {
    name: 'get_agent_details',
    args: '{ "handle": "qwen" }',
    desc: 'Full details across all 4 scoring categories. Raw signals, sub-scores, evidence-ready status.',
  },
  {
    name: 'get_agent_history',
    args: '{ "handle": "crewai", "days": 30 }',
    desc: 'Daily rank + score snapshots, 1–90 days, with 30-day trend summary.',
  },
  {
    name: 'compare_agents',
    args: '{ "handles": ["qwen", "gemini", "llama"] }',
    desc: 'Side-by-side comparison of 2–5 agents across all their categories.',
  },
  {
    name: 'list_categories',
    args: '{}',
    desc: 'The 4 AgentCrush indices: tracked count, evidence-ranked count, methodology version.',
  },
  {
    name: 'get_category_ranking',
    args: '{ "category": "model_family", "evidence_ready_only": true, "limit": 50 }',
    desc: 'Full ranking for a category ordered by composite score. All sub-scores visible.',
  },
  {
    name: 'get_methodology',
    args: '{ "category": "tokenized" }',
    desc: 'Scoring methodology for a category — weights, signals, evidence-ready rule, known limitations.',
  },
]

const X402_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/agent/{handle}/trust-summary',
    price: '$0.02',
    color: '#e91e80',
    desc: 'Current trust state — tier, rank, score breakdown, archetype, claim status, verified flag, ERC-8004 context.',
    fields: ['tier', 'rank', 'score.total', 'score.weekly_delta', 'archetype', 'claim_status', 'verified', 'erc8004.registered'],
  },
  {
    method: 'GET',
    path: '/api/agent/{handle}/history',
    price: '$0.02',
    color: '#a78bfa',
    desc: 'Rank and score history over 30 days — daily snapshots with visibility, reputation, and weekly delta.',
    fields: ['tier', 'history[].rank', 'history[].score_total', 'summary.trend'],
  },
  {
    method: 'GET',
    path: '/api/agent/{handle}/verification-status',
    price: '$0.005',
    color: '#39ff14',
    desc: 'Lightweight status check — tier, verified flag, claim status, last tier update.',
    fields: ['tier', 'verified', 'claim_status', 'last_updated'],
  },
]

function Code({ children }) {
  return (
    <pre className="rounded-lg border border-white/[0.08] bg-[#0d0d18] px-4 py-3 overflow-x-auto text-xs font-mono text-violet-200/80 leading-relaxed">
      {children}
    </pre>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 mb-2">
      {children}
    </p>
  )
}

export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 text-white">

      {/* ── Hero ───────────────────────────────────────────────── */}
      <div className="mb-10">
        <SectionLabel>Developers</SectionLabel>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Build with AgentCrush
        </h1>
        <p className="text-sm text-white/55 max-w-2xl leading-relaxed mb-6">
          Free MCP tools for LLM clients and agents. Paid x402 REST endpoints for agent-to-agent
          intelligence. Embeddable badges for any README or page.
        </p>
        {/* Quick-jump */}
        <div className="flex flex-wrap gap-2">
          {[
            { href: '#mcp', label: 'MCP Server', badge: 'Free' },
            { href: '#api', label: 'REST API', badge: 'x402' },
            { href: '#for-agents', label: 'For AI Agents', badge: null },
            { href: '#badges', label: 'Embed Badges', badge: 'Free' },
          ].map(({ href, label, badge }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              {label}
              {badge && (
                <span className="text-[10px] text-violet-400/70">{badge}</span>
              )}
            </a>
          ))}
        </div>
      </div>

      {/* ── MCP Server ─────────────────────────────────────────── */}
      <section id="mcp" className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <SectionLabel>MCP Server · v1</SectionLabel>
          <span className="text-[10px] font-mono text-emerald-400/80 border border-emerald-400/20 rounded px-1.5 py-0.5 -mt-1">
            Free · No auth
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">AgentCrush MCP Server</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-5">
          Connect AgentCrush as a live data layer in Claude Desktop, Cursor, or any MCP-compatible
          agent. 7 read-only tools across all 4 category indices. JSON-RPC 2.0 over HTTP.
        </p>

        <div className="font-mono text-xs text-violet-300 bg-white/[0.04] border border-white/[0.06] rounded px-3 py-2 mb-5 w-fit">
          POST {MCP_ENDPOINT}
        </div>

        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
          Add to your config
        </p>
        <Code>{MCP_CONFIG}</Code>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            Tools
          </p>
          {MCP_TOOLS.map((t) => (
            <div
              key={t.name}
              className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-3 mb-1.5">
                <span className="font-mono text-sm font-semibold text-violet-300">{t.name}</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed mb-2">{t.desc}</p>
              <Code>{t.args}</Code>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3">
          <p className="text-xs text-white/30 mb-1">Discovery</p>
          <a
            href="https://www.agentcrush.xyz/.well-known/mcp.json"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-violet-400/60 hover:text-violet-300 transition-colors"
          >
            /.well-known/mcp.json
          </a>
        </div>
      </section>

      {/* ── REST API (x402) ────────────────────────────────────── */}
      <section id="api" className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <SectionLabel>REST API · x402</SectionLabel>
          <span className="text-[10px] font-mono text-amber-400/80 border border-amber-400/20 rounded px-1.5 py-0.5 -mt-1">
            Pay-per-call · USDC on Base
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Paid REST Endpoints</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-5">
          Machine-callable REST endpoints for agent trust state, rank history, and verification
          status. No API keys. No subscriptions. Payment settles in USDC on Base mainnet per call
          via the x402 protocol.
        </p>

        <div className="space-y-4">
          {X402_ENDPOINTS.map((e) => (
            <div
              key={e.path}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4"
              style={{ borderLeftColor: e.color, borderLeftWidth: 2 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="font-mono text-xs text-white/40">{e.method}</span>
                <span className="font-mono text-sm text-white/80">{e.path}</span>
                <span
                  className="ml-auto text-sm font-bold font-mono"
                  style={{ color: e.color }}
                >
                  {e.price}
                </span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed mb-3">{e.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {e.fields.map((f) => (
                  <span
                    key={f}
                    className="font-mono text-[10px] text-violet-300/60 bg-white/[0.04] border border-white/[0.05] rounded px-1.5 py-0.5"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3">
          <p className="text-xs text-white/30 mb-1">x402 discovery</p>
          <a
            href="https://www.agentcrush.xyz/.well-known/x402"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-violet-400/60 hover:text-violet-300 transition-colors"
          >
            /.well-known/x402
          </a>
          <span className="text-xs text-white/20 ml-3">Full endpoint manifest with pricing</span>
        </div>
      </section>

      {/* ── For AI Agents ──────────────────────────────────────── */}
      <section id="for-agents" className="mb-14 scroll-mt-20">
        <SectionLabel>For AI Agents</SectionLabel>
        <h2 className="text-xl font-bold tracking-tight mb-2">
          AI agents can query AgentCrush natively
        </h2>
        <div className="space-y-4 text-sm text-white/55 leading-relaxed mb-6">
          <p>
            The x402 endpoints are designed for machine callers. An AI agent can check another
            agent's trust state, rank, or verification status before interacting — no human in the
            loop, no API key to manage.
          </p>
          <p>
            Payments settle in USDC on Base mainnet per call. Each response includes a{' '}
            <code className="font-mono text-xs text-violet-300 bg-white/[0.06] px-1 rounded">tier</code>{' '}
            field so callers know whether ranking data is evidence-backed or limited.
            Evidence-ranked agents have crossed the signal threshold; indexed-only agents have not.
          </p>
          <p>
            Agents without enough evidence are indexed but not ranked.{' '}
            <code className="font-mono text-xs text-violet-300 bg-white/[0.06] px-1 rounded">tier: "indexed"</code>{' '}
            vs{' '}
            <code className="font-mono text-xs text-violet-300 bg-white/[0.06] px-1 rounded">tier: "evidence_ranked"</code>{' '}
            is the primary gate.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: 'No API keys', note: 'x402 handles payment inline' },
            { label: 'USDC on Base', note: 'Pay per call, no subscription' },
            { label: 'Machine-readable', note: 'JSON, no human-facing markup' },
          ].map(({ label, note }) => (
            <div
              key={label}
              className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <p className="text-sm font-semibold text-white mb-1">{label}</p>
              <p className="text-xs text-white/35">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Embed Badges ───────────────────────────────────────── */}
      <section id="badges" className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <SectionLabel>Embed Badges</SectionLabel>
          <span className="text-[10px] font-mono text-emerald-400/80 border border-emerald-400/20 rounded px-1.5 py-0.5 -mt-1">
            SVG · Free
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Live rank badges</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-5">
          Embed a live AgentCrush rank badge on any page or README. Returns an SVG with current
          rank and tier. No API key required.
        </p>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-5 py-4">
          <p className="text-xs text-white/35 mb-3">Endpoint</p>
          <code className="font-mono text-sm text-violet-300">GET /embed/{'{handle}'}</code>
          <p className="text-xs text-white/30 mt-2 mb-4">Returns SVG. No auth. No rate limit.</p>
          <p className="text-xs text-white/35 mb-2">Example</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/embed/crewai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              /embed/crewai
            </a>
            <span className="text-xs text-white/25">→ live SVG badge for CrewAI</span>
          </div>
          <p className="text-xs text-white/25 mt-3">
            Append <code className="font-mono text-violet-300/50">.svg</code> or use the path
            directly — both work.
          </p>
        </div>
      </section>

      {/* ── Resources ──────────────────────────────────────────── */}
      <section id="resources" className="scroll-mt-20">
        <SectionLabel>Resources</SectionLabel>
        <h2 className="text-xl font-bold tracking-tight mb-5">Reference docs</h2>

        <div className="space-y-3">
          {[
            {
              label: 'Ranking Methodology',
              href: '/methodology',
              note: 'Four category methodologies — signals, weights, evidence-ready rule, limitations.',
            },
            {
              label: 'Agent profiles',
              href: '/agent/crewai',
              note: 'Every indexed agent has a public profile page.',
            },
            {
              label: 'Side-by-side compare',
              href: '/compare/crewai-vs-autogpt',
              note: 'Compare any two agents across all category scores.',
            },
            {
              label: 'Browse all agents',
              href: '/explore',
              note: 'Full index, searchable and filterable.',
            },
            {
              label: 'x402 discovery post-mortem',
              href: '/blog/x402-discovery-postmortem',
              note: 'Case study on building with x402 payment-gated data.',
            },
          ].map(({ label, href, note }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 rounded-lg border border-white/[0.06] bg-white/[0.01] px-4 py-3 hover:border-white/[0.12] hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                  {label}
                </p>
                <p className="text-xs text-white/30 mt-0.5">{note}</p>
              </div>
              <span className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>

    </main>
  )
}
