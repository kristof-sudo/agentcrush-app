export const metadata = {
  title: 'For AI Agents | AgentCrush',
  description: 'Structured agent intelligence for autonomous workflows — activity, ranking, history, and cross-protocol signals via x402.',
  openGraph: {
    title: 'For AI Agents | AgentCrush',
    description: 'Structured agent intelligence for autonomous workflows — activity, ranking, history, and cross-protocol signals via x402.',
    url: 'https://agentcrush.xyz/for-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush for AI Agents' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For AI Agents | AgentCrush',
    description: 'Structured agent intelligence for autonomous workflows — activity, ranking, history, and cross-protocol signals via x402.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

import Link from 'next/link'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/agent/{handle}/trust-summary',
    price: '$0.02',
    desc: 'Current trust state — tier, rank, score breakdown, archetype, claim status, verified flag, and ERC-8004 registry context when available.',
    fields: ['tier', 'rank', 'score.total', 'score.weekly_delta', 'archetype', 'claim_status', 'verified', 'erc8004.registered'],
  },
  {
    method: 'GET',
    path: '/api/agent/{handle}/history',
    price: '$0.02',
    desc: 'Rank and score history over the last 30 days. Includes 30-day trend summary.',
    fields: ['tier', 'history[].rank', 'history[].score_total', 'summary.trend'],
  },
  {
    method: 'GET',
    path: '/api/agent/{handle}/verification-status',
    price: '$0.005',
    desc: 'Tier and verification state — verified flag, claim status, and last tier update. Lightweight status check.',
    fields: ['tier', 'verified', 'claim_status', 'last_updated'],
  },
]

export default function ForAgentsPage() {
  return (
    <main
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#e2e8f0' }}
      className="mx-auto max-w-3xl px-4 py-12 md:px-6"
    >
      {/* Hero */}
      <div className="mb-10">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3">
          For AI Agents
        </p>
        <h1 className="font-mono text-3xl font-bold text-white tracking-tight leading-tight">
          Structured agent intelligence<br />
          <span style={{ color: '#a78bfa' }}>for autonomous workflows.</span>
        </h1>
      </div>

      {/* Body paragraphs */}
      <div className="space-y-5 mb-10 font-mono text-sm text-white/55 leading-relaxed max-w-2xl">
        <p>
          AgentCrush tracks AI agents across public signals and separates{' '}
          <span className="text-white/75">evidence-ranked agents</span> from the broader indexed directory.
          Evidence ranking requires active GitHub activity, ecosystem relationships, and sufficient signal coverage — agents without enough evidence are indexed but not ranked.
        </p>
        <p>
          Human users can browse rankings and agent profiles.{' '}
          <span className="text-white/75">AI agents can query trust, rank, and history</span> through
          x402-protected endpoints — no API keys, no subscriptions. Payments settle in USDC on Base mainnet
          per call.
        </p>
        <p>
          Agents can call AgentCrush to check activity, ranking status, history, and cross-protocol evidence before
          interacting with another agent or service. Each endpoint returns a{' '}
          <code className="text-violet-300 bg-white/[0.06] px-1 rounded">tier</code> field
          so callers know whether ranking data is evidence-backed or limited.
        </p>
      </div>

      {/* Endpoints section */}
      <section id="endpoints" className="mb-10">
        <h2 className="font-mono text-base font-bold text-white mb-1 scroll-mt-24">Machine-callable endpoints</h2>
        <p className="font-mono text-xs text-white/35 mb-5">
          x402-protected · pay per call · USDC on Base mainnet
        </p>
        <div className="space-y-4">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.path}
              className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  {ep.method}
                </span>
                <code className="text-sm text-white/80 font-mono">{ep.path}</code>
                <span className="ml-auto text-[10px] font-semibold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded shrink-0">
                  {ep.price}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-white/50 mb-2">{ep.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ep.fields.map((f) => (
                    <code key={f} className="text-[10px] text-violet-300 bg-violet-400/[0.08] border border-violet-400/[0.15] px-1.5 py-0.5 rounded">
                      {f}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 font-mono text-xs text-white/40 leading-relaxed">
          <span className="text-white/60">402 Payment Required</span> is the expected response until a valid
          x402 payment is attached. Check response headers for payment instructions and use the{' '}
          <a
            href="https://docs.cdp.coinbase.com/x402"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            x402 buyer SDK
          </a>{' '}
          to construct payments automatically.
        </div>

        {/* Example response */}
        <div className="mt-4">
          <p className="font-mono text-[10px] text-white/30 mb-2 uppercase tracking-widest">Example response — trust-summary</p>
          <pre className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 font-mono text-xs text-white/55 leading-relaxed overflow-x-auto">{`{
  "handle": "crewai",
  "name": "CrewAI",
  "tier": "indexed",
  "rank": null,
  "score": {
    "total": 0,
    "visibility": 0,
    "reputation": 0,
    "weekly_delta": 0
  },
  "archetype": null,
  "claim_status": null,
  "verified": false,
  "erc8004": {
    "registered": true,
    "chain_id": "eip155:8453",
    "chain_name": null,
    "token_id": "17997",
    "x402_supported": true,
    "match_confidence": 0.75,
    "source": "8004scan"
  },
  "last_updated": null,
  "source": "https://agentcrush.xyz/agent/crewai"
}`}</pre>
        </div>
      </section>

      {/* ERC-8004 note */}
      <section className="mb-10">
        <p className="font-mono text-xs text-white/40 leading-relaxed">
          When available, trust-summary includes matched ERC-8004 registry context. ERC-8004 status is currently informational and does not affect ranking.
        </p>
      </section>

      {/* Tier field explanation */}
      <section className="mb-10">
        <h2 className="font-mono text-base font-bold text-white mb-4 scroll-mt-24">The tier field</h2>
        <div className="space-y-2">
          {[
            {
              value: 'evidence_ranked',
              color: '#39ff14',
              borderColor: 'rgba(57,255,20,0.3)',
              bg: 'rgba(57,255,20,0.05)',
              desc: 'Active GitHub activity, ecosystem relationships, and sufficient signal coverage. Includes ranking context and evidence breakdown.',
            },
            {
              value: 'indexed',
              color: 'rgba(255,255,255,0.45)',
              borderColor: 'rgba(255,255,255,0.1)',
              bg: 'rgba(255,255,255,0.02)',
              desc: 'Tracked in the index but limited evidence. Score and rank data may be absent or low-confidence.',
            },
            {
              value: 'archived',
              color: 'rgba(255,255,255,0.25)',
              borderColor: 'rgba(255,255,255,0.07)',
              bg: 'rgba(255,255,255,0.01)',
              desc: 'Reserved for future use.',
            },
          ].map((t) => (
            <div
              key={t.value}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5"
              style={{ border: `1px solid ${t.borderColor}`, background: t.bg }}
            >
              <code className="text-[11px] font-bold shrink-0 mt-0.5" style={{ color: t.color }}>
                {t.value}
              </code>
              <span className="text-xs text-white/40">{t.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MCP section */}
      <section id="mcp" className="mb-10 scroll-mt-24">
        <h2 className="font-mono text-base font-bold text-white mb-1">MCP interface (v1)</h2>
        <p className="font-mono text-xs text-white/35 mb-5">
          live · free · no auth · 60 req/min per IP
        </p>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
              POST
            </span>
            <code className="text-sm text-white/80 font-mono">https://agentcrush.xyz/api/mcp/v1</code>
            <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded shrink-0">
              Free
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-white/50 mb-3">
              Read-only MCP tools for querying AgentCrush from any MCP-compatible AI client (Claude Desktop, Cursor, custom agents). v1 covers all 4 category indices. No auth, no payment.
            </p>
            <div className="space-y-1.5">
              {[
                { name: 'search_agents', desc: 'text search + structured filters (category, evidence-ranked, limit)' },
                { name: 'get_agent_details', desc: 'full per-agent breakdown across ALL categories' },
                { name: 'get_agent_history', desc: 'daily rank/score snapshots up to 90 days' },
                { name: 'compare_agents', desc: 'side-by-side 2–5 agents with cross-category breakdowns' },
                { name: 'list_categories', desc: 'the 4 categories with counts + methodology versions' },
                { name: 'get_category_ranking', desc: 'full ranking for one category with all sub-scores' },
                { name: 'get_methodology', desc: 'weights, formulas, evidence-ready rule, limitations per category' },
              ].map((t) => (
                <div key={t.name} className="flex items-baseline gap-2 text-xs">
                  <code className="text-violet-300 bg-violet-400/[0.08] border border-violet-400/[0.15] px-1.5 py-0.5 rounded">
                    {t.name}
                  </code>
                  <span className="text-white/40">{t.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap gap-3 text-xs">
              <a href="/developers/mcp" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Full MCP docs →</a>
              <span className="text-white/15">·</span>
              <a href="/.well-known/mcp.json" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Discovery manifest →</a>
              <span className="text-white/15">·</span>
              <a href="/methodology" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">Methodology hub →</a>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1.5">Flat HTTP JSON (for non-MCP retrieval clients)</p>
              <div className="space-y-1 text-[11px] font-mono text-white/55">
                <div><span className="text-emerald-400">GET</span> /api/agent/&#123;handle&#125;/llm-summary</div>
                <div><span className="text-emerald-400">GET</span> /api/agent-economy/llm-summary</div>
                <div><span className="text-emerald-400">GET</span> /api/methodology/&#123;category&#125;/llm-summary</div>
                <div><span className="text-emerald-400">GET</span> /api/rankings/&#123;category&#125;/llm-summary</div>
                <div><span className="text-emerald-400">GET</span> /api/compare/llm-summary?agents=a,b</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Machine-discoverability section */}
      <section id="machine-discoverable" className="mb-10 scroll-mt-24">
        <h2 className="font-mono text-base font-bold text-white mb-1">Machine-discoverability signals</h2>
        <p className="font-mono text-xs text-white/35 mb-5">
          per-agent scan · public · display on agent profiles
        </p>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4">
          <p className="text-xs text-white/50 leading-relaxed mb-3">
            AgentCrush scans every indexed agent&apos;s domain weekly for machine-discoverable surfaces. The result shows on each agent profile as a per-surface chip row.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              '/.well-known/x402',
              '/.well-known/agent-card.json',
              '/.well-known/mcp.json',
              '/openapi.json',
              '/robots.txt',
            ].map((s) => (
              <code key={s} className="text-[10px] text-violet-300 bg-violet-400/[0.08] border border-violet-400/[0.15] px-1.5 py-0.5 rounded">
                {s}
              </code>
            ))}
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed italic">
            Display-only. Not a ranking input. API exposure on the roadmap. If you&apos;re building an agent and want it discoverable to other machines, ship the surfaces above.
          </p>
        </div>
      </section>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-8">
        <Link
          href="/api-docs"
          className="inline-flex items-center gap-2 rounded border border-violet-400/40 bg-violet-400/[0.08] px-4 py-2 font-mono text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          View API docs →
        </Link>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/50 hover:text-white transition-colors"
        >
          Browse evidence rankings →
        </Link>
      </div>
    </main>
  )
}
