export const metadata = {
  title: 'AI Agent Evidence Rankings 2026 · AgentCrush',
  description: 'Evidence-ranked AI agents with verified GitHub activity, ecosystem signals, and real adoption data. Updated from real ecosystem signals.',
  openGraph: {
    title: 'AI Agent Evidence Rankings 2026 · AgentCrush',
    description: 'Evidence-ranked AI agents with verified GitHub activity, ecosystem signals, and real adoption data.',
    url: 'https://agentcrush.xyz/rankings',
    siteName: 'AgentCrush',
    images: [{ url: 'https://agentcrush.xyz/og-default.png', width: 1200, height: 630, alt: 'AI Agent Rankings — AgentCrush' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Evidence Rankings 2026 · AgentCrush',
    description: 'Evidence-ranked AI agents with verified GitHub activity, ecosystem signals, and real adoption data.',
    images: ['https://agentcrush.xyz/og-default.png'],
  },
}

import SearchableRankings from '@/components/rankings/SearchableRankings'
import HowCalculatedBar from '@/components/rankings/HowCalculatedBar'
import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { getMovementReason, formatRelativeTime } from '@/lib/why-moving'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'
  return `${base}/storage/v1/object/public/${path}`
}

function generateWeeklyStory(rows) {
  if (!rows.length) return null
  const sentences = []

  const leader = rows.find((r) => r.global_rank === 1)
  if (leader) {
    const delta = leader.weekly_delta || 0
    const name = leader.display_name || leader.handle
    if (delta > 0) sentences.push(`${name} extended its lead at #1, gaining +${delta} spot${delta !== 1 ? 's' : ''} this week.`)
    else if (delta < 0) sentences.push(`${name} holds #1 despite slipping ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''} from last week.`)
    else sentences.push(`${name} holds firm at #1.`)
  }

  const top5 = rows.filter((r) => r.global_rank <= 5)
  if (top5.length >= 3) {
    const counts = {}
    for (const r of top5) if (r.archetype) counts[r.archetype] = (counts[r.archetype] || 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (top && top[1] >= 2) sentences.push(`${top[0]}-class agents hold ${top[1]} of the top 5 spots.`)
  }

  const biggestGainer = rows
    .filter((r) => (r.weekly_delta || 0) > 0 && r.global_rank !== 1)
    .sort((a, b) => b.weekly_delta - a.weekly_delta)[0]
  if (biggestGainer) {
    const reason = biggestGainer.rank_move_reason
    const base = `${biggestGainer.display_name || biggestGainer.handle} climbed +${biggestGainer.weekly_delta} to #${biggestGainer.global_rank}`
    sentences.push(reason ? `${base} — ${reason.replace(/^Rose \d+ spots? — /, '')}.` : `${base}.`)
  }

  return sentences.slice(0, 3).join(' ') || null
}

function CornerAccent() {
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(233,30,128,0.35)]" />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(233,30,128,0.35)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(233,30,128,0.35)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(233,30,128,0.35)]" />
    </>
  )
}

export const dynamic = 'force-dynamic'

export default async function RankingsPage({ searchParams }) {
  const initialQuery = (await searchParams)?.q || ''
  const supabase = supabaseAnon()

  // Note: view name "top50" is misleading — it has no LIMIT. Filtered by
  // evidence_ready_for_public_rank=true this returns ALL evidence-ranked agents.
  const { data: v2Rows, error: v2Error } = await supabase
    .from('agent_score_v2_top50_public_candidate')
    .select('handle, display_name, rank_v2_c_public, score_v2_c_public_candidate, active_weight_total, coverage_tier, github_score, package_usage_score, dependency_score, ecosystem_score, docs_quality_score, hn_score, trust_score')
    .eq('evidence_ready_for_public_rank', true)
    .order('rank_v2_c_public', { ascending: true })

  if (v2Error) throw new Error(v2Error.message)

  const handles = (v2Rows || []).map((r) => r.handle).filter(Boolean)

  const [
    { data: agentsData },
    { data: latestRanking },
    { count: totalIndexed },
  ] = await Promise.all([
    handles.length > 0
      ? supabase
          .from('agents')
          .select('id, handle, display_name, bio, archetype, avatar_url, custom_background_url, tagline, weekly_delta, verified, identity_status, website_url, github_url')
          .in('handle', handles)
      : { data: [] },
    supabase
      .from('rankings')
      .select('computed_at')
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true }),
  ])

  const agentsByHandle = {}
  for (const a of agentsData || []) {
    agentsByHandle[a.handle] = a
  }

  // Fetch trending for agent IDs
  const agentIds = (agentsData || []).map((a) => a.id).filter(Boolean)
  let trendingByAgentId = {}
  if (agentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary')
      .select('*')
      .in('agent_id', agentIds)
    trendingByAgentId = Object.fromEntries((trendingRows || []).map((row) => [row.agent_id, row]))
  }

  const rows = (v2Rows || []).map((v2, idx) => {
    const agent = agentsByHandle[v2.handle] || {}
    const trending = trendingByAgentId[agent.id] || null
    return {
      id: agent.id || v2.handle,
      global_rank: v2.rank_v2_c_public ?? idx + 1,
      handle: v2.handle,
      display_name: agent.display_name || v2.display_name || v2.handle,
      bio: agent.bio || '',
      archetype: agent.archetype || '',
      avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      weekly_delta: agent.weekly_delta || 0,
      tagline: agent.tagline || '',
      trending,
      rank_move_reason: getMovementReason(agent.weekly_delta, trending?.latest_event_type),
      verified: agent.verified || agent.identity_status === 'verified',
      external_url: agent.website_url || agent.github_url || null,
      score_total: v2.score_v2_c_public_candidate ?? 0,
      visibility_score: 0,
      reputation_score: 0,
      // v2 signal scores — null when signal has no data for this agent
      github_score:        v2.github_score        ?? null,
      package_usage_score: v2.package_usage_score ?? null,
      dependency_score:    v2.dependency_score    ?? null,
      ecosystem_score:     v2.ecosystem_score     ?? null,
      docs_quality_score:  v2.docs_quality_score  ?? null,
      hn_score:            v2.hn_score            ?? null,
      trust_score:         v2.trust_score         ?? null,
      coverage_tier:       v2.coverage_tier       ?? null,
      active_weight_total: v2.active_weight_total ?? null,
    }
  })

  const risingCount = rows.filter((r) => (r.weekly_delta || 0) > 0).length
  const weeklyStory = generateWeeklyStory(rows)
  const topRisers = rows.filter((r) => (r.weekly_delta || 0) > 0).sort((a, b) => b.weekly_delta - a.weekly_delta).slice(0, 5)
  const topFallers = rows.filter((r) => (r.weekly_delta || 0) < 0).sort((a, b) => a.weekly_delta - b.weekly_delta).slice(0, 5)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: '#00d4ff' }}>TIER 02</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,212,255,0.25)' }} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-michroma,'Michroma',sans-serif)" }}>
          Evidence <span style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>Rankings</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-white/40">
          {rows.length} evidence-ranked ·{' '}
          {totalIndexed ?? 0} total indexed ·{' '}
          <span style={{ color: '#4ade80' }}>{risingCount} rising</span>
          {latestRanking?.computed_at ? (
            <> · <span className="text-white/30">updated {formatRelativeTime(latestRanking.computed_at)}</span></>
          ) : null}
          {' '}·{' '}
          <Link href="/explore" className="text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">
            browse all agents →
          </Link>
        </p>
      </div>

      {/* Evidence explanation */}
      <div className="mb-4 rounded-lg border border-[rgba(57,255,20,0.15)] bg-[rgba(57,255,20,0.04)] px-4 py-3 font-mono text-[11px] text-white/50 leading-relaxed">
        These rankings include only agents with enough public evidence to score reliably. Signals include GitHub activity, package usage, dependency adoption, docs quality, ecosystem relationships, and public discourse. The list grows automatically as indexed agents accumulate evidence.{' '}
        <Link href="/how-we-rank" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">How we rank →</Link>
      </div>

      {/* Weekly Narrative */}
      {weeklyStory && (
        <div className="mb-4 relative rounded-lg bg-[#0a0a14] border border-white/[0.08] px-4 py-3 overflow-hidden">
          <CornerAccent />
          <div className="flex items-center gap-1.5 mb-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: '#e91e80' }}>◆ WEEKLY NARRATIVE</span>
          </div>
          <p className="font-mono text-sm text-white/80 leading-relaxed">{weeklyStory}</p>
        </div>
      )}

      <HowCalculatedBar />

      {/* Movers strip */}
      {(topRisers.length > 0 || topFallers.length > 0) && (
        <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topRisers.length > 0 && (
            <div className="relative rounded-lg bg-[#0a0a14] border border-white/[0.08] px-3 py-2.5 overflow-hidden">
              <CornerAccent />
              <div className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#e91e80' }}>↑ RISING NOW</div>
              <div className="space-y-1.5">
                {topRisers.map((r) => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] text-white/30 tabular-nums w-4 text-right shrink-0">#{r.global_rank}</span>
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
                {topFallers.map((r) => (
                  <div key={r.handle} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[10px] text-white/30 tabular-nums w-4 text-right shrink-0">#{r.global_rank}</span>
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

      <SearchableRankings rows={rows} initialQuery={initialQuery} />

      {/* Explore link */}
      <div className="mt-8 text-center">
        <p className="font-mono text-xs text-white/30 mb-2">
          Only showing {rows.length} evidence-ranked agents. {(totalIndexed ?? 0) - rows.length} more are indexed but lack sufficient evidence.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors"
        >
          View all indexed agents →
        </Link>
      </div>
    </main>
  )
}
