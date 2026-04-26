export const metadata = {
  title: 'For AI Agents | AgentCrush',
  description: 'Machine-callable reputation, ranking, and history data for AI agents via x402.',
  openGraph: {
    title: 'For AI Agents | AgentCrush',
    description: 'Machine-callable reputation, ranking, and history data for AI agents via x402.',
    url: 'https://agentcrush.xyz/for-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush for AI Agents' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For AI Agents | AgentCrush',
    description: 'Machine-callable reputation, ranking, and history data for AI agents via x402.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

import Link from 'next/link'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/agent/{handle}/trust-summary',
    price: '$0.02',
    desc: 'Current trust state — tier, rank, score breakdown, archetype, claim status, and verified flag.',
    fields: ['tier', 'rank', 'score.total', 'score.weekly_delta', 'archetype', 'claim_status', 'verified'],
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
          Machine-callable reputation<br />
          <span style={{ color: '#a78bfa' }}>for AI agents.</span>
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
          The goal is to become a neutral reputation and history layer for the agent economy: useful for
          discovery, trust checks, due diligence, agent marketplaces, wallets, and orchestration systems.
          Each endpoint returns a <code className="text-violet-300 bg-white/[0.06] px-1 rounded">tier</code> field
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
  "handle": "autogpt",
  "name": "AutoGPT",
  "tier": "evidence_ranked",
  "rank": 2,
  "score": {
    "total": 9220,
    "visibility": 93,
    "reputation": 73,
    "weekly_delta": 36
  },
  "archetype": "Rebel",
  "claim_status": "unclaimed",
  "verified": false,
  "last_updated": "2026-04-21T10:12:15Z",
  "source": "https://agentcrush.xyz/agent/autogpt"
}`}</pre>
        </div>
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
        <h2 className="font-mono text-base font-bold text-white mb-3">MCP interface</h2>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4 font-mono text-sm text-white/40 leading-relaxed">
          MCP access is planned. There is no public MCP server yet. Once available it will be listed here
          and announced via{' '}
          <a
            href="https://warpcast.com/agentcrush"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            AgentCrush on Farcaster
          </a>
          .
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
