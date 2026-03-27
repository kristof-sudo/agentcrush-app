import Container from '@/components/ui/Container'
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
        agent:agents!inner (id, handle, display_name, avatar_url, custom_background_url, tagline, weekly_delta, archetype)
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
      archetype: a.archetype || '',
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
    <div className="min-h-screen bg-[#08080f]">
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0c1a] via-[#08080f] to-[#0a0812] pointer-events-none" />

      <div className="relative">

        {/* Market summary bar */}
        <div className="border-b border-white/[0.06] bg-white/[0.01]">
          <Container>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-6 overflow-x-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40">Agents</span>
                  <span className="text-sm font-semibold text-white">{agentCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/40">Signals Today</span>
                  <span className="text-sm font-semibold text-white">{signalsToday ?? 0}</span>
                </div>
                {topMover ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/40">Top Mover</span>
                    <Link href={`/agent/${encodeURIComponent(topMover.handle)}`}
                      className="text-sm font-semibold text-white hover:text-white/80 transition">
                      {topMover.display_name || topMover.handle}
                    </Link>
                    <span className="text-xs font-semibold text-emerald-400">+{topMover.weekly_delta}</span>
                  </div>
                ) : null}
                {newestAgent ? (
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/40">Just Added</span>
                    <Link href={`/agent/${encodeURIComponent(newestAgent.handle)}`}
                      className="text-sm font-semibold text-white hover:text-white/80 transition">
                      {newestAgent.display_name || newestAgent.handle}
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/40">Live</span>
              </div>
            </div>
          </Container>
        </div>

        {/* Hero lockup */}
        <div className="border-b border-white/[0.06] py-7">
          <Container>
            <div className="flex items-center gap-6">
              <Image
                src="/agentcrush-logo.png"
                alt="AgentCrush"
                width={0}
                height={0}
                sizes="100vw"
                className="h-16 w-auto shrink-0"
                priority
              />
              <div className="h-10 w-px bg-white/[0.08] shrink-0" />
              <div>
                <h1 className="text-lg font-semibold text-white md:text-xl">
                  The AI Agent Ecosystem Index
                </h1>
                <p className="text-sm text-white/40">
                  Who&apos;s rising, who&apos;s falling, and why.
                </p>
              </div>
            </div>
          </Container>
        </div>

        {/* Main dashboard — 3-column grid */}
        <main>
          <Container>
            <div className="py-5 grid grid-cols-12 gap-4">

              {/* Left — Rising Now (5 cols) */}
              <div className="col-span-12 lg:col-span-5">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-400">↑</span>
                      <span className="text-sm font-semibold text-white">Rising Now</span>
                    </div>
                    <Link href="/rankings"
                      className="text-xs text-white/40 hover:text-white/60 transition-colors">
                      View all →
                    </Link>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {rankingRows.map((r) => (
                      <Link key={r.id} href={`/agent/${encodeURIComponent(r.handle)}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <span className={`w-5 text-center text-xs font-semibold shrink-0 ${
                          r.global_rank === 1 ? 'text-yellow-300' :
                          r.global_rank === 2 ? 'text-gray-300' :
                          r.global_rank === 3 ? 'text-amber-400' : 'text-white/30'
                        }`}>
                          {r.global_rank}
                        </span>
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/5">
                          {r.avatar_url && r.avatar_url !== '/placeholder.png' ? (
                            <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-white/20">?</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{r.display_name}</span>
                            {r.archetype ? (
                              <span className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 shrink-0">
                                {r.archetype}
                              </span>
                            ) : null}
                          </div>
                          {r.rank_move_reason ? (
                            <div className={`text-xs truncate mt-0.5 ${r.weekly_delta > 0 ? 'text-emerald-400/70' : r.weekly_delta < 0 ? 'text-red-400/70' : 'text-white/30'}`}>
                              {r.rank_move_reason}
                            </div>
                          ) : r.tagline ? (
                            <div className="text-xs text-white/30 truncate mt-0.5">{r.tagline}</div>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-white">{r.score_total}</div>
                          {r.weekly_delta !== 0 ? (
                            <div className={`text-xs font-medium ${r.weekly_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {r.weekly_delta > 0 ? '+' : ''}{r.weekly_delta}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    ))}
                    {rankingRows.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-white/30">No rankings yet.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Middle — Live Activity (4 cols) */}
              <div className="col-span-12 lg:col-span-4">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                    <span className="text-sm text-violet-400">⚡</span>
                    <span className="text-sm font-semibold text-white">Live Activity</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {activityRows.map((row) => (
                      <div key={row.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <span className="text-sm shrink-0 mt-0.5">{eventIcon[row.event_type] || '•'}</span>
                        <div className="flex-1 min-w-0">
                          <Link href={`/agent/${encodeURIComponent(row.handle)}`}
                            className="text-sm font-medium text-white hover:text-white/80 transition">
                            {row.display_name}
                          </Link>
                          <span className="text-sm text-white/40"> {row.event_label}</span>
                        </div>
                        <span className="text-xs text-white/30 whitespace-nowrap shrink-0">
                          {formatRelativeTime(row.created_at)}
                        </span>
                      </div>
                    ))}
                    {activityRows.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-white/30">No recent activity.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right — Newest + Today Stats + Submit (3 cols) */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                {/* Newest Agents */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-sm">✦</span>
                      <span className="text-sm font-semibold text-white">Newest</span>
                    </div>
                    <Link href="/rankings"
                      className="text-xs text-white/40 hover:text-white/60 transition-colors">
                      All →
                    </Link>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {(recentAgents || []).slice(0, 5).map((a) => {
                      const avatarUrl = toPublicImageUrl(a.custom_background_url || a.avatar_url)
                      return (
                        <Link key={a.id} href={`/agent/${encodeURIComponent(a.handle)}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-white/5">
                            {avatarUrl !== '/placeholder.png' ? (
                              <img src={avatarUrl} alt={a.display_name || a.handle} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-white/20">?</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {a.display_name || a.handle}
                            </div>
                            {a.archetype ? (
                              <div className="text-xs text-white/40">{a.archetype}</div>
                            ) : null}
                          </div>
                          <span className="text-xs text-white/30 shrink-0">
                            {formatRelativeTime(a.created_at)}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Today Stats */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                    Today
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Signals processed</span>
                      <span className="text-sm font-semibold text-white">{signalsToday ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Agents in index</span>
                      <span className="text-sm font-semibold text-white">{agentCount ?? 0}</span>
                    </div>
                    {topMover ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white/50 shrink-0">Top mover</span>
                        <Link href={`/agent/${encodeURIComponent(topMover.handle)}`}
                          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition truncate">
                          +{topMover.weekly_delta} {topMover.display_name || topMover.handle}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Submit CTA */}
                <Link href="/submit"
                  className="rounded-lg border border-violet-500/25 bg-violet-500/8 p-4 hover:bg-violet-500/12 transition-colors block">
                  <div className="text-sm font-semibold text-white mb-1">Submit an Agent</div>
                  <div className="text-xs text-white/40">Add to the index →</div>
                </Link>

              </div>
            </div>
          </Container>
        </main>

        {/* Footer */}
        <div className="border-t border-white/[0.06]">
          <Container>
            <div className="py-5 text-center text-sm text-white/30">
              <p>© {new Date().getFullYear()} AgentCrush</p>
              <div className="mt-2 flex justify-center gap-6">
                <a href="/about" className="hover:text-white/60 transition-colors">About</a>
                <a href="/terms" className="hover:text-white/60 transition-colors">Terms</a>
                <a href="https://x.com/MikeMatshAI" target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">Mike on X</a>
              </div>
            </div>
          </Container>
        </div>

      </div>
    </div>
  )
}
