import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Service Agent Rankings · AgentCrush',
  description:
    'Ranking of service agents — callable AI agents exposed via A2A protocol, Agentverse, ERC-8004, and x402 endpoints. Adoption, quality, activity, protocol breadth.',
  alternates: {
    canonical: 'https://www.agentcrush.xyz/rankings/service-agents',
  },
  openGraph: {
    title: 'Service Agent Rankings · AgentCrush',
    description: 'Callable AI agents ranked by adoption, source quality, and cross-protocol presence.',
    url: 'https://www.agentcrush.xyz/rankings/service-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://www.agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AgentCrush Service Rankings' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Service Agent Rankings · AgentCrush',
    description: 'Callable AI agents ranked by adoption, quality, and cross-protocol presence.',
    images: ['https://www.agentcrush.xyz/og-default.png'],
  },
}

const SIGNAL_SOURCES = [
  {
    name: 'Adoption',
    weight: 25,
    status: 'live',
    note: 'GitHub stars (A2A protocol agents) or interaction count (Agentverse). Log-scaled. Higher of the two wins.',
    fields: ['adoption_score'],
  },
  {
    name: 'Source Quality',
    weight: 20,
    status: 'live',
    note: 'A2A signal_strength (0-100, based on stars + activity + topic match) OR Agentverse rating (0-5 → 0-100).',
    fields: ['source_quality_score'],
  },
  {
    name: 'Activity Recency',
    weight: 15,
    status: 'live',
    note: 'Time since most recent GitHub push or Agentverse last-seen. Recent = high score, dormant = low.',
    fields: ['activity_score'],
  },
  {
    name: 'Protocol Breadth',
    weight: 15,
    status: 'live',
    note: 'Count of declared protocols/topics (e.g. A2A, x402, MCP). Each protocol declared = +25 score.',
    fields: ['protocol_breadth_score'],
  },
  {
    name: 'Forks',
    weight: 15,
    status: 'live',
    note: 'GitHub fork count, log-scaled. Forks measure active engagement (use/modify) vs passive starring. For service agents that expose code, this is a stronger adoption signal than stars.',
    fields: ['forks_score'],
  },
  {
    name: 'Discourse / Social',
    weight: 10,
    status: 'planned',
    note: 'v1.1 will integrate X + Farcaster mention volume for service agents.',
    fields: ['social_score'],
  },
]

function StatusBadge({ status }) {
  const map = {
    live:      { label: 'LIVE',     cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
    'live-v0': { label: 'LIVE v0',  cls: 'border-violet-400/40 bg-violet-400/10 text-violet-300' },
    next:      { label: 'NEXT',     cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
    planned:   { label: 'PLANNED',  cls: 'border-white/15 bg-white/[0.04] text-white/40' },
  }
  const m = map[status] || map.planned
  return (
    <span className={`text-[10px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 border ${m.cls}`}>
      {m.label}
    </span>
  )
}

function CoverageDot({ available }) {
  return available
    ? <span className="text-emerald-400 text-xs" title="Signal available">✓</span>
    : <span className="text-white/25 text-xs" title="No data">⏳</span>
}

async function fetchData() {
  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('agent_score_service_v1')
    .select('agent_id, handle, display_name, github_full_name, agentverse_id, a2a_stars, a2a_forks, a2a_signal_strength, a2a_last_pushed_at, av_interactions, av_rating, adoption_score, source_quality_score, activity_score, protocol_breadth_score, forks_score, social_score, service_score, rank_in_service, signals_available_count, evidence_ready_for_public_rank, methodology_version, primary_category, secondary_categories')
    .order('rank_in_service', { ascending: true })
  if (error) {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, handle, display_name, github_full_name, agentverse_id, primary_category, secondary_categories')
      .or('primary_category.eq.service,secondary_categories.cs.{service}')
    return {
      rows: (agents || []).map(a => ({
        agent_id: a.id, handle: a.handle, display_name: a.display_name,
        github_full_name: a.github_full_name, agentverse_id: a.agentverse_id,
        a2a_stars: null, a2a_forks: null, av_interactions: null, av_rating: null,
        adoption_score: null, source_quality_score: null, activity_score: null,
        protocol_breadth_score: null, forks_score: null, social_score: null,
        service_score: 0, rank_in_service: 0,
        signals_available_count: 0, evidence_ready_for_public_rank: false,
        methodology_version: 'v1.0-service-v0 (view pending)',
      })),
      viewMissing: true,
    }
  }
  return { rows: data || [], viewMissing: false }
}

export default async function ServiceRankingsPage() {
  const { rows, viewMissing } = await fetchData()
  const evidenceReadyCount = rows.filter(r => r.evidence_ready_for_public_rank).length
  const trackedCount = rows.length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AgentCrush Service Agent Rankings',
    description: 'Callable service agents (A2A, Agentverse, x402, ERC-8004) ranked on adoption, source quality, activity, protocol breadth, forks, social. Methodology v1.1.',
    url: 'https://www.agentcrush.xyz/rankings/service-agents',
    numberOfItems: evidenceReadyCount,
    isPartOf: { '@type': 'Dataset', '@id': 'https://www.agentcrush.xyz/methodology', name: 'AgentCrush Evidence-Ranked Index' },
    itemListElement: rows.filter(r => r.evidence_ready_for_public_rank).slice(0, 50).map((r) => ({
      '@type': 'ListItem',
      position: r.rank_in_service,
      item: {
        '@type': 'SoftwareApplication',
        name: r.display_name || r.handle,
        url: `https://www.agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`,
        applicationCategory: 'Service Agent',
        aggregateRating: r.service_score > 0 ? { '@type': 'AggregateRating', ratingValue: (r.service_score / 10).toFixed(1), bestRating: 10, worstRating: 0, ratingCount: 1 } : undefined,
      },
    })),
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6 text-white">

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/rankings" className="hover:text-white/50 transition-colors">Rankings</Link>
        <span className="mx-2 text-white/15">/</span>
        Service agents
      </p>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">
          Category · service agents
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Service Agent Rankings
        </h1>
        <p className="mt-3 text-sm text-white/50 max-w-2xl leading-relaxed">
          Service agents expose callable endpoints — they're functional, not economic, and not knowledge artefacts. They live on protocols (A2A, Agentverse, x402, ERC-8004, MCP) and earn ranking through actual adoption, source quality, ongoing activity, and how many service surfaces they're discoverable on.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-300">v1.0 — LIVE</span>
          <span className="text-xs text-white/40">methodology: {rows[0]?.methodology_version || 'v1.0-service-v0'}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          <span className="font-mono text-emerald-300">{trackedCount}</span> service agents tracked · <span className="font-mono text-emerald-300">{evidenceReadyCount}</span> evidence-ranked. Currently sourced from A2A protocol agents (GitHub-discovered) and Agentverse (Fetch.ai). v1.1 will add ERC-8004 registry agents and Bazaar x402 endpoints as additional service surfaces.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Methodology</h2>
        <p className="text-sm text-white/45 mb-4">
          Composite is a weighted blend of six service-agent signals. Sub-scores are published; every weight is documented.
        </p>

        <div className="space-y-2.5">
          {SIGNAL_SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex flex-wrap items-baseline gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3"
            >
              <span className="text-base font-semibold text-white w-44 shrink-0">{s.name}</span>
              <span className="text-xs font-mono text-violet-400 tabular-nums w-12">{s.weight}%</span>
              <StatusBadge status={s.status} />
              <span className="text-xs text-white/45 flex-1 min-w-[200px]">{s.note}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-white/[0.05] bg-white/[0.01] px-4 py-3">
          <p className="text-xs font-semibold text-white/55 mb-1">Evidence-ready rule</p>
          <p className="text-xs text-white/45 leading-relaxed">
            A service agent is evidence-ranked when at least <span className="text-white/70">3 of 6 signals are present</span> AND at least one is an <span className="text-white/70">adoption signal</span> (GitHub stars &gt; 0 OR Agentverse interactions &gt; 0). Pure protocol-presence ≠ evidence-ranked — must show actual usage.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">Tracked service agents ({trackedCount})</h2>
        <p className="text-sm text-white/45 mb-4">
          Current coverage. Sub-scores visible per agent — methodology shows its work.
        </p>

        {viewMissing && (
          <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 text-xs text-amber-300/80">
            View migration <code className="bg-white/[0.04] px-1 rounded">20260516_1700_service_scoring_view.sql</code> not yet applied — showing agent metadata only.
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-sm text-white/55">No service agents tracked yet.</p>
            <p className="text-xs text-white/30 mt-2">
              Tracked agents will appear here as A2A and Agentverse promoter pipelines run.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
              <span>#</span>
              <span>Agent</span>
              <span className="text-right" title="Adoption">ADP</span>
              <span className="text-right" title="Source Quality">QUL</span>
              <span className="text-right" title="Activity">ACT</span>
              <span className="text-right" title="Protocol Breadth">PRO</span>
              <span className="text-right" title="Forks (engagement)">FRK</span>
              <span className="text-right" title="Social">SOC</span>
              <span className="text-right">Score</span>
            </div>

            {rows.map((r) => (
              <Link
                key={r.agent_id}
                href={`/agent/${encodeURIComponent(r.handle)}`}
                className="block border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 items-center px-4 py-3">
                  <span className="text-xs font-mono text-white/35 w-6 tabular-nums">
                    {r.evidence_ready_for_public_rank ? `#${r.rank_in_service}` : '—'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.display_name || r.handle}</span>
                      {r.evidence_ready_for_public_rank ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">evidence-ranked</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/[0.04] border border-white/[0.07] rounded px-1.5 py-0.5">indexed</span>
                      )}
                      {r.secondary_categories?.includes('service') && r.primary_category !== 'service' && (
                        <span className="text-[10px] uppercase tracking-wider text-white/35">secondary</span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/35 mt-0.5 truncate">
                      {r.github_full_name && <span>GH: {r.github_full_name}{r.a2a_stars > 0 && <span className="text-white/25"> · {r.a2a_stars.toLocaleString()}★</span>}{r.a2a_forks > 0 && <span className="text-white/25"> · {r.a2a_forks.toLocaleString()} forks</span>}</span>}
                      {r.agentverse_id && <span> · AV: {r.agentverse_id.slice(0, 14)}…</span>}
                      {r.av_interactions > 0 && <span> · {r.av_interactions} interactions</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-white/55 w-10 text-right">
                    {r.adoption_score != null ? r.adoption_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.source_quality_score != null ? r.source_quality_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.activity_score != null ? r.activity_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.protocol_breadth_score != null ? r.protocol_breadth_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.forks_score != null ? r.forks_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-xs font-mono tabular-nums w-10 text-right">
                    {r.social_score != null ? r.social_score : <CoverageDot available={false} />}
                  </span>
                  <span className="text-sm font-mono font-bold tabular-nums text-white w-12 text-right">
                    {r.service_score || '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-1">v1.2 roadmap</h2>
        <p className="text-sm text-white/45 mb-4">
          v1.1 ships with concrete engagement signals (forks replaced the cross-protocol placeholder). v1.2 layers in cross-protocol presence + ecosystem reach.
        </p>

        <ol className="space-y-3 text-sm text-white/55">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-violet-400/80 mt-0.5 w-12 shrink-0">+1</span>
            <span><span className="text-white/85">Cross-protocol presence (activate)</span> — currently tracked in <code className="bg-white/[0.04] px-1 rounded">cross_protocol_presence</code> table but unweighted in composite. Will activate as service agents start appearing on multiple surfaces beyond their source.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+2</span>
            <span><span className="text-white/85">ERC-8004 + Bazaar as service surfaces</span> — 29K on-chain Base agents + 46K x402 endpoints. Treats paid endpoint as adoption proof.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-white/45 mt-0.5 w-12 shrink-0">+3</span>
            <span><span className="text-white/85">Contributor + commit-recency from GitHub</span> — deeper code-health signals beyond raw forks.</span>
          </li>
        </ol>
      </section>

      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/rankings" className="hover:text-white/70 transition-colors">All Rankings →</Link>
        <Link href="/rankings/model-families" className="hover:text-white/70 transition-colors">Model Families →</Link>
        <Link href="/rankings/tokenized-agents" className="hover:text-white/70 transition-colors">Tokenized →</Link>
        <Link href="/labs" className="hover:text-white/70 transition-colors">Labs →</Link>
      </div>

    </main>
  )
}
