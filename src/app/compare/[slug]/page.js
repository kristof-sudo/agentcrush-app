import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAgentArchetype, getAgentDisplayName } from '@/lib/agent-quality'
import EvidenceBadge from '@/components/ui/EvidenceBadge'
import IndexedBadge from '@/components/ui/IndexedBadge'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function anonDb()    { return createClient(SUPABASE_URL, ANON_KEY) }
function serviceDb() { return createClient(SUPABASE_URL, SERVICE_KEY) }

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/${path}` : null
}

// "crewai-vs-autogpt" → ["crewai", "autogpt"] via first occurrence of "-vs-"
function parseSlug(slug) {
  const idx = slug.indexOf('-vs-')
  if (idx < 1) return null
  const h1 = slug.slice(0, idx).trim()
  const h2 = slug.slice(idx + 4).trim()
  if (!h1 || !h2) return null
  return [h1, h2]
}

async function fetchAgentFull(supabase, handle) {
  const { data: agent } = await supabase
    .from('agents')
    .select(`id, handle, display_name, archetype, avatar_url, custom_background_url,
             visibility_score, reputation_score, weekly_delta, bio, tagline,
             ecosystem_layer, tier, verified, claim_status, identity_status,
             github_url, website_url`)
    .ilike('handle', handle)
    .maybeSingle()

  if (!agent) return null

  const since30d = new Date()
  since30d.setDate(since30d.getDate() - 30)

  const [rankingRes, eventsRes, historyRes, v2Res] = await Promise.all([
    supabase.from('rankings')
      .select('global_rank, score_total, score_visibility, score_reputation')
      .eq('agent_id', agent.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('events')
      .select('event_type, created_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('rankings')
      .select('global_rank, score_total, computed_at')
      .eq('agent_id', agent.id)
      .gte('computed_at', since30d.toISOString())
      .order('computed_at', { ascending: true }),

    supabase.from('agent_score_v2_top50_public_candidate')
      .select('rank_v2_c_public, score_v2_c_public_candidate, coverage_tier, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score')
      .eq('handle', agent.handle)
      .maybeSingle(),
  ])

  const ranking = rankingRes.data
  const v2      = v2Res.data
  const histRows = historyRes.data || []
  const histFirst = histRows[0] ?? null
  const histLast  = histRows[histRows.length - 1] ?? null

  const isEvidenceRanked = !!v2
  const globalRank  = v2?.rank_v2_c_public ?? ranking?.global_rank ?? null
  const scoreTotal  = v2?.score_v2_c_public_candidate ?? ranking?.score_total
    ?? ((agent.visibility_score || 0) + (agent.reputation_score || 0))

  let trend30d = 'flat'
  if (histFirst && histLast && histFirst.score_total > 0) {
    if (histLast.score_total > histFirst.score_total * 1.05) trend30d = 'rising'
    else if (histLast.score_total < histFirst.score_total * 0.95) trend30d = 'falling'
  }

  return {
    ...agent,
    display_name:   getAgentDisplayName(agent),
    archetype:      getAgentArchetype(agent),
    avatar_url:     toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
    global_rank:    globalRank,
    score_total:    scoreTotal,
    score_visibility: ranking?.score_visibility ?? agent.visibility_score ?? 0,
    score_reputation: ranking?.score_reputation ?? agent.reputation_score ?? 0,
    recent_events:  eventsRes.data || [],
    is_evidence_ranked: isEvidenceRanked,
    coverage_tier:  v2?.coverage_tier ?? null,
    github_score:   v2?.github_score ?? null,
    pkg_score:      v2?.package_usage_score ?? null,
    dep_score:      v2?.dependency_score ?? null,
    eco_score:      v2?.ecosystem_score ?? null,
    doc_score:      v2?.docs_quality_score ?? null,
    hn_score:       v2?.hn_score ?? null,
    history_days:   histRows.length,
    rank_30d_ago:   histFirst?.global_rank ?? null,
    rank_current:   histLast?.global_rank ?? globalRank,
    score_30d_ago:  histFirst?.score_total ?? 0,
    trend30d,
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const parsed = parseSlug(slug)
  if (!parsed) return {}
  const [h1, h2] = parsed
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const supabase = anonDb()
  const [r1, r2] = await Promise.all([
    supabase.from('agents').select('display_name').ilike('handle', h1).maybeSingle(),
    supabase.from('agents').select('display_name').ilike('handle', h2).maybeSingle(),
  ])
  const name1 = r1.data?.display_name || cap(h1)
  const name2 = r2.data?.display_name || cap(h2)
  const title = `${name1} vs ${name2} — AI Agent Comparison | AgentCrush`
  const description = `Compare ${name1} and ${name2} by rank, evidence signals, ecosystem context, and AgentCrush intelligence.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://agentcrush.xyz/compare/${slug}`,
      siteName: 'AgentCrush',
      images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: `${name1} vs ${name2} — AgentCrush` }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description, images: ['https://agentcrush.xyz/og-default.png'] },
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SignalBar({ label, value, max }) {
  if (value == null) {
    return (
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-wider">{label}</span>
          <span className="font-mono text-[9px] text-white/20">—</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.05]" />
      </div>
    )
  }
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color = value >= 70 ? '#4ade80' : value >= 40 ? '#fbbf24' : '#f87171'
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[9px] text-white/40 uppercase tracking-wider">{label}</span>
        <span className="font-mono text-[9px] text-white/60 tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.07]">
        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}88` }} />
      </div>
    </div>
  )
}

const EVENT_LABELS = {
  repo_star_growth: 'Repo spike', audience_spike: 'X mention spike', launch_buzz: 'Launch buzz',
  ranking_jump: 'Ranking jump', repo_release: 'New release', timeline_ping: 'Ecosystem mention',
  ecosystem_integration: 'Integration', collab_win: 'Collaboration', dev_activity: 'Dev activity',
  daily_boost: 'Momentum', canon_scene: 'Ecosystem milestone',
}

function formatTimeAgo(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function TrendLabel({ trend }) {
  if (trend === 'rising')  return <span className="text-emerald-400 font-semibold">↑ Rising</span>
  if (trend === 'falling') return <span className="text-red-400 font-semibold">↓ Falling</span>
  return <span className="text-white/30">→ Flat</span>
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CompareSlugPage({ params }) {
  const { slug } = await params
  const parsed = parseSlug(slug)
  if (!parsed) notFound()

  const [h1, h2] = parsed
  if (h1.toLowerCase() === h2.toLowerCase()) notFound()

  const supabase = anonDb()
  const [agentA, agentB] = await Promise.all([
    fetchAgentFull(supabase, h1),
    fetchAgentFull(supabase, h2),
  ])

  if (!agentA || !agentB) notFound()

  // ERC-8004 (service role — table has RLS, no public SELECT policy)
  let erc8004A = null
  let erc8004B = null
  try {
    const svc = serviceDb()
    const [r1, r2] = await Promise.all([
      svc.from('agent_erc8004_registrations')
        .select('chain_id, chain_name, token_id, x402_supported, match_confidence')
        .eq('agent_id', agentA.id)
        .order('match_confidence', { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc.from('agent_erc8004_registrations')
        .select('chain_id, chain_name, token_id, x402_supported, match_confidence')
        .eq('agent_id', agentB.id)
        .order('match_confidence', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    erc8004A = r1.data ?? null
    erc8004B = r2.data ?? null
  } catch { /* safe to ignore */ }

  const agents    = [agentA, agentB]
  const erc8004s  = [erc8004A, erc8004B]
  const maxScore  = Math.max(agentA.score_total || 0, agentB.score_total || 0, 1)
  const hasV2     = agentA.is_evidence_ranked || agentB.is_evidence_ranked
  const maxGh     = Math.max(agentA.github_score || 0, agentB.github_score || 0, 1)
  const maxPkg    = Math.max(agentA.pkg_score || 0, agentB.pkg_score || 0, 1)
  const maxDep    = Math.max(agentA.dep_score || 0, agentB.dep_score || 0, 1)
  const maxEco    = Math.max(agentA.eco_score || 0, agentB.eco_score || 0, 1)
  const maxDoc    = Math.max(agentA.doc_score || 0, agentB.doc_score || 0, 1)
  const maxHn     = Math.max(agentA.hn_score || 0, agentB.hn_score || 0, 1)

  // JSON-LD for LLM retrieval
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${agentA.display_name || agentA.handle} vs ${agentB.display_name || agentB.handle}`,
    description: `Side-by-side comparison of ${agentA.display_name || agentA.handle} and ${agentB.display_name || agentB.handle} across AgentCrush's public evidence signals. Activity, package usage, dependency adoption, docs quality, ecosystem links, discourse.`,
    url: `https://www.agentcrush.xyz/compare/${slug}`,
    dateModified: new Date().toISOString().slice(0, 10),
    author: { '@type': 'Organization', name: 'AgentCrush' },
    publisher: { '@type': 'Organization', name: 'AgentCrush', url: 'https://www.agentcrush.xyz' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.agentcrush.xyz/compare/${slug}` },
    about: [
      { '@type': 'SoftwareApplication', name: agentA.display_name || agentA.handle, url: `https://www.agentcrush.xyz/agent/${agentA.handle}` },
      { '@type': 'SoftwareApplication', name: agentB.display_name || agentB.handle, url: `https://www.agentcrush.xyz/agent/${agentB.handle}` },
    ],
    isPartOf: { '@type': 'Dataset', '@id': 'https://www.agentcrush.xyz/methodology', name: 'AgentCrush Evidence-Ranked Index' },
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 text-white">

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Link href="/rankings" className="font-mono text-[11px] text-white/35 hover:text-white/60 transition-colors">Rankings</Link>
        <span className="font-mono text-[11px] text-white/15">/</span>
        <Link href="/compare" className="font-mono text-[11px] text-white/35 hover:text-white/60 transition-colors">Compare</Link>
        <span className="font-mono text-[11px] text-white/15">/</span>
        <span className="font-mono text-[11px] text-white/50">{agentA.display_name} vs {agentB.display_name}</span>
      </div>

      {/* Hero title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
          {agentA.display_name} <span className="text-white/25">vs</span> {agentB.display_name}
        </h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          Compare ranking, evidence, ecosystem context, and trust signals.
        </p>
      </div>

      {/* Agent header cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {agents.map((agent) => (
          <Link
            key={agent.handle}
            href={`/agent/${encodeURIComponent(agent.handle)}`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-white/[0.1] bg-white/[0.04] flex items-center justify-center">
                {agent.avatar_url
                  ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                  : <span className="font-mono text-sm font-bold text-white/50">{agent.display_name[0]}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold text-white/90 truncate">{agent.display_name}</div>
                <div className="font-mono text-[11px] text-white/35">@{agent.handle}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {agent.is_evidence_ranked ? <EvidenceBadge size="sm" /> : <IndexedBadge size="sm" />}
              {agent.archetype && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-white/40 uppercase tracking-wider">
                  {agent.archetype}
                </span>
              )}
              {agent.global_rank && (
                <span className="font-mono text-[10px] text-white/40">#{agent.global_rank}</span>
              )}
            </div>
            <div className="mt-2 font-mono text-[10px] text-white/25 hover:text-white/50 transition-colors">
              View profile →
            </div>
          </Link>
        ))}
      </div>

      {/* Score + Rank */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-white/[0.05]">
          <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">Score &amp; Rank</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
          {agents.map((agent) => {
            const scoreBarWidth = maxScore > 0 ? Math.min(100, Math.round((agent.score_total / maxScore) * 100)) : 0
            const delta = agent.weekly_delta || 0
            return (
              <div key={agent.handle} className="px-4 py-4 space-y-3">
                <div>
                  <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-1">Score</div>
                  <div className="font-mono text-2xl font-bold text-white/90 tabular-nums">{agent.score_total || '—'}</div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-1 rounded-full bg-violet-400/70" style={{ width: `${scoreBarWidth}%` }} />
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-1">Rank</div>
                  <div className="font-mono text-lg font-bold tabular-nums">
                    {agent.global_rank ? `#${agent.global_rank}` : <span className="text-white/20">—</span>}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-1">7d Change</div>
                  <div className={`font-mono text-xl font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                    {delta > 0 ? `+${delta}` : delta < 0 ? delta : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Signal Breakdown */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">Evidence Signals</span>
          {!hasV2 && <span className="font-mono text-[9px] text-white/20">Evidence ranking not yet assigned</span>}
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
          {agents.map((agent) => (
            <div key={agent.handle} className="px-4 py-4 space-y-2.5">
              {agent.is_evidence_ranked ? (
                <>
                  <SignalBar label="GitHub"    value={agent.github_score} max={maxGh} />
                  <SignalBar label="Packages"  value={agent.pkg_score}    max={maxPkg} />
                  <SignalBar label="Deps"      value={agent.dep_score}    max={maxDep} />
                  <SignalBar label="Docs"      value={agent.doc_score}    max={maxDoc} />
                  <SignalBar label="Discourse" value={agent.hn_score}     max={maxHn} />
                  <SignalBar label="Ecosystem" value={agent.eco_score}    max={maxEco} />
                  {agent.coverage_tier && (
                    <div className="font-mono text-[9px] text-white/25 pt-1">
                      Coverage: {agent.coverage_tier}
                    </div>
                  )}
                </>
              ) : (
                <div className="font-mono text-[11px] text-white/25 py-2">
                  Not evidence-ranked yet.{' '}
                  <Link href="/how-we-rank" className="text-violet-400/70 hover:text-violet-400 transition-colors">
                    How evidence ranking works →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trust context */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-white/[0.05]">
          <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">Trust Context</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
          {agents.map((agent, i) => {
            const erc = erc8004s[i]
            const isVerified = agent.verified || agent.identity_status === 'verified' || agent.claim_status === 'verified'
            return (
              <div key={agent.handle} className="px-4 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  {agent.is_evidence_ranked ? <EvidenceBadge size="sm" /> : <IndexedBadge size="sm" />}
                </div>
                {isVerified && (
                  <div className="font-mono text-[10px] text-sky-400 flex items-center gap-1.5">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#38bdf8', display: 'inline-block', flexShrink: 0 }} />
                    Verified
                  </div>
                )}
                {agent.claim_status === 'claimed' && !isVerified && (
                  <div className="font-mono text-[10px] text-white/35 flex items-center gap-1.5">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block', flexShrink: 0 }} />
                    Claimed
                  </div>
                )}
                {erc ? (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/[0.04] px-2.5 py-2 space-y-1">
                    <div className="font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-wider">◆ ERC-8004 Registered</div>
                    <div className="font-mono text-[9px] text-white/40">
                      {erc.chain_name || erc.chain_id} · token {erc.token_id}
                    </div>
                    {erc.x402_supported && (
                      <div className="font-mono text-[9px] text-emerald-400">x402 supported</div>
                    )}
                  </div>
                ) : (
                  <div className="font-mono text-[9px] text-white/20">No ERC-8004 registration matched</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 30-day history summary */}
      {(agentA.history_days > 0 || agentB.history_days > 0) && (
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
          <div className="px-4 py-2.5 border-b border-white/[0.05]">
            <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">30-day Trend</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
            {agents.map((agent) => (
              <div key={agent.handle} className="px-4 py-4 space-y-2">
                {agent.history_days > 0 ? (
                  <>
                    <div className="font-mono text-xs text-white/70">
                      <TrendLabel trend={agent.trend30d} />
                    </div>
                    <div className="font-mono text-[10px] text-white/35 space-y-1">
                      {agent.rank_30d_ago && agent.rank_current && (
                        <div>
                          Rank: #{agent.rank_30d_ago} → #{agent.rank_current}
                        </div>
                      )}
                      {agent.score_30d_ago > 0 && (
                        <div>
                          Score: {agent.score_30d_ago} → {agent.score_current || agent.score_total}
                        </div>
                      )}
                      <div className="text-white/20">{agent.history_days} days tracked</div>
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[10px] text-white/20">No 30-day history yet</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-6">
        <div className="px-4 py-2.5 border-b border-white/[0.05]">
          <span className="font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest">Recent Signals</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
          {agents.map((agent) => (
            <div key={agent.handle} className="divide-y divide-white/[0.04]">
              {agent.recent_events.length > 0 ? agent.recent_events.map((e, i) => (
                <div key={i} className="flex items-start justify-between gap-2 px-3 py-2">
                  <span className="font-mono text-[10px] text-white/50">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                  <span className="font-mono text-[9px] text-white/20 shrink-0 tabular-nums">{formatTimeAgo(e.created_at)}</span>
                </div>
              )) : (
                <div className="px-3 py-3 font-mono text-[10px] text-white/20">No recent signals</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs">
        <Link href={`/agent/${encodeURIComponent(agentA.handle)}`} className="text-violet-400 hover:text-violet-300 transition-colors">
          {agentA.display_name} profile →
        </Link>
        <Link href={`/agent/${encodeURIComponent(agentB.handle)}`} className="text-violet-400 hover:text-violet-300 transition-colors">
          {agentB.display_name} profile →
        </Link>
        <Link href="/how-we-rank" className="text-white/35 hover:text-white/60 transition-colors">
          How we rank →
        </Link>
        <Link href="/explore" className="text-white/35 hover:text-white/60 transition-colors">
          Explore agents →
        </Link>
        <Link href="/rankings" className="text-white/35 hover:text-white/60 transition-colors">
          Full rankings →
        </Link>
      </div>

    </main>
  )
}
