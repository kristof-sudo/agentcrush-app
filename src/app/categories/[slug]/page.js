import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { isDemoAgent } from '@/lib/agent-quality'
import { getSignalLabel, formatRelativeTime } from '@/lib/why-moving'

export const dynamic = 'force-dynamic'

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${path}`
}

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300', 'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300', 'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300', 'bg-cyan-500/25 text-cyan-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}


export default async function CategoryPage({ params }) {
  const { slug } = await params
  const supabase = supabaseAnon()

  const { data: category } = await supabase
    .from('categories').select('*').eq('slug', slug).maybeSingle()

  if (!category) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-white">
        <Link href="/categories" className="text-sm text-white/50 hover:text-white">← Categories</Link>
        <h1 className="mt-4 text-2xl font-bold">Category not found</h1>
      </main>
    )
  }

  const { data: rows, error } = await supabase
    .from('agent_categories')
    .select(`
      agent_id,
      agents!inner (
        id, handle, display_name, avatar_url, custom_background_url,
        archetype, weekly_delta, created_at, entity_type, bio, tagline,
        rankings ( global_rank, score_visibility, score_reputation )
      )
    `)
    .eq('category_id', category.id)

  if (error) throw new Error(error.message)

  // Build agent list — filter demo agents (P2)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const agentList = (rows || [])
    .map((row) => {
      const agent = row.agents
      if (!agent || isDemoAgent(agent)) return null
      const ranking = Array.isArray(agent.rankings) ? agent.rankings[0] : agent.rankings
      return {
        ...agent,
        global_rank: ranking?.global_rank ?? null,
        score_total: ranking ? (ranking.score_visibility || 0) + (ranking.score_reputation || 0) : 0,
        avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.score_total ?? 0) - (a.score_total ?? 0))

  const agentIds = agentList.map((a) => a.id).filter(Boolean)

  // Fetch trending + signals in parallel
  const [trendingResult, eventsResult] = await Promise.all([
    agentIds.length
      ? supabase.from('v_agent_trending_summary').select('agent_id, latest_event_type').in('agent_id', agentIds)
      : { data: [] },
    agentIds.length
      ? supabase.from('events').select('id, agent_id, event_type, created_at')
          .in('agent_id', agentIds).gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
          .order('created_at', { ascending: false }).limit(50)
      : { data: [] },
  ])

  const trendingMap = Object.fromEntries(
    (trendingResult.data || []).map((r) => [r.agent_id, r.latest_event_type])
  )
  const recentEvents = eventsResult.data || []

  // Enrich agents with trending reason
  const enriched = agentList.map((a) => ({
    ...a,
    latest_event_type: trendingMap[a.id] || null,
  }))

  // Stats
  const total = enriched.length
  const risingCount = enriched.filter((a) => (a.weekly_delta || 0) > 0).length
  const trendPct = total > 0 ? Math.round((risingCount / total) * 100) : 0
  const signalCount = recentEvents.length
  const newEntrants = enriched.filter((a) => a.created_at >= sevenDaysAgo)
  const topMovers = [...enriched].filter((a) => (a.weekly_delta || 0) > 0)
    .sort((a, b) => (b.weekly_delta || 0) - (a.weekly_delta || 0)).slice(0, 5)

  // Recent signals with agent name
  const agentNameMap = Object.fromEntries(enriched.map((a) => [a.id, a.display_name || a.handle]))
  const recentSignals = recentEvents.slice(0, 8).map((e) => ({
    ...e,
    agent_name: agentNameMap[e.agent_id] || 'unknown',
    label: getSignalLabel(e.event_type) || e.event_type,
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 text-white">
      {/* Breadcrumb */}
      <Link href="/categories" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
        ← Categories
      </Link>

      {/* Header */}
      <div className="mt-3 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{category.name}</h1>
            {category.description && (
              <p className="mt-1 text-sm text-white/45 max-w-2xl">{category.description}</p>
            )}
          </div>
          <Link href={`/rankings?q=${encodeURIComponent(category.name)}`}
            className="shrink-0 text-xs text-violet-400 hover:text-violet-300 transition-colors border border-violet-500/30 rounded px-2.5 py-1">
            Full rankings →
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {[
          { label: 'Agents', value: total, color: 'text-white' },
          { label: 'Rising', value: `${risingCount} (${trendPct}%)`, color: 'text-emerald-400' },
          { label: 'New (7d)', value: newEntrants.length, color: newEntrants.length > 0 ? 'text-amber-400' : 'text-white/50' },
          { label: 'Signals (30d)', value: signalCount, color: signalCount > 0 ? 'text-violet-400' : 'text-white/50' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
            <div className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">{stat.label}</div>
            <div className={`text-base font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Full ranked list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Top movers */}
          {topMovers.length > 0 && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
                <span className="text-emerald-400 text-xs">↑</span>
                <span className="text-xs font-semibold text-white">Top Movers</span>
                <span className="text-[10px] text-white/25 ml-auto">7d change</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {topMovers.map((agent) => (
                  <Link key={agent.id} href={`/agent/${encodeURIComponent(agent.handle)}`}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors">
                    <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.07] flex items-center justify-center ${!agent.avatar_url ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                      {agent.avatar_url
                        ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                        : <span className="text-[8px] font-bold">{(agent.display_name || '?')[0].toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white/90 truncate">{agent.display_name || agent.handle}</span>
                        {getSignalLabel(agent.latest_event_type) ? (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300/80 border border-emerald-500/25 leading-none shrink-0">
                            {getSignalLabel(agent.latest_event_type)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0 tabular-nums">+{agent.weekly_delta}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All agents */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white">All Agents</span>
              <span className="text-[10px] text-white/30 tabular-nums">{total} indexed</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {enriched.map((agent, i) => {
                const delta = agent.weekly_delta || 0
                return (
                  <Link key={agent.id} href={`/agent/${encodeURIComponent(agent.handle)}`}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors">
                    <span className="text-[10px] tabular-nums text-white/25 w-5 text-right shrink-0">{i + 1}</span>
                    <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.07] flex items-center justify-center ${!agent.avatar_url ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                      {agent.avatar_url
                        ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                        : <span className="text-[8px] font-bold">{(agent.display_name || '?')[0].toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-white/80 truncate">{agent.display_name || agent.handle}</span>
                        {getSignalLabel(agent.latest_event_type) ? (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.06] text-white/35 leading-none shrink-0 hidden sm:inline">
                            {getSignalLabel(agent.latest_event_type)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-white/25">@{agent.handle}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-medium text-white/50 tabular-nums">{agent.score_total || 0}</div>
                      <div className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                      </div>
                    </div>
                  </Link>
                )
              })}
              {enriched.length === 0 && (
                <div className="px-3 py-6 text-xs text-white/25 text-center">No agents in this category yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: New entrants + signals */}
        <div className="space-y-3">
          {/* New entrants */}
          {newEntrants.length > 0 && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
                <span className="text-amber-400 text-xs">✦</span>
                <span className="text-xs font-semibold text-white">New This Week</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {newEntrants.slice(0, 5).map((agent) => (
                  <Link key={agent.id} href={`/agent/${encodeURIComponent(agent.handle)}`}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors">
                    <div className={`h-5 w-5 shrink-0 rounded overflow-hidden border border-white/[0.07] flex items-center justify-center ${!agent.avatar_url ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                      {agent.avatar_url
                        ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                        : <span className="text-[7px] font-bold">{(agent.display_name || '?')[0].toUpperCase()}</span>}
                    </div>
                    <span className="text-[11px] text-white/70 truncate flex-1 min-w-0">{agent.display_name || agent.handle}</span>
                    <span className="text-[10px] text-white/25 shrink-0 tabular-nums">{formatRelativeTime(agent.created_at)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent signals */}
          {recentSignals.length > 0 && (
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.06]">
                <span className="text-violet-400 text-xs">⚡</span>
                <span className="text-xs font-semibold text-white">Recent Signals</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentSignals.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 px-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-white/70">{e.agent_name}</span>
                      <span className="text-[11px] text-white/30"> · {e.label}</span>
                    </div>
                    <span className="text-[10px] text-white/20 shrink-0 tabular-nums whitespace-nowrap">{formatRelativeTime(e.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
