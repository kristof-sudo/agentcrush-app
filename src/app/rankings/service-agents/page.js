import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Service Agent Rankings · AgentCrush',
  description:
    'Ranking of service agents — callable AI agents exposed via A2A protocol, Agentverse, ERC-8004, and x402 endpoints. Adoption, quality, activity, protocol breadth. Methodology v1.1.',
  alternates: { canonical: 'https://agentcrush.xyz/rankings/service-agents' },
  openGraph: {
    title: 'Service Agent Rankings · AgentCrush',
    description: 'Callable AI agents ranked by adoption, source quality, and cross-protocol presence.',
    url: 'https://agentcrush.xyz/rankings/service-agents',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Service Agent Rankings · AgentCrush', images: ['https://agentcrush.xyz/og-default.png'] },
}

const CAT_COLOR = '#f0a500'
const CAT_COLOR_RGBA = 'rgba(240,165,0,'
const OTHER_CATS = [
  { href: '/rankings/developer',       label: 'Developer',      color: '#00d4ff' },
  { href: '/rankings/model-families',  label: 'Model Families', color: '#a78bfa' },
  { href: '/rankings/tokenized-agents',label: 'Tokenized',      color: '#39ff14' },
]

function CornerAccent() {
  const s = `${CAT_COLOR_RGBA}0.35)`
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l" style={{ borderColor: s }} />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r" style={{ borderColor: s }} />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={{ borderColor: s }} />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={{ borderColor: s }} />
    </>
  )
}

function CoverageDot() {
  return <span className="text-white/25 text-xs" title="No data">⏳</span>
}

function StatusBadge({ status }) {
  const map = {
    live:    { label: 'LIVE',    cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
    next:    { label: 'NEXT',    cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
    planned: { label: 'PLANNED', cls: 'border-white/15 bg-white/[0.04] text-white/40' },
  }
  const m = map[status] || map.planned
  return <span className={`text-[10px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 border ${m.cls}`}>{m.label}</span>
}

const SIGNAL_SOURCES = [
  { name: 'Adoption',      weight: 25, status: 'live',    note: 'GitHub stars (A2A) OR Agentverse interactions. Log-scaled.' },
  { name: 'Source Quality',weight: 20, status: 'live',    note: 'A2A signal_strength OR Agentverse rating × 20.' },
  { name: 'Recency',       weight: 15, status: 'live',    note: 'Age-decay since last push or last-seen. 7d→100, 365d→20.' },
  { name: 'Protocol',      weight: 15, status: 'live',    note: 'Declared protocols/topics × 25.' },
  { name: 'Forks',         weight: 15, status: 'live',    note: 'GitHub forks log-scaled. Active engagement vs. passive starring.' },
  { name: 'Social',        weight: 10, status: 'planned', note: 'v1.2: X + Farcaster mention volume.' },
]

async function fetchData() {
  const supabase = supabaseAnon()
  const { data, error } = await supabase
    .from('agent_score_service_v1')
    .select('agent_id, handle, display_name, github_full_name, agentverse_id, a2a_stars, a2a_forks, av_interactions, av_rating, adoption_score, source_quality_score, activity_score, protocol_breadth_score, forks_score, social_score, service_score, rank_in_service, signals_available_count, evidence_ready_for_public_rank, methodology_version, primary_category, secondary_categories')
    .order('rank_in_service', { ascending: true })
  if (error) {
    const { data: agents } = await supabase
      .from('agents').select('id, handle, display_name, github_full_name, agentverse_id, primary_category, secondary_categories')
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
        methodology_version: 'v1.1-service-forks',
        primary_category: a.primary_category, secondary_categories: a.secondary_categories,
      })),
      viewMissing: true,
    }
  }
  return { rows: data || [], viewMissing: false }
}

function generateWeeklyStory(rows) {
  const evidenceRanked = rows.filter(r => r.evidence_ready_for_public_rank)
  if (!evidenceRanked.length) return null
  const sentences = []
  const leader = evidenceRanked[0]
  const name = leader.display_name || leader.handle
  sentences.push(`${name} leads service agents with a score of ${leader.service_score}.`)
  const gainer = rows.filter(r => (r.weekly_delta || 0) > 0 && r.handle !== leader.handle)
    .sort((a, b) => (b.weekly_delta || 0) - (a.weekly_delta || 0))[0]
  if (gainer) sentences.push(`${gainer.display_name || gainer.handle} climbed +${gainer.weekly_delta} to #${gainer.rank_in_service}.`)
  return sentences.join(' ') || null
}

export default async function ServiceRankingsPage() {
  const { rows: rawRows, viewMissing } = await fetchData()

  const handles = rawRows.map(r => r.handle).filter(Boolean)
  let deltaByHandle = {}
  if (handles.length > 0) {
    const supabase = supabaseAnon()
    const { data: agentDeltas } = await supabase.from('agents').select('handle, weekly_delta').in('handle', handles)
    deltaByHandle = Object.fromEntries((agentDeltas || []).map(a => [a.handle, a.weekly_delta || 0]))
  }

  const rows = rawRows.map(r => ({ ...r, weekly_delta: deltaByHandle[r.handle] || 0 }))
  const evidenceReadyCount = rows.filter(r => r.evidence_ready_for_public_rank).length
  const trackedCount = rows.length
  const risingCount = rows.filter(r => (r.weekly_delta || 0) > 0).length
  const weeklyStory = generateWeeklyStory(rows)
  const topRisers = rows.filter(r => (r.weekly_delta || 0) > 0).sort((a, b) => b.weekly_delta - a.weekly_delta).slice(0, 5)
  const topFallers = rows.filter(r => (r.weekly_delta || 0) < 0).sort((a, b) => a.weekly_delta - b.weekly_delta).slice(0, 5)

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'AgentCrush Service Agent Rankings',
    description: 'Callable service agents (A2A, Agentverse, x402, ERC-8004) ranked on adoption, quality, activity, protocol breadth, forks. v1.1.',
    url: 'https://agentcrush.xyz/rankings/service-agents',
    numberOfItems: evidenceReadyCount,
    isPartOf: { '@type': 'Dataset', '@id': 'https://agentcrush.xyz/methodology', name: 'AgentCrush Evidence-Ranked Index', license: 'https://agentcrush.xyz/terms', isAccessibleForFree: true },
    itemListElement: rows.filter(r => r.evidence_ready_for_public_rank).slice(0, 50).map(r => ({
      '@type': 'ListItem', position: r.rank_in_service,
      item: { '@type': 'SoftwareApplication', name: r.display_name || r.handle, url: `https://agentcrush.xyz/agent/${encodeURIComponent(r.handle)}`, applicationCategory: 'Service Agent' },
    })),
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: CAT_COLOR }}>TIER 02 · CATEGORY · SERVICE</span>
          <div style={{ flex: 1, height: 1, background: `${CAT_COLOR_RGBA}0.25)` }} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-michroma,'Michroma',sans-serif)" }}>
          Service Agent <span style={{ color: CAT_COLOR, textShadow: `0 0 20px ${CAT_COLOR_RGBA}0.5)` }}>Rankings</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          {evidenceReadyCount} evidence-ranked ·{' '}{trackedCount} total tracked ·{' '}
          <span style={{ color: '#4ade80' }}>{risingCount} rising</span>
          {' · '}
          <Link href="/methodology#service" className="text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">methodology v1.1 →</Link>
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 font-mono text-[11px]">
        <Link href="/rankings" className="text-white/35 hover:text-white/60 transition-colors">← All rankings</Link>
        <span className="text-white/15">·</span>
        <span className="text-white/50">Service</span>
      </div>

      {/* Evidence explanation */}
      <div className="mb-4 rounded-lg border px-4 py-3 font-mono text-[11px] text-white/50 leading-relaxed"
        style={{ borderColor: `${CAT_COLOR_RGBA}0.15)`, background: `${CAT_COLOR_RGBA}0.03)` }}>
        Rankings include service agents with ≥3 of 6 signals AND ≥1 adoption signal (GitHub stars &gt; 0 OR Agentverse interactions &gt; 0). Protocol-presence alone does not qualify — must show actual usage.{' '}
        <Link href="/methodology#service" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">Full methodology →</Link>
      </div>

      {/* Weekly Narrative */}
      {weeklyStory && (
        <div className="mb-4 relative rounded-lg bg-[#0a0a14] border border-white/[0.08] px-4 py-3 overflow-hidden">
          <CornerAccent />
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: CAT_COLOR }}>◆ WEEKLY NARRATIVE</span>
          </div>
          <p className="font-mono text-sm text-white/80 leading-relaxed">{weeklyStory}</p>
        </div>
      )}

      {/* Movers strip */}
      {(topRisers.length > 0 || topFallers.length > 0) && (
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topRisers.length > 0 && (
            <div className="relative rounded-lg bg-[#0a0a14] border border-white/[0.08] px-3 py-2.5 overflow-hidden">
              <CornerAccent />
              <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: CAT_COLOR }}>↑ RISING NOW</div>
              <div className="space-y-1.5">
                {topRisers.map(r => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] text-white/30 tabular-nums w-4 text-right shrink-0">
                        {r.rank_in_service ? `#${r.rank_in_service}` : '—'}
                      </span>
                      <span className="font-mono text-sm text-white/70 truncate">{r.display_name || r.handle}</span>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums shrink-0" style={{ color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.6)' }}>+{r.weekly_delta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topFallers.length > 0 && (
            <div className="relative rounded-lg bg-[#0a0a14] border border-white/[0.08] px-3 py-2.5 overflow-hidden">
              <CornerAccent />
              <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-red-400/60 mb-2">↓ BIGGEST FALLERS</div>
              <div className="space-y-1.5">
                {topFallers.map(r => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] text-white/30 tabular-nums w-4 text-right shrink-0">
                        {r.rank_in_service ? `#${r.rank_in_service}` : '—'}
                      </span>
                      <span className="font-mono text-sm text-white/70 truncate">{r.display_name || r.handle}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-red-400 tabular-nums shrink-0">{r.weekly_delta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signals reference — condensed */}
      <div className="mb-4">
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Signals</div>
        <div className="flex flex-wrap gap-1.5">
          {SIGNAL_SOURCES.map(s => (
            <span key={s.name} className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 font-mono text-[11px]">
              <span style={{ color: CAT_COLOR }}>{s.name}</span>
              <span className="text-white/30 tabular-nums">{s.weight}%</span>
              <StatusBadge status={s.status} />
            </span>
          ))}
        </div>
      </div>

      {viewMissing && (
        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 text-xs text-amber-300/80">
          Scoring view not yet applied — showing agent metadata only.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-8 text-center mb-6">
          <p className="text-sm text-white/55">No service agents tracked yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-6">
          <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/35">
            <span>#</span><span>Agent</span>
            <span className="text-right" title="Adoption">ADP</span>
            <span className="text-right" title="Source Quality">QUL</span>
            <span className="text-right" title="Activity">ACT</span>
            <span className="text-right" title="Protocol Breadth">PRO</span>
            <span className="text-right" title="Forks">FRK</span>
            <span className="text-right" title="Social">SOC</span>
            <span className="text-right">Score</span>
          </div>

          {rows.map(r => (
            <Link key={r.agent_id} href={`/agent/${encodeURIComponent(r.handle)}`}
              className="block border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors">
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
                    {(r.weekly_delta || 0) > 0 && <span className="font-mono text-[10px] font-bold text-emerald-400">+{r.weekly_delta}</span>}
                    {(r.weekly_delta || 0) < 0 && <span className="font-mono text-[10px] font-bold text-red-400">{r.weekly_delta}</span>}
                    {r.secondary_categories?.includes('service') && r.primary_category !== 'service' && (
                      <span className="text-[10px] uppercase tracking-wider text-white/35">secondary</span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/35 mt-0.5 truncate">
                    {r.github_full_name && (
                      <>GH: {r.github_full_name}
                        {r.a2a_stars > 0 && <span className="text-white/25"> · {r.a2a_stars.toLocaleString()}★</span>}
                        {r.a2a_forks > 0 && <span className="text-white/25"> · {r.a2a_forks.toLocaleString()} forks</span>}
                      </>
                    )}
                    {r.agentverse_id && <span> · AV: {r.agentverse_id.slice(0, 14)}…</span>}
                    {r.av_interactions > 0 && <span> · {r.av_interactions} interactions</span>}
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-white/55 w-10 text-right">{r.adoption_score != null ? r.adoption_score : <CoverageDot />}</span>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{r.source_quality_score != null ? r.source_quality_score : <CoverageDot />}</span>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{r.activity_score != null ? r.activity_score : <CoverageDot />}</span>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{r.protocol_breadth_score != null ? r.protocol_breadth_score : <CoverageDot />}</span>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{r.forks_score != null ? r.forks_score : <CoverageDot />}</span>
                <span className="text-xs font-mono tabular-nums w-10 text-right">{r.social_score != null ? r.social_score : <CoverageDot />}</span>
                <span className="text-sm font-mono font-bold tabular-nums text-white w-12 text-right">{r.service_score || '—'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Cross-link strip */}
      <div className="mt-8 border-t border-white/[0.06] pt-5">
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/30 mb-3">Other rankings</div>
        <div className="flex flex-wrap gap-2">
          {OTHER_CATS.map(c => (
            <Link key={c.href} href={c.href}
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-xs hover:border-white/20 transition-colors"
              style={{ color: c.color }}>
              {c.label} →
            </Link>
          ))}
          <Link href="/methodology#service" className="rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 font-mono text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
            Methodology →
          </Link>
        </div>
      </div>
    </main>
  )
}
