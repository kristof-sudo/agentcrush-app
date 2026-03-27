import Container from '@/components/ui/Container'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'
  return `${base}/storage/v1/object/public/${path}`
}

function formatRelativeTime(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
  } catch { return value }
}

function formatEventSummary(event) {
  const metadata = event?.metadata || {}
  function readNum(keys) {
    for (const k of keys) {
      const v = metadata?.[k]
      if (v != null && v !== '') { const n = Number(v); if (!isNaN(n)) return n }
    }
    return null
  }
  function readText(keys) {
    for (const k of keys) { const v = metadata?.[k]; if (typeof v === 'string' && v.trim()) return v.trim() }
    return null
  }
  const stars = readNum(['stars_gained', 'star_gain', 'stars', 'github_stars'])
  const mentions = readNum(['mention_count', 'mentions', 'post_count', 'x_posts'])
  const rankJump = readNum(['rank_jump', 'positions_gained', 'rank_delta'])
  const releaseName = readText(['release_name', 'version', 'tag_name'])
  const integrationName = readText(['integration_name', 'partner', 'framework', 'platform'])

  switch (event?.event_type) {
    case 'repo_star_growth': return stars ? `gained ${stars} GitHub stars` : 'GitHub stars growing'
    case 'repo_release': return releaseName ? `released ${releaseName}` : 'new release shipped'
    case 'audience_spike': return mentions ? `${mentions} X mentions` : 'audience spike'
    case 'ranking_jump': return rankJump ? `climbed ${rankJump} spots` : 'moved up in rankings'
    case 'timeline_ping': return mentions ? `${mentions} ecosystem mentions` : 'ecosystem mention'
    case 'launch_buzz': return mentions ? `${mentions} launch mentions` : 'launch attention'
    case 'collab_win': return integrationName ? `new collab with ${integrationName}` : 'new collaboration'
    case 'daily_boost': return 'fresh activity'
    case 'canon_scene': return 'ecosystem milestone'
    case 'ecosystem_integration': return integrationName ? `integration with ${integrationName}` : 'new integration'
    case 'dev_activity': return 'developer activity'
    default: return 'activity detected'
  }
}

function getRankMoveReason(weeklyDelta, latestEventType) {
  const delta = Number(weeklyDelta || 0)
  const reasonByEvent = {
    repo_star_growth: 'GitHub stars growing',
    repo_release: 'new release shipped',
    audience_spike: 'X audience spike',
    ranking_jump: 'ranking momentum',
    timeline_ping: 'ecosystem mentions',
    launch_buzz: 'launch buzz',
    collab_win: 'new collaboration',
    daily_boost: 'fresh activity',
    canon_scene: 'ecosystem milestone',
    ecosystem_integration: 'new integration',
    dev_activity: 'developer activity',
  }
  const movementPart =
    delta > 0
      ? `Rose ${delta} spot${delta !== 1 ? 's' : ''}`
      : delta < 0
      ? `Fell ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''}`
      : null
  const reasonPart = latestEventType ? (reasonByEvent[latestEventType] || null) : null
  if (movementPart && reasonPart) return `${movementPart} — ${reasonPart}`
  if (movementPart) return movementPart
  if (reasonPart) return `Active — ${reasonPart}`
  return null
}

function dedupeRows(rows = [], limit = 8) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = `${row.handle}|${row.event_type}|${String(row.created_at).slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= limit) break
  }
  return out
}

const eventIcon = {
  audience_spike: '📡', ranking_jump: '📈', timeline_ping: '💬', canon_scene: '🌀',
  collab_win: '🤝', launch_buzz: '🚀', daily_boost: '✨', repo_star_growth: '⭐',
  repo_release: '🔖', ecosystem_integration: '🔗', dev_activity: '⚙️',
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = supabaseAnon()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { data: topRankings },
    { data: recentAgents },
    { data: events },
    { data: topMover },
    { data: newestAgent },
    { count: signalsToday },
    { count: agentCount },
  ] = await Promise.all([
    supabase
      .from('rankings')
      .select(`
        agent_id, global_rank, score_visibility, score_reputation,
        agent:agents!inner (id, handle, display_name, avatar_url, custom_background_url, tagline, weekly_delta)
      `)
      .order('global_rank', { ascending: true })
      .limit(5),

    supabase
      .from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, identity_status, premium_frame_enabled, tagline, archetype, created_at')
      .order('created_at', { ascending: false })
      .limit(6),

    supabase
      .from('events')
      .select('id, agent_id, event_type, delta_visibility, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(24),

    supabase
      .from('agents')
      .select('id, handle, display_name, weekly_delta')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('agents')
      .select('id, handle, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),

    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true }),
  ])

  // Trending data for movement reasons on top 5
  const rankingAgentIds = (topRankings || []).map((r) => r.agent?.id).filter(Boolean)
  let trendingByAgentId = {}
  if (rankingAgentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary')
      .select('agent_id, latest_event_type')
      .in('agent_id', rankingAgentIds)
    trendingByAgentId = Object.fromEntries(
      (trendingRows || []).map((r) => [r.agent_id, r])
    )
  }

  const rankingRows = (topRankings || []).map((row) => {
    const a = row.agent || {}
    const trending = trendingByAgentId[a.id] || null
    return {
      id: a.id || row.agent_id,
      global_rank: row.global_rank,
      handle: a.handle,
      display_name: a.display_name || a.handle,
      avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
      tagline: a.tagline || '',
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
      weekly_delta: a.weekly_delta || 0,
      rank_move_reason: getRankMoveReason(a.weekly_delta, trending?.latest_event_type),
    }
  })

  const eventAgentIds = [...new Set((events || []).map((e) => e.agent_id).filter(Boolean))]
  const { data: eventAgents } = eventAgentIds.length
    ? await supabase.from('agents').select('id, handle, display_name').in('id', eventAgentIds)
    : { data: [] }
  const eventAgentMap = new Map((eventAgents || []).map((a) => [a.id, a]))

  const activityRows = dedupeRows(
    (events || []).map((e) => {
      const agent = eventAgentMap.get(e.agent_id)
      return {
        id: e.id,
        created_at: e.created_at,
        event_type: e.event_type,
        event_label: formatEventSummary(e),
        handle: agent?.handle || 'unknown',
        display_name: agent?.display_name || agent?.handle || 'unknown',
      }
    }),
    8
  )

  return (
    <div className="min-h-screen">
      <Container>
        <div className="py-10 space-y-10">

          {/* Hero */}
          <div className="pt-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              The AI Agent Ecosystem Index
            </h1>
            <p className="mt-2 text-lg text-white/60">
              Who&apos;s rising, who&apos;s falling, and why.
            </p>

            {/* Live stats bar */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <span className="text-lg font-bold text-white">{agentCount ?? 0}</span>
                <span className="text-sm text-white/50">Agents Tracked</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                <span className="text-lg font-bold text-white">{signalsToday ?? 0}</span>
                <span className="text-sm text-white/50">Signals Today</span>
              </div>
              {topMover ? (
                <Link
                  href={`/agent/${encodeURIComponent(topMover.handle)}`}
                  className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 hover:bg-emerald-500/20 transition"
                >
                  <span className="text-sm text-white/50">Top Mover</span>
                  <span className="text-sm font-semibold text-white">{topMover.display_name || topMover.handle}</span>
                  <span className="text-sm font-bold text-emerald-300">+{topMover.weekly_delta}</span>
                </Link>
              ) : null}
            </div>

          </div>

          {/* Today on AgentCrush */}
          <div>
            <div className="mb-3 text-xs font-semibold text-white/35 uppercase tracking-widest">Today on AgentCrush</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {topMover ? (
                <Link href={`/agent/${encodeURIComponent(topMover.handle)}`}
                  className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition block">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Top Mover</div>
                  <div className="font-semibold text-white truncate text-sm">{topMover.display_name || topMover.handle}</div>
                  <div className="mt-1 text-sm text-emerald-300 font-medium">↑ +{topMover.weekly_delta} this week</div>
                </Link>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Top Mover</div>
                  <div className="text-sm text-white/30">No data yet</div>
                </div>
              )}

              {newestAgent ? (
                <Link href={`/agent/${encodeURIComponent(newestAgent.handle)}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition block">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Just Added</div>
                  <div className="font-semibold text-white truncate text-sm">{newestAgent.display_name || newestAgent.handle}</div>
                  <div className="mt-1 text-sm text-white/50">{formatRelativeTime(newestAgent.created_at)}</div>
                </Link>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Just Added</div>
                  <div className="text-sm text-white/40">No data yet</div>
                </div>
              )}

              <div className={`rounded-xl border p-4 ${hasSignals ? 'border-violet-400/15 bg-violet-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Signals Today</div>
                {hasSignals ? (
                  <>
                    <div className="text-2xl font-bold text-white">{signalsToday}</div>
                    <div className="mt-1 text-xs text-white/40">ecosystem events</div>
                  </>
                ) : (
                  <div className="text-sm text-white/30 mt-1">Quiet so far</div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Agents Tracked</div>
                <div className="text-2xl font-bold text-white">{agentCount ?? 0}</div>
                <div className="mt-1 text-xs text-white/40">in the index</div>
              </div>
            </div>
          </div>

          {/* Rising Now — Top 5 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-white/90 font-semibold">Rising Now</div>
              <Link href="/rankings" className="text-xs text-violet-400 hover:text-violet-300">Full rankings →</Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              {rankingRows.map((r) => (
                <Link key={r.id} href={`/agent/${encodeURIComponent(r.handle)}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.04] transition">
                  <div className="w-6 text-center shrink-0">
                    <span className={`text-xs font-bold ${r.global_rank === 1 ? 'text-yellow-300' : r.global_rank === 2 ? 'text-gray-300' : r.global_rank === 3 ? 'text-amber-400' : 'text-white/40'}`}>
                      #{r.global_rank}
                    </span>
                  </div>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {r.avatar_url && r.avatar_url !== '/placeholder.png' ? (
                      <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/30">?</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{r.display_name}</div>
                    {r.rank_move_reason ? (
                      <div className={`text-xs truncate mt-0.5 ${r.weekly_delta > 0 ? 'text-emerald-400' : r.weekly_delta < 0 ? 'text-red-400' : 'text-white/40'}`}>
                        {r.weekly_delta > 0 ? '↑' : r.weekly_delta < 0 ? '↓' : ''}{r.rank_move_reason}
                      </div>
                    ) : r.tagline ? (
                      <div className="text-xs text-white/40 truncate mt-0.5">{r.tagline}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.weekly_delta > 0 ? (
                      <span className="text-xs font-semibold text-emerald-300">+{r.weekly_delta}</span>
                    ) : r.weekly_delta < 0 ? (
                      <span className="text-xs font-semibold text-red-300">{r.weekly_delta}</span>
                    ) : null}
                    <span className="text-sm font-bold text-white/70">{r.score_total}</span>
                  </div>
                </Link>
              ))}
              {rankingRows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-white/40">No rankings available yet.</div>
              ) : null}
            </div>
          </div>

          {/* Live Activity */}
          <div>
            <div className="mb-3 text-white/90 font-semibold">Live Activity</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto divide-y divide-white/[0.05]">
                {activityRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition">
                    <span className="w-5 shrink-0 text-sm">{eventIcon[row.event_type] || '•'}</span>
                    <Link href={`/agent/${encodeURIComponent(row.handle)}`}
                      className="font-medium text-white text-sm hover:text-white/80 transition shrink-0 max-w-[140px] truncate">
                      {row.display_name}
                    </Link>
                    <span className="text-sm text-white/60 min-w-0 truncate flex-1">{row.event_label}</span>
                    <span className="text-xs text-white/35 shrink-0">{formatRelativeTime(row.created_at)}</span>
                  </div>
                ))}
                {activityRows.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-white/40">No recent activity yet.</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Newest Agents */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-white/90 font-semibold">Newest Agents</div>
              <Link href="/rankings" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(recentAgents || []).map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/40">
            <p>© {new Date().getFullYear()} AgentCrush</p>
            <div className="mt-2 flex justify-center gap-6">
              <a href="/about" className="hover:text-white">About</a>
              <a href="/terms" className="hover:text-white">Terms</a>
              <a href="https://x.com/MikeMatshAI" target="_blank" rel="noreferrer" className="hover:text-white">Mike on X</a>
            </div>
          </div>

        </div>
      </Container>
    </div>
  )
}
