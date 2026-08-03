/**
 * /ghost-index — AgentCrush Ghost Index
 *
 * The % of indexed AI agents showing signs of life.
 * Updated daily. Only AgentCrush can produce this number.
 *
 * Mobile-first, 390px primary.
 */

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import IndexFamilyStrip from '@/components/IndexFamilyStrip'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export const metadata = {
  title: 'Ghost Index · AgentCrush',
  description: 'What % of indexed AI agents are actually alive? The AgentCrush Ghost Index measures liveness daily across 1,400+ indexed agents. Updated every 24h.',
  alternates: { canonical: 'https://agentcrush.xyz/ghost-index' },
  openGraph: {
    title: 'AgentCrush Ghost Index',
    description: 'The % of indexed AI agents showing signs of life. Updated daily.',
    url: 'https://agentcrush.xyz/ghost-index',
    siteName: 'AgentCrush',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentCrush Ghost Index',
    description: 'What % of the agent economy is actually alive?',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'AgentCrush Ghost Index',
  description: 'Daily liveness measurement of the AI agent ecosystem. Measures what % of indexed agents show observable activity signals.',
  url: 'https://agentcrush.xyz/ghost-index',
  creator: { '@type': 'Organization', name: 'AgentCrush', url: 'https://agentcrush.xyz' },
  distribution: {
    '@type': 'DataDownload',
    encodingFormat: 'application/json',
    contentUrl: 'https://agentcrush.xyz/api/ghost-index/v1',
  },
  temporalCoverage: '2026-06-07/..',
  measurementTechnique: 'activity_status field + last_event_at timestamp from AgentCrush index pipeline',
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function getGhostData() {
  const sb = supabase()

  // Latest snapshot
  const { data: latest } = await sb
    .from('ghost_index_daily')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  // 30-day history for sparkline
  const { data: history } = await sb
    .from('ghost_index_daily')
    .select('snapshot_date, liveness_score, total_agents, alive_agents')
    .order('snapshot_date', { ascending: true })
    .limit(30)

  // Fallback: compute live from view
  if (!latest) {
    const { data: live } = await sb.from('ghost_index_live').select('*').single()
    return { current: live, history: [], fromLive: true }
  }

  return { current: latest, history: history || [], fromLive: false }
}

function sentimentLabel(score) {
  if (score < 10)  return { label: 'Graveyard',  color: '#ef4444', bg: 'bg-red-500/10',    border: 'border-red-500/20' }
  if (score < 25)  return { label: 'Haunted',    color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
  if (score < 50)  return { label: 'Struggling', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
  if (score < 75)  return { label: 'Active',     color: '#22c55e', bg: 'bg-green-500/10',  border: 'border-green-500/20' }
  return            { label: 'Thriving',          color: '#00d4ff', bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' }
}

const CATEGORY_LABELS = {
  developer:    'Developer',
  tokenized:    'Tokenized',
  service:      'Service',
  model_family: 'Model Families',
  mcp_server:   'MCP Servers',
}

const CATEGORY_COLORS = {
  developer:    '#00d4ff',
  tokenized:    '#39ff14',
  service:      '#f0a500',
  model_family: '#a78bfa',
  mcp_server:   '#f97316',
}

// Categories with no liveness signal yet (no GitHub repo / activity feed) — showing
// '0% alive' would be a measurement artifact, not real signal, so we mark them pending.
// Service now has GitHub liveness from the refresh worker; only tokenized remains.
const INGESTION_PENDING_CATEGORIES = new Set(['tokenized'])

export default async function GhostIndexPage() {
  let ghostData
  try {
    ghostData = await getGhostData()
  } catch (_) {
    ghostData = null
  }

  const current = ghostData?.current
  const history = ghostData?.history ?? []

  const score = current ? Number(current.liveness_score) : null
  const sentiment = score != null ? sentimentLabel(score) : null
  const categories = current?.category_breakdown ?? {}

  // 7-day delta from history (needs 8+ daily snapshots)
  const delta7d = (score != null && history.length >= 8)
    ? Number((score - Number(history[history.length - 8].liveness_score)).toFixed(1))
    : null

  // Sparkline: normalize to 0-100 for SVG height
  const maxScore = history.length ? Math.max(...history.map(h => Number(h.liveness_score)), 30) : 30
  const sparkPoints = history.map((h, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * 280
    const y = 40 - (Number(h.liveness_score) / maxScore) * 36
    return `${x},${y}`
  }).join(' ')

  const totalAgents    = current?.total_agents    ?? 1413
  const aliveAgents    = current?.alive_agents    ?? 787
  const ghostAgents    = current?.ghost_agents    ?? (totalAgents - aliveAgents)
  const evidenceRanked = current?.evidence_ranked ?? 165
  const indexedOnly    = current?.indexed_only    ?? 1248

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">

        {/* Breadcrumb */}
        <p className="text-xs font-mono text-white/25 mb-6">
          <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
          <span className="mx-2 text-white/15">/</span>
          Ghost Index
        </p>

        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
          AgentCrush
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-1">
          Ghost Index
        </h1>
        <p className="text-sm text-white/45 mb-8">
          What % of indexed AI agents are actually alive?
        </p>

        <IndexFamilyStrip current="ghost" />

        {/* ── Main score card ── */}
        <div className={`rounded-2xl border ${sentiment?.border ?? 'border-white/[0.07]'} ${sentiment?.bg ?? 'bg-white/[0.02]'} px-6 py-8 mb-6 text-center`}>

          {score != null ? (
            <>
              <div className="text-[80px] md:text-[96px] font-black leading-none tracking-tighter mb-2"
                   style={{ color: sentiment?.color }}>
                {score}<span className="text-[40px] md:text-[48px] font-bold text-white/40">%</span>
              </div>
              <p className="text-lg font-semibold mb-1" style={{ color: sentiment?.color }}>
                {sentiment?.label}
                {delta7d != null && delta7d !== 0 && (
                  <span className={`ml-3 align-middle text-xs font-mono font-bold rounded px-2 py-0.5 border ${
                    delta7d > 0
                      ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
                      : 'text-red-300 border-red-400/30 bg-red-400/10'
                  }`}>
                    {delta7d > 0 ? '▲' : '▼'} {delta7d > 0 ? '+' : ''}{delta7d} pp vs 7d ago
                  </span>
                )}
              </p>
              <p className="text-sm text-white/45">
                {aliveAgents.toLocaleString()} of {totalAgents.toLocaleString()} indexed agents show signs of life
              </p>
            </>
          ) : (
            <>
              <div className="text-[80px] font-black leading-none tracking-tighter mb-2 text-white/20">
                —<span className="text-[40px] font-bold">%</span>
              </div>
              <p className="text-sm text-white/30">Migration pending — apply migrations/20260607_1400_ghost_index.sql</p>
            </>
          )}

          {/* Sparkline */}
          {history.length > 1 && (
            <div className="mt-6">
              <svg viewBox="0 0 280 44" className="w-full h-10 opacity-60" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke={sentiment?.color ?? '#ffffff'}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={sparkPoints}
                />
              </svg>
              <p className="text-[10px] text-white/25 font-mono mt-1">30-day liveness</p>
            </div>
          )}
        </div>

        {/* ── How to read this number ── */}
        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 mb-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">What this number means</h2>
          <div className="space-y-3 text-sm text-white/50 leading-relaxed">
            <p>
              <span className="text-white/80 font-semibold">A low number is the finding, not a flaw.</span>{' '}
              The agent economy is young: projects announce far faster than they ship and keep running.
              Most indexed agents are announcements, hackathon prototypes, or repos that went quiet.
              The Ghost Index measures that gap — every day, against the same bar.
            </p>
            <p>
              <span className="text-white/80 font-semibold">It&apos;s the macro gauge of agent-economy maturity.</span>{' '}
              As agents start earning revenue and running continuously, liveness rises. The day this
              number crosses 50%, the agent economy will have actually arrived. Until then, it tells
              you exactly how early you are.
            </p>
            <p>
              <span className="text-white/80 font-semibold">Ghosts are why the index matters.</span>{' '}
              Indexing everything — including the dead — is what makes the {aliveAgents.toLocaleString()} alive
              agents meaningful, and what lets us show deaths and resurrections over time instead of
              a flattering snapshot.
            </p>
          </div>
        </section>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total indexed', value: totalAgents.toLocaleString() },
            { label: 'Alive',         value: aliveAgents.toLocaleString(),    color: '#22c55e' },
            { label: 'Ghost agents',  value: ghostAgents.toLocaleString(),    color: '#ef4444' },
            { label: 'Evidence-ranked', value: evidenceRanked.toLocaleString(), color: '#00d4ff' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3">
              <p className="text-xl font-bold font-mono" style={{ color: color || '#ffffff' }}>{value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Ghost Report teaser ── */}
        <Link
          href="/ghost-report"
          className="group flex items-center justify-between gap-4 rounded-lg border border-[rgba(249,115,22,0.25)] bg-gradient-to-br from-[#f97316]/[0.06] to-transparent px-5 py-4 mb-8 hover:border-[rgba(249,115,22,0.45)] transition-colors"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]/80 mb-1">The Ghost Report</p>
            <p className="text-sm text-white/70 leading-snug">
              Famous AI agents that went dark — the most-starred repos with no public signal in 90+ days.
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs font-bold text-[#f97316]/80 group-hover:text-[#f97316] transition-colors">Read →</span>
        </Link>

        {/* ── Category breakdown ── */}
        {Object.keys(categories).length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">By Category</h2>
            <div className="space-y-2">
              {Object.entries(categories)
                .sort((a, b) => Number(b[1].total) - Number(a[1].total))
                .map(([cat, data]) => {
                  const pct = Number(data.liveness)
                  const color = CATEGORY_COLORS[cat] || '#ffffff'
                  const pending = INGESTION_PENDING_CATEGORIES.has(cat)
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/40 w-28 shrink-0">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        {!pending && (
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color + 'aa' }}
                          />
                        )}
                      </div>
                      {pending ? (
                        <>
                          <span className="text-[10px] font-mono font-semibold text-white/30 w-12 text-right" title="Liveness ingestion not yet wired for this category">
                            —
                          </span>
                          <span className="text-[10px] text-white/25 font-mono w-20 text-right" title="Activity ingestion pending — see /methodology#ingestion-coverage">
                            pending
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-mono font-semibold w-12 text-right"
                                style={{ color }}>
                            {pct}%
                          </span>
                          <span className="text-[10px] text-white/25 font-mono w-20 text-right">
                            {data.alive}/{data.total}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
            {/* Pending-ingestion disclosure */}
            {Object.keys(categories).some(c => INGESTION_PENDING_CATEGORIES.has(c)) && (
              <p className="text-[11px] text-white/30 mt-3 leading-relaxed">
                <span className="font-mono text-white/45">pending</span> means liveness ingestion isn&apos;t yet wired for this category — the agents are indexed but we have no activity signal to score them. <Link href="/methodology#ingestion-coverage" className="text-[#00d4ff]/70 hover:text-[#00d4ff]">methodology →</Link>
              </p>
            )}
          </section>
        )}

        {/* ── Hype Gap ── */}
        <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Vaporware Ratio</h2>
            <span className="text-[10px] font-mono text-white/25">indexed vs evidence-ranked</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
                <div
                  className="h-full rounded-l-full"
                  style={{
                    width: `${Math.round((evidenceRanked / Math.max(totalAgents, 1)) * 100)}%`,
                    backgroundColor: '#00d4ff88',
                  }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold font-mono text-[#00d4ff]">
                {Math.round((evidenceRanked / Math.max(totalAgents, 1)) * 100)}%
              </p>
              <p className="text-[10px] text-white/30">have evidence</p>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mt-3 leading-relaxed">
            {evidenceRanked} of {totalAgents.toLocaleString()} indexed agents have enough signals to be evidence-ranked.
            The remaining {(totalAgents - evidenceRanked).toLocaleString()} are indexed but unscored — a ghost waiting for data.
          </p>
        </section>

        {/* ── Methodology ── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Methodology v1.0</h2>
          <div className="space-y-2 text-sm text-white/45 leading-relaxed">
            <p>
              <span className="text-white/70 font-semibold">Alive</span> — an agent is considered alive if{' '}
              <span className="font-mono text-white/60">activity_status = &apos;active&apos;</span>{' '}
              or{' '}
              <span className="font-mono text-white/60">last_event_at</span>{' '}
              is within the last 30 days. Activity signals are sourced from GitHub push events, on-chain transactions,
              social posts, and direct agent API pings.
            </p>
            <p>
              <span className="text-white/70 font-semibold">Ghost</span> — everything else. No observable activity signal
              in 30 days, or never had one. This is a lower bound: absence of signal ≠ confirmed dormant.
              An agent running privately without public signals grades as ghost.
            </p>
            <p>
              <span className="text-white/70 font-semibold">Updated</span> — daily at 23:50 UTC by the AgentCrush
              indexing pipeline. The score you see is at most 24h old.
            </p>
          </div>
        </section>

        {/* ── API ── */}
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">Machine-readable</p>
          <div className="space-y-2">
            {[
              { label: 'Current score + history',  url: '/api/ghost-index/v1',               note: 'JSON · free · CORS-open' },
              { label: 'Real-time (no cache)',      url: '/api/ghost-index/v1?live=true',     note: 'computes from live DB' },
              { label: '90-day history',            url: '/api/ghost-index/v1?history=90',    note: '' },
            ].map(({ label, url, note }) => (
              <div key={url} className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/50">{label}</span>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono text-[#00d4ff]/70">{url}</code>
                  {note && <span className="text-[10px] text-white/25">{note}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/35">
          <Link href="/rankings" className="hover:text-white/70 transition-colors">Rankings →</Link>
          <Link href="/agent-economy-index" className="hover:text-white/70 transition-colors">Agent Economy Index →</Link>
          <Link href="/methodology" className="hover:text-white/70 transition-colors">Methodology →</Link>
          <Link href="/ghost-report" className="hover:text-white/70 transition-colors">Ghost Report →</Link>
          <a href="/api/ghost-index/v1" className="hover:text-white/70 transition-colors text-[#00d4ff]/40">API →</a>
        </div>

      </main>
    </>
  )
}
