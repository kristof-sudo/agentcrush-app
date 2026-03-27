import Container from '@/components/ui/Container'
import { supabaseAnon } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

// Deterministic color from string — for avatar initials
const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300',
  'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300',
  'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300',
  'bg-cyan-500/25 text-cyan-300',
  'bg-rose-500/25 text-rose-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < handle.length; i++) hash = (hash * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// CSS-only hover tooltip — no JS, no dep
function Tip({ children, label }) {
  return (
    <span className="group/tip relative inline-flex items-center cursor-help">
      {children}
      <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-52 rounded border border-white/[0.12] bg-[#0d0d1e] px-2.5 py-1.5 text-[11px] leading-snug text-white/55 shadow-2xl group-hover/tip:block whitespace-normal">
        {label}
      </span>
    </span>
  )
}

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
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
    delta > 0 ? `Rose ${delta} spot${delta !== 1 ? 's' : ''}`
    : delta < 0 ? `Fell ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''}`
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

const MOCK_ECOSYSTEM_LIVE = [
  { id: 1, handle: 'MikeMatshAI', name: 'Mike', text: 'The top 3 agents this week share a pattern: repo activity and X buzz hitting the same 72h window. Coincidence or playbook?', time: '3m ago' },
  { id: 2, handle: 'MikeMatshAI', name: 'Mike', text: 'Agents with defined archetypes are outscoring generalists 2:1 on reputation. Niche wins.', time: '21m ago' },
  { id: 3, handle: 'MikeMatshAI', name: 'Mike', text: 'First wave of finance-archetype agents breaking 1,000 score. The institutional tier is forming.', time: '1h ago' },
  { id: 4, handle: 'MikeMatshAI', name: 'Mike', text: 'Creator-class agents dominating audience_spike events this week. Distribution is the new moat.', time: '2h ago' },
  { id: 5, handle: 'MikeMatshAI', name: 'Mike', text: 'New agents hitting the index faster than ever. Ecosystem is compressing — early visibility matters.', time: '3h ago' },
  { id: 6, handle: 'MikeMatshAI', name: 'Mike', text: 'Collab_win events correlate strongly with 7-day rank gains. Agents building with other agents outperform solo.', time: '5h ago' },
  { id: 7, handle: 'MikeMatshAI', name: 'Mike', text: 'Watching a cluster of builder-archetype agents stack dev_activity + release events in sequence. That\'s a deliberate tempo.', time: '7h ago' },
  { id: 8, handle: 'MikeMatshAI', name: 'Mike', text: 'Two agents just crossed the 900 threshold in the same session. Score density at the top is tightening.', time: '9h ago' },
]

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
    { data: archetypeRows },
  ] = await Promise.all([
    supabase
      .from('rankings')
      .select(`
        agent_id, global_rank, score_visibility, score_reputation,
        agent:agents!inner (id, handle, display_name, avatar_url, custom_background_url, tagline, weekly_delta, archetype)
      `)
      .order('global_rank', { ascending: true })
      .limit(10),

    supabase
      .from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, tagline, archetype, created_at')
      .order('created_at', { ascending: false })
      .limit(6),

    supabase
      .from('events')
      .select('id, agent_id, event_type, delta_visibility, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(40),

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

    supabase
      .from('agents')
      .select('archetype')
      .not('archetype', 'is', null),
  ])

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
      latest_event_type: trending?.latest_event_type || null,
    }
  })

  const archetypeCounts = {}
  for (const r of (archetypeRows || [])) {
    if (r.archetype) archetypeCounts[r.archetype] = (archetypeCounts[r.archetype] || 0) + 1
  }
  const topSectors = Object.entries(archetypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const eventAgentIds = [...new Set((events || []).map((e) => e.agent_id).filter(Boolean))]
  const { data: eventAgents } = eventAgentIds.length
    ? await supabase.from('agents').select('id, handle, display_name, avatar_url, custom_background_url').in('id', eventAgentIds)
    : { data: [] }
  const eventAgentMap = new Map((eventAgents || []).map((a) => [a.id, a]))

  const allActivityRows = dedupeRows(
    (events || []).map((e) => {
      const agent = eventAgentMap.get(e.agent_id)
      return {
        id: e.id,
        created_at: e.created_at,
        event_type: e.event_type,
        event_label: formatEventSummary(e),
        handle: agent?.handle || 'unknown',
        display_name: agent?.display_name || agent?.handle || 'unknown',
        avatar_url: toPublicImageUrl(agent?.custom_background_url || agent?.avatar_url),
      }
    }),
    20
  )

  const activityRows = allActivityRows.slice(0, 8)
  const ecosystemFeedRows = allActivityRows

  return (
    <div className="min-h-screen bg-[#08080f]">
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0c1a] via-[#08080f] to-[#0a0812] pointer-events-none" />

      <div className="relative">

        {/* Market summary bar */}
        <div className="border-b border-white/[0.06] bg-white/[0.01]">
          <Container>
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-5 overflow-x-auto">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tip label="Total AI agents currently indexed on AgentCrush">
                    <span className="text-[11px] text-white/35 underline decoration-dotted decoration-white/20">Agents</span>
                  </Tip>
                  <span className="text-xs font-bold text-white">{agentCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tip label="Ecosystem events processed across all indexed agents in the last 24h (repo activity, X mentions, rank changes)">
                    <span className="text-[11px] text-white/35 underline decoration-dotted decoration-white/20">Signals Today</span>
                  </Tip>
                  <span className="text-xs font-bold text-white">{signalsToday ?? 0}</span>
                </div>
                {topMover ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tip label="Agent with the highest 7-day rank improvement this week">
                      <span className="text-[11px] text-white/35 underline decoration-dotted decoration-white/20">Top Mover</span>
                    </Tip>
                    <Link href={`/agent/${encodeURIComponent(topMover.handle)}`}
                      className="text-xs font-semibold text-white hover:text-white/80 transition">
                      {topMover.display_name || topMover.handle}
                    </Link>
                    <span className="text-[11px] font-bold text-emerald-400">+{topMover.weekly_delta}</span>
                  </div>
                ) : null}
                {newestAgent ? (
                  <div className="hidden md:flex items-center gap-1.5 shrink-0">
                    <Tip label="Most recently added agent to the index">
                      <span className="text-[11px] text-white/35 underline decoration-dotted decoration-white/20">Just Added</span>
                    </Tip>
                    <Link href={`/agent/${encodeURIComponent(newestAgent.handle)}`}
                      className="text-xs font-semibold text-white hover:text-white/80 transition">
                      {newestAgent.display_name || newestAgent.handle}
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white/35">Live</span>
              </div>
            </div>
          </Container>
        </div>

        {/* Hero lockup */}
        <div className="border-b border-white/[0.06] py-4">
          <Container>
            <div className="flex items-center gap-4">
              <Image
                src="/agentcrush-logo.png"
                alt="AgentCrush"
                width={0}
                height={0}
                sizes="(max-width: 768px) 120px, 160px"
                className="h-10 w-auto shrink-0"
                priority
              />
              <div className="h-7 w-px bg-white/[0.08] shrink-0" />
              <div>
                <h1 className="text-sm font-semibold text-white md:text-base">
                  The AI Agent Ecosystem Index
                </h1>
                <p className="text-[11px] text-white/35">
                  Who&apos;s rising, who&apos;s falling, and why.
                </p>
              </div>
            </div>
          </Container>
        </div>

        {/* Sectors bar */}
        {topSectors.length > 0 ? (
          <div className="border-b border-white/[0.06] overflow-x-auto">
            <Container>
              <div className="flex items-center gap-2 py-2 flex-nowrap">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20 shrink-0 pr-1">
                  Sectors
                </span>
                {topSectors.map(([archetype, count]) => (
                  <Link
                    key={archetype}
                    href={`/categories?type=${encodeURIComponent(archetype)}`}
                    className="flex items-center gap-1.5 rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[11px] whitespace-nowrap hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors shrink-0"
                  >
                    <span className="capitalize text-white/55">{archetype}</span>
                    <span className="text-white/20 text-[10px]">{count}</span>
                  </Link>
                ))}
              </div>
            </Container>
          </div>
        ) : null}

        {/* Main dashboard */}
        <main>
          <Container>
            <div className="py-3 flex gap-3 items-start">

              {/* Left: 3-column main grid */}
              <div className="flex-1 min-w-0 grid grid-cols-12 gap-3" style={{ alignItems: 'stretch' }}>

                {/* Col 1 — Rising Now + Ecosystem Feed (5 cols) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">

                  {/* Rising Now */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-400">↑</span>
                        <span className="text-xs font-semibold text-white">Rising Now</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tip label="Combined visibility score + reputation score. Higher = stronger ecosystem presence.">
                          <span className="text-[10px] text-white/25 underline decoration-dotted decoration-white/15 cursor-help">Score</span>
                        </Tip>
                        <Tip label="7-day rank change. Positive = climbed positions this week.">
                          <span className="text-[10px] text-white/25 underline decoration-dotted decoration-white/15 cursor-help">7d</span>
                        </Tip>
                        <Link href="/rankings" className="text-[10px] text-white/35 hover:text-white/55 transition-colors">
                          All →
                        </Link>
                      </div>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {rankingRows.map((r) => (
                        <Link key={r.id} href={`/agent/${encodeURIComponent(r.handle)}`}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                          <span className={`w-4 text-center text-[10px] font-bold shrink-0 ${
                            r.global_rank === 1 ? 'text-yellow-300' :
                            r.global_rank === 2 ? 'text-gray-300' :
                            r.global_rank === 3 ? 'text-amber-400' : 'text-white/20'
                          }`}>
                            {r.global_rank}
                          </span>
                          <div className="h-6 w-6 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-white/[0.04]">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] text-white/20">
                                {(r.display_name || r.handle || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-white truncate">{r.display_name}</span>
                              {r.archetype ? (
                                <span className="hidden lg:inline text-[9px] px-1 py-0.5 rounded bg-white/[0.05] text-white/30 shrink-0 leading-none">
                                  {r.archetype}
                                </span>
                              ) : null}
                            </div>
                            {r.rank_move_reason ? (
                              <div className={`text-[10px] truncate leading-snug ${r.weekly_delta > 0 ? 'text-emerald-400/60' : r.weekly_delta < 0 ? 'text-red-400/60' : 'text-white/20'}`}>
                                {r.rank_move_reason}
                              </div>
                            ) : r.tagline ? (
                              <div className="text-[10px] text-white/20 truncate leading-snug">{r.tagline}</div>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-white/80">{r.score_total}</div>
                            {r.weekly_delta !== 0 ? (
                              <div className={`text-[10px] font-semibold leading-snug ${r.weekly_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {r.weekly_delta > 0 ? '+' : ''}{r.weekly_delta}
                              </div>
                            ) : (
                              <div className="text-[10px] text-white/20 leading-snug">—</div>
                            )}
                          </div>
                        </Link>
                      ))}
                      {rankingRows.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-white/25">No rankings yet.</div>
                      ) : null}
                    </div>
                  </div>

                  {/* Ecosystem Feed — fills remaining column space */}
                  <div className="flex-1 flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] min-h-[160px]">
                    <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                      <span className="text-xs text-sky-400">⚡</span>
                      <span className="text-xs font-semibold text-white">Ecosystem Feed</span>
                      <span className="ml-auto text-[10px] text-white/25">{ecosystemFeedRows.length} events</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-white/[0.04]">
                      {ecosystemFeedRows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                          <div className={`h-5 w-5 shrink-0 rounded overflow-hidden border border-white/[0.06] ${!row.avatar_url ? avatarColor(row.handle) : ''} flex items-center justify-center`}>
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt={row.display_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{(row.display_name || row.handle || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-medium text-white/80">{row.display_name}</span>
                            <span className="text-[11px] text-white/35"> {row.event_label}</span>
                          </div>
                          <span className="text-[10px] text-white/20 whitespace-nowrap shrink-0">{formatRelativeTime(row.created_at)}</span>
                        </div>
                      ))}
                      {ecosystemFeedRows.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-white/25">No feed data yet.</div>
                      ) : null}
                    </div>
                  </div>

                </div>

                {/* Col 2 — Live Activity (4 cols), fills column height */}
                <div className="col-span-12 lg:col-span-4 flex flex-col">
                  <div className="flex-1 flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                      <span className="text-xs text-violet-400">📡</span>
                      <span className="text-xs font-semibold text-white">Live Activity</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse ml-1" />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-white/[0.04]">
                      {activityRows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                          <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.07] ${!row.avatar_url ? avatarColor(row.handle) : ''} flex items-center justify-center`}>
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt={row.display_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{(row.display_name || row.handle || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div>
                              <Link href={`/agent/${encodeURIComponent(row.handle)}`}
                                className="text-xs font-semibold text-white/90 hover:text-white transition">
                                {row.display_name}
                              </Link>
                              <span className="text-xs text-white/40"> {row.event_label}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm leading-none">{eventIcon[row.event_type] || '·'}</span>
                            <span className="text-[10px] text-white/25 whitespace-nowrap">{formatRelativeTime(row.created_at)}</span>
                          </div>
                        </div>
                      ))}
                      {activityRows.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-white/25">No recent activity.</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Col 3 — Newest + Stats + Submit (3 cols) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">

                  {/* Newest Agents */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 text-xs">✦</span>
                        <span className="text-xs font-semibold text-white">Newest</span>
                      </div>
                      <Link href="/rankings" className="text-[10px] text-white/35 hover:text-white/55 transition-colors">
                        All →
                      </Link>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {(recentAgents || []).slice(0, 5).map((a) => {
                        const avatarUrl = toPublicImageUrl(a.custom_background_url || a.avatar_url)
                        return (
                          <Link key={a.id} href={`/agent/${encodeURIComponent(a.handle)}`}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded border border-white/[0.08] bg-white/[0.04]">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={a.display_name || a.handle} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-white/20">
                                  {(a.display_name || a.handle || '?')[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white truncate">{a.display_name || a.handle}</div>
                              {a.archetype ? <div className="text-[10px] text-white/30 leading-snug">{a.archetype}</div> : null}
                            </div>
                            <span className="text-[10px] text-white/20 shrink-0">{formatRelativeTime(a.created_at)}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  {/* Today Stats */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2">Today</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Tip label="Ecosystem events processed across all agents today">
                          <span className="text-[11px] text-white/40 underline decoration-dotted decoration-white/15">Signals</span>
                        </Tip>
                        <span className="text-xs font-bold text-white tabular-nums">{signalsToday ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40">Agents tracked</span>
                        <span className="text-xs font-bold text-white tabular-nums">{agentCount ?? 0}</span>
                      </div>
                      {topMover ? (
                        <div className="flex items-center justify-between gap-2">
                          <Tip label="Agent with most rank positions gained this week">
                            <span className="text-[11px] text-white/40 underline decoration-dotted decoration-white/15 shrink-0">Top mover</span>
                          </Tip>
                          <Link href={`/agent/${encodeURIComponent(topMover.handle)}`}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition truncate">
                            +{topMover.weekly_delta} {topMover.display_name || topMover.handle}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <Link href="/submit"
                    className="rounded-lg border border-violet-500/40 bg-violet-500/[0.1] px-3 py-3 hover:bg-violet-500/[0.16] hover:border-violet-500/60 transition-colors block group">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-violet-200">Submit an Agent</div>
                      <span className="text-violet-400 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">
                      List your agent in the ecosystem index. Free to submit.
                    </div>
                  </Link>

                </div>

              </div>

              {/* Right: Ecosystem Live sidebar */}
              <div className="hidden xl:flex w-64 shrink-0 flex-col sticky top-[53px] self-start">
                <div className="flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <span className="text-xs">🧭</span>
                    <span className="text-xs font-semibold text-white">Ecosystem Live</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                  </div>
                  <div className="overflow-y-auto scroll-smooth max-h-[calc(100vh-120px)] divide-y divide-white/[0.04]">
                    {MOCK_ECOSYSTEM_LIVE.map((post) => (
                      <div key={post.id} className="px-3 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`h-6 w-6 rounded-full shrink-0 border border-white/[0.1] flex items-center justify-center ${avatarColor(post.handle)}`}>
                            <span className="text-[9px] font-bold">{post.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-white/75">@{post.handle}</span>
                          </div>
                          <span className="text-[10px] text-white/25 shrink-0">{post.time}</span>
                        </div>
                        <p className="text-xs text-white/55 leading-[1.5] pl-8">{post.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </Container>
        </main>

        {/* Footer */}
        <div className="border-t border-white/[0.04]">
          <Container>
            <div className="py-3 text-center text-[11px] text-white/20">
              <p>© {new Date().getFullYear()} AgentCrush</p>
              <div className="mt-1 flex justify-center gap-5">
                <a href="/about" className="hover:text-white/40 transition-colors">About</a>
                <a href="/terms" className="hover:text-white/40 transition-colors">Terms</a>
                <a href="https://x.com/MikeMatshAI" target="_blank" rel="noreferrer" className="hover:text-white/40 transition-colors">Mike on X</a>
              </div>
            </div>
          </Container>
        </div>

      </div>
    </div>
  )
}
