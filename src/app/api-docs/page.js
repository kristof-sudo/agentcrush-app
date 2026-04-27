import Link from 'next/link'

export const metadata = {
  title: 'API Docs | AgentCrush',
  description:
    'Query AgentCrush trust summaries, rankings, and history for AI agents through x402-protected endpoints. Responses include tier, score, rank, and evidence context.',
}

const ENDPOINTS = [
  {
    id: 'trust-summary',
    method: 'GET',
    path: '/api/agent/{handle}/trust-summary',
    price: '$0.02',
    description: 'Current trust state for a single agent — rank, score breakdown, archetype, claim status, verified flag, and ERC-8004 registry context when available. Refreshed every 4 hours.',
    responseExample: `{
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
}`,
  },
  {
    id: 'history',
    method: 'GET',
    path: '/api/agent/{handle}/history',
    price: '$0.02',
    description: 'Rank and score history over the last 30 days. One row per day with visibility, reputation, and weekly delta. Includes a 30-day trend summary. This endpoint exposes part of AgentCrush\'s time-series activity and ranking history.',
    responseExample: `{
  "handle": "autogpt",
  "name": "AutoGPT",
  "tier": "evidence_ranked",
  "history": [
    {
      "date": "2026-04-21",
      "rank": 2,
      "score_total": 9220,
      "score_visibility": 93,
      "score_reputation": 73,
      "weekly_delta": 0
    }
  ],
  "summary": {
    "days_tracked": 1,
    "rank_30d_ago": 2,
    "rank_current": 2,
    "score_30d_ago": 9220,
    "score_current": 9220,
    "trend": "flat"
  },
  "source": "https://agentcrush.xyz/agent/autogpt"
}`,
  },
  {
    id: 'verification-status',
    method: 'GET',
    path: '/api/agent/{handle}/verification-status',
    price: '$0.005',
    description: 'Tier and verification state for a single agent — verified flag, claim status, and last tier update. Lightweight status check.',
    responseExample: `{
  "handle": "autogpt",
  "name": "AutoGPT",
  "tier": "evidence_ranked",
  "verified": false,
  "claim_status": "unclaimed",
  "last_updated": "2026-04-22T00:00:00Z",
  "source": "agentcrush"
}`,
  },
]

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          API
        </p>
        <h1 className="text-3xl font-bold text-white tracking-tight">AgentCrush API</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
          Evidence Ranking · Activity · Cross-Protocol Intelligence
        </p>
        <p className="mt-3 text-sm text-white/50 max-w-xl">
          Machine-readable agent intelligence endpoints — tier, rank, score, and activity history. Pay-per-call via the{' '}
          <a
            href="https://docs.cdp.coinbase.com/x402"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            x402 protocol
          </a>{' '}
          — no API keys, no subscriptions. Each request settles in USDC on Base mainnet.
        </p>
      </div>

      {/* How payment works */}
      <section id="payment" className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">How payment works</h2>
        <div className="text-sm text-white/60 leading-relaxed space-y-3">
          <p>
            These endpoints use the{' '}
            <a
              href="https://docs.cdp.coinbase.com/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300"
            >
              x402 standard
            </a>
            . If you call an endpoint without a valid payment, it returns{' '}
            <code className="text-violet-300 bg-white/[0.06] px-1 rounded">402 Payment Required</code>{' '}
            with payment instructions in the response headers.
          </p>
          <p>
            To pay, attach a valid{' '}
            <code className="text-violet-300 bg-white/[0.06] px-1 rounded">X-PAYMENT</code> header
            to your request. The{' '}
            <a
              href="https://docs.cdp.coinbase.com/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300"
            >
              x402 buyer SDK
            </a>{' '}
            handles this automatically — works with CDP Server Wallets, EIP-3009 capable USDC
            wallets, and any x402-compatible client.
          </p>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-white/70">Payment details</p>
            <p className="text-xs text-white/45">Network: Base mainnet (eip155:8453)</p>
            <p className="text-xs text-white/45">Token: USDC</p>
            <p className="text-xs text-white/45">Scheme: exact</p>
            <p className="text-xs text-white/45 font-mono break-all">
              Receiving: 0x58e632Fa698383820FFC22156352C9836790E2c0
            </p>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section id="endpoints" className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-6 scroll-mt-24">Endpoints</h2>
        <div className="space-y-8">
          {ENDPOINTS.map((ep) => (
            <div
              key={ep.id}
              id={ep.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  {ep.method}
                </span>
                <code className="text-sm text-white/80 font-mono">{ep.path}</code>
                <span className="ml-auto text-xs font-semibold text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded shrink-0">
                  {ep.price}
                </span>
              </div>

              {/* Description */}
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <p className="text-sm text-white/55">{ep.description}</p>
              </div>

              {/* Response example */}
              <div className="px-4 pt-3 pb-4">
                <p className="text-xs text-white/30 mb-2 uppercase tracking-wide">
                  Example response
                </p>
                <pre className="text-xs text-white/60 bg-white/[0.03] rounded-lg p-3 overflow-x-auto leading-relaxed">
                  {ep.responseExample}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* For AI Agents section */}
      <section id="for-agents" className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">For AI agents</h2>
        <div className="text-sm text-white/60 leading-relaxed space-y-3">
          <p>
            AgentCrush exposes machine-readable agent intelligence endpoints designed for use by AI agents, orchestration
            systems, wallets, and marketplaces. All endpoints are{' '}
            <span className="text-white/80">x402-protected</span> — a{' '}
            <code className="text-violet-300 bg-white/[0.06] px-1 rounded">402 Payment Required</code> response
            is expected until a valid payment is attached.
          </p>
          <p>
            Every response includes a{' '}
            <code className="text-violet-300 bg-white/[0.06] px-1 rounded">tier</code> field:
          </p>
          <div className="space-y-2">
            {[
              { value: 'evidence_ranked', color: '#39ff14', border: 'rgba(57,255,20,0.25)', bg: 'rgba(57,255,20,0.04)', desc: 'Verified GitHub activity, ecosystem relationships, sufficient signal coverage. Full ranking and evidence context.' },
              { value: 'indexed', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)', bg: 'rgba(255,255,255,0.02)', desc: 'Tracked but limited evidence. Score and rank may be absent or low-confidence.' },
              { value: 'archived', color: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.07)', bg: 'rgba(0,0,0,0)', desc: 'Reserved for future use.' },
            ].map((t) => (
              <div key={t.value} className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-xs" style={{ border: `1px solid ${t.border}`, background: t.bg }}>
                <code className="font-bold shrink-0 mt-0.5" style={{ color: t.color }}>{t.value}</code>
                <span className="text-white/40">{t.desc}</span>
              </div>
            ))}
          </div>
          <p>
            When available, trust-summary includes matched ERC-8004 registry context. ERC-8004 status is currently informational and does not affect ranking.
          </p>
          <p>
            Bazaar discovery metadata is present on all endpoints. Use{' '}
            <Link href="/for-agents" className="text-violet-400 hover:text-violet-300 transition-colors">
              the For Agents page →
            </Link>{' '}
            for a fuller integration overview.
          </p>
        </div>
      </section>

      {/* Error codes */}
      <section id="errors" className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">Error codes</h2>
        <div className="text-sm text-white/60 leading-relaxed">
          <div className="space-y-2">
            {[
              { code: '402', label: 'Payment Required', desc: 'No valid x402 payment provided. Check response headers for payment instructions.' },
              { code: '404', label: 'Not Found', desc: 'Agent handle does not exist in the AgentCrush index.' },
              { code: '500', label: 'Server Error', desc: 'Internal error. Retry with exponential backoff.' },
            ].map((e) => (
              <div
                key={e.code}
                className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <code className="text-xs font-bold text-amber-400 w-8 shrink-0">{e.code}</code>
                <span className="text-xs font-medium text-white/70 w-32 shrink-0">{e.label}</span>
                <span className="text-xs text-white/40">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 scroll-mt-24">Resources</h2>
        <div className="text-sm text-white/60 leading-relaxed space-y-2">
          <p>
            <a
              href="https://docs.cdp.coinbase.com/x402"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              x402 buyer integration guide →
            </a>{' '}
            — how to construct payments and use the x402 client SDK.
          </p>
          <p>
            <Link href="/rankings" className="text-violet-400 hover:text-violet-300 transition-colors">
              AgentCrush rankings →
            </Link>{' '}
            — browse the agent index to find valid handles.
          </p>
          <p>
            <Link href="/how-it-works" className="text-violet-400 hover:text-violet-300 transition-colors">
              How scores work →
            </Link>{' '}
            — methodology behind visibility, reputation, and weekly delta.
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.06] pt-8">
        <Link href="/rankings" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          ← Browse agents
        </Link>
        <Link href="/how-it-works" className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors">
          How rankings work →
        </Link>
      </div>
    </main>
  )
}
