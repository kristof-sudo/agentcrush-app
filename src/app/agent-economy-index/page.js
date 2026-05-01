import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Agent Economy Index — AgentCrush',
  description:
    'Track AI agents, registries, protocols, and machine-readable credibility signals across the emerging agent economy.',
  openGraph: {
    title: 'Agent Economy Index — AgentCrush',
    description:
      'Track AI agents, registries, protocols, and machine-readable credibility signals across the emerging agent economy.',
    url: 'https://agentcrush.xyz/agent-economy-index',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Economy Index — AgentCrush',
    description:
      'Track AI agents, registries, protocols, and machine-readable credibility signals across the emerging agent economy.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

async function safeCount(supabase, table, filterFn) {
  try {
    const q = filterFn(supabase.from(table).select('id', { count: 'exact', head: true }))
    const { count, error } = await q
    return error ? null : (count ?? null)
  } catch {
    return null
  }
}

const TRACKED_SURFACES = [
  { name: 'Open-source / GitHub',                  status: 'Live',       note: 'commits, releases, stars, forks' },
  { name: 'npm / PyPI package usage',               status: 'Live',       note: 'download trends, weekly delta' },
  { name: 'Hacker News mentions',                   status: 'Live',       note: 'discourse signal, mention frequency' },
  { name: 'x402 endpoints / Bazaar',                status: 'Collecting', note: '3 AgentCrush endpoints live; all 3 in CDP discovery; Agentic.Market UI surfaces 1' },
  { name: 'ERC-8004 on-chain registry',             status: 'Collecting', note: 'v1 reader active; matched agents stored' },
  { name: 'Dependency graph',                       status: 'Collecting', note: 'shadow signal — not yet in public scoring' },
  { name: 'Documentation quality',                  status: 'Collecting', note: 'shadow signal — not yet in public scoring' },
  { name: 'External A2A / MCP activity',             status: 'Monitoring', note: 'AgentCrush MCP server live; external protocol ingestion not started' },
  { name: 'Agentverse / Fetch.ai',                  status: 'Monitoring', note: 'registry planned; not yet ingesting' },
  { name: 'Virtuals ACP / ERC-8183',               status: 'Monitoring', note: 'monitoring ecosystem; coverage not started' },
  { name: 'Daydreams / OpenServ / Giza',            status: 'Monitoring', note: 'monitoring; no structured data source yet' },
  { name: 'SURF / onchain sources',                 status: 'Planned',    note: 'on the roadmap' },
  { name: 'Bittensor / decentralised AI infra',     status: 'Planned',    note: 'on the roadmap' },
]

const STATUS_STYLE = {
  Live:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Collecting: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Monitoring: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Planned:    'bg-white/[0.04] text-white/30 border-white/[0.08]',
}

function SourceTag({ label }) {
  return (
    <span className="inline-block rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/30">
      {label}
    </span>
  )
}

function MetricCard({ label, value, sub, source }) {
  const display = value === null || value === undefined ? '—' : value.toLocaleString()
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white">{display}</p>
      {sub && <p className="text-xs text-white/35">{sub}</p>}
      <SourceTag label={source} />
    </div>
  )
}

export default async function AgentEconomyIndexPage() {
  const supabase = supabaseAnon()

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Parallel data fetches — all safe (nulls on error)
  const [
    totalIndexed,
    evidenceRanked,
    snapshotCount,
    { data: topMovers },
    { data: recentAgents },
  ] = await Promise.all([
    safeCount(supabase, 'agents', (q) => q.neq('tier', 'archived')),
    safeCount(supabase, 'agents', (q) => q.eq('tier', 'evidence_ranked')),
    safeCount(supabase, 'agent_daily_snapshots', (q) => q),
    supabase
      .from('agents')
      .select('handle, display_name, weekly_delta, tier')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(5),
    supabase
      .from('agents')
      .select('handle, display_name, created_at, tier')
      .neq('tier', 'archived')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // ERC-8004 needs service role (RLS-protected table)
  let erc8004Count = null
  if (SUPABASE_URL && SERVICE_KEY) {
    try {
      const svc = createClient(SUPABASE_URL, SERVICE_KEY)
      const { count } = await svc
        .from('agent_erc8004_registrations')
        .select('id', { count: 'exact', head: true })
      erc8004Count = count ?? null
    } catch { /* leave null */ }
  }

  const indexedOnly = totalIndexed !== null && evidenceRanked !== null
    ? totalIndexed - evidenceRanked
    : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">

      {/* Header */}
      <div className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
          V0 · Updated continuously
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Agent Economy Index</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          A protocol-neutral view of agent activity, adoption, and machine-readable credibility signals.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-white/40 leading-relaxed">
          AgentCrush tracks the agent economy across open-source projects, x402 services, ERC-8004
          registrations, A2A/MCP activity, and marketplaces. This early index is incomplete by design
          and labels evidence by source and collection status.
        </p>
      </div>

      {/* Metrics grid */}
      <section className="mb-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
          Index metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Indexed agents"
            value={totalIndexed}
            sub="All non-archived agents in index"
            source="AgentCrush database"
          />
          <MetricCard
            label="Evidence-ranked"
            value={evidenceRanked}
            sub="Agents with verifiable multi-signal evidence"
            source="AgentCrush database"
          />
          <MetricCard
            label="Indexed only"
            value={indexedOnly}
            sub="Discoverable via Explore; scoring pending"
            source="AgentCrush database"
          />
          <MetricCard
            label="Historical snapshots"
            value={snapshotCount}
            sub="Daily rank + score snapshots collected"
            source="AgentCrush database"
          />
          <MetricCard
            label="ERC-8004 mapped"
            value={erc8004Count}
            sub="On-chain agent registrations matched to index"
            source="Public registry + AgentCrush match"
          />
          <MetricCard
            label="x402 endpoints"
            value={3}
            sub="trust-summary · history · verification-status"
            source="AgentCrush x402 endpoint"
          />
        </div>
      </section>

      {/* Top movers */}
      {topMovers && topMovers.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
            Top movers this week
            <span className="ml-2 normal-case font-normal text-white/20">by weekly delta score</span>
          </h2>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
            {topMovers.map((a) => (
              <div key={a.handle} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/agent/${encodeURIComponent(a.handle)}`}
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  {a.display_name || a.handle}
                </Link>
                <div className="flex items-center gap-3">
                  {a.tier === 'evidence_ranked' && (
                    <span className="rounded border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-400">
                      Evidence
                    </span>
                  )}
                  <span className="font-mono text-sm font-semibold text-emerald-400">
                    +{a.weekly_delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/20">
            Source: AgentCrush snapshots · weekly delta = score change vs 7 days prior
          </p>
        </section>
      )}

      {/* Recently indexed */}
      {recentAgents && recentAgents.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
            Recently indexed
          </h2>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
            {recentAgents.map((a) => (
              <div key={a.handle} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/agent/${encodeURIComponent(a.handle)}`}
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  {a.display_name || a.handle}
                </Link>
                <span className="text-[10px] text-white/25">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/20">
            Source: AgentCrush database
          </p>
        </section>
      )}

      {/* Tracked surfaces */}
      <section className="mb-12">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/30">
          Tracked surfaces
        </h2>
        <p className="mb-4 text-xs text-white/25">
          Coverage is partial and evolving. Status reflects current collection depth, not completeness.
        </p>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
          {TRACKED_SURFACES.map((s) => (
            <div key={s.name} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-white/70">{s.name}</p>
                <p className="mt-0.5 text-[11px] text-white/30">{s.note}</p>
              </div>
              <span className={`mt-0.5 shrink-0 rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${STATUS_STYLE[s.status]}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Machine-readable note */}
      <section className="mb-12 rounded-xl border border-sky-500/20 bg-sky-500/[0.05] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-2">Machine-readable</p>
        <p className="text-sm text-white/60 leading-relaxed">
          AgentCrush exposes agent intelligence via x402 micropayment endpoints on Base mainnet.
          Any x402-compatible agent or client can query{' '}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs text-white/70">trust-summary</code>,{' '}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs text-white/70">history</code>, and{' '}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 text-xs text-white/70">verification-status</code>{' '}
          per-agent — paying per request in USDC.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/api-docs" className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            API docs →
          </Link>
          <Link href="/for-agents" className="text-xs font-semibold text-white/35 hover:text-white/60 transition-colors">
            For agents →
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="mb-10 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/30 leading-relaxed">
        <strong className="text-white/45">V0 · Incomplete by design.</strong>{' '}
        Metrics reflect what AgentCrush currently collects. Evidence tiers and source labels indicate
        collection method and reliability. Nothing here should be read as a claim about total agent
        economy volume or aggregate economic activity. Rankings and signals are informational only.
      </div>

      {/* Nav links */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-8 text-xs">
        <Link href="/rankings" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          Evidence Rankings →
        </Link>
        <Link href="/explore" className="text-white/40 hover:text-white/70 transition-colors">
          Explore All Agents →
        </Link>
        <Link href="/compare/crewai-vs-autogpt" className="text-white/40 hover:text-white/70 transition-colors">
          Compare Agents →
        </Link>
        <Link href="/how-we-rank" className="text-white/40 hover:text-white/70 transition-colors">
          How We Rank →
        </Link>
        <Link href="/api-docs" className="text-white/40 hover:text-white/70 transition-colors">
          API Docs →
        </Link>
        <Link href="/for-agents" className="text-white/40 hover:text-white/70 transition-colors">
          For Agents →
        </Link>
      </div>

    </main>
  )
}
