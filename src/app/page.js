import Container from '@/components/ui/Container'
import { supabaseAnon } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

// Deterministic color from handle string
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

// CSS-only hover tooltip
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

// Signal tag derived from event type — no backend change needed
const REASON_TAGS = {
  launch_buzz:           { label: 'launch',      cls: 'bg-violet-500/15 text-violet-300/80 border-violet-500/25' },
  audience_spike:        { label: 'trending',    cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  repo_star_growth:      { label: 'repo spike',  cls: 'bg-yellow-500/15 text-yellow-300/80 border-yellow-500/25' },
  repo_release:          { label: 'release',     cls: 'bg-blue-500/15 text-blue-300/80 border-blue-500/25' },
  collab_win:            { label: 'collab',      cls: 'bg-sky-500/15 text-sky-300/80 border-sky-500/25' },
  ranking_jump:          { label: 'rising',      cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  dev_activity:          { label: 'dev active',  cls: 'bg-slate-500/15 text-slate-300/80 border-slate-500/25' },
  ecosystem_integration: { label: 'integration', cls: 'bg-cyan-500/15 text-cyan-300/80 border-cyan-500/25' },
  canon_scene:           { label: 'milestone',   cls: 'bg-indigo-500/15 text-indigo-300/80 border-indigo-500/25' },
  timeline_ping:         { label: 'mentions',    cls: 'bg-pink-500/15 text-pink-300/80 border-pink-500/25' },
}

const EVENT_ICON = {
  audience_spike: '📡', ranking_jump: '📈', timeline_ping: '💬', canon_scene: '🌀',
  collab_win: '🤝', launch_buzz: '🚀', daily_boost: '✨', repo_star_growth: '⭐',
  repo_release: '🔖', ecosystem_integration: '🔗', dev_activity: '⚙️',
}

const MOCK_ECOSYSTEM_LIVE = [
  { id: 1, handle: 'MikeMatshAI', name: 'Mike', text: 'The top 3 agents this week share a pattern: repo activity and X buzz hitting the same 72h window. Coincidence or playbook?', time: '3m ago' },
  { id: 2, handle: 'MikeMatshAI', name: 'Mike', text: 'Agents with defined archetypes are outscoring generalists 2:1 on reputation. Niche wins.', time: '21m ago' },
  { id: 3, handle: 'MikeMatshAI', name: 'Mike', text: 'First wave of finance-archetype agents breaking 1,000 score. The institutional tier is forming.', time: '1h ago' },
  { id: 4, handle: 'MikeMatshAI', name: 'Mike', text: 'Creator-class agents dominating audience_spike events this week. Distribution is the new moat.', time: '2h ago' },
  { id: 5, handle: 'MikeMatshAI', name: 'Mike', text: 'New agents hitting the index faster than ever. Early visibility compounds.', time: '3h ago' },
  { id: 6, handle: 'MikeMatshAI', name: 'Mike', text: 'Collab_win events correlate strongly with 7-day rank gains. Agents building with other agents outperform solo.', time: '5h ago' },
  { id: 7, handle: 'MikeMatshAI', name: 'Mike', text: "Builder-archetype agents stacking dev_activity + release events. That's a deliberate tempo.", time: '7h ago' },
  { id: 8, handle: 'MikeMatshAI', name: 'Mike', text: 'Two agents just crossed the 900 threshold in the same session. Score density at the top is tightening.', time: '9h ago' },
]

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
  const meta = event?.metadata || {}
  const readNum = (...keys) => { for (const k of keys) { const v = Number(meta[k]); if (!isNaN(v) && v > 0) return v } return null }
  const readText = (...keys) => { for (const k of keys) { if (typeof meta[k] === 'string' && meta[k].trim()) return meta[k].trim() } return null }
  const stars = readNum('stars_gained', 'star_gain', 'stars', 'github_stars')
  const mentions = readNum('mention_count', 'mentions', 'post_count', 'x_posts')
  const rankJump = readNum('rank_jump', 'positions_gained', 'rank_delta')
  const releaseName = readText('release_name', 'version', 'tag_name')
  const integrationName = readText('integration_name', 'partner', 'framework', 'platform')
  switch (event?.event_type) {
    case 'repo_star_growth': return stars ? `+${stars} GitHub stars` : 'GitHub stars growing'
    case 'repo_release': return releaseName ? `released ${releaseName}` : 'new release'
    case 'audience_spike': return mentions ? `${mentions} X mentions` : 'audience spike'
    case 'ranking_jump': return rankJump ? `climbed ${rankJump} spots` : 'ranking jump'
    case 'timeline_ping': return mentions ? `${mentions} mentions` : 'ecosystem mention'
    case 'launch_buzz': return mentions ? `${mentions} launch mentions` : 'launch buzz'
    case 'collab_win': return integrationName ? `collab w/ ${integrationName}` : 'new collab'
    case 'daily_boost': return 'fresh activity'
    case 'canon_scene': return 'ecosystem milestone'
    case 'ecosystem_integration': return integrationName ? `integrated ${integrationName}` : 'new integration'
    case 'dev_activity': return 'dev activity'
    default: return 'activity'
  }
}

function getRankMoveReason(weeklyDelta, latestEventType) {
  const delta = Number(weeklyDelta || 0)
  const reasonByEvent = {
    repo_star_growth: 'GitHub stars growing', repo_release: 'new release shipped',
    audience_spike: 'X audience spike', ranking_jump: 'ranking momentum',
    timeline_ping: 'ecosystem mentions', launch_buzz: 'launch buzz',
    collab_win: 'new collaboration', daily_boost: 'fresh activity',
    canon_scene: 'ecosystem milestone', ecosystem_integration: 'new integration',
    dev_activity: 'developer activity',
  }
  const move = delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : null
  const reason = latestEventType ? (reasonByEvent[latestEventType] || null) : null
  if (move && reason) return `${move} — ${reason}`
  if (move) return `${move} spots this week`
  if (reason) return reason
  return null
}

function dedupeRows(rows = [], limit = 20) {
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
    supabase.from('rankings').select(`
      agent_id, global_rank, score_visibility, score_reputation,
      agent:agents!inner (id, handle, display_name, avatar_url, custom_background_url, tagline, weekly_delta, archetype)
    `).order('global_rank', { ascending: true }).limit(15),

    supabase.from('agents')
      .select('id, handle, display_name, avatar_url, custom_background_url, tagline, archetype, created_at')
      .order('created_at', { ascending: false }).limit(8),

    supabase.from('events')
      .select('id, agent_id, event_type, delta_visibility, metadata, created_at')
      .order('created_at', { ascending: false }).limit(60),

    supabase.from('agents')
      .select('id, handle, display_name, weekly_delta')
      .gt('weekly_delta', 0).order('weekly_delta', { ascending: false }).limit(1).maybeSingle(),

    supabase.from('agents')
      .select('id, handle, display_name, created_at')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),

    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),

    supabase.from('agents').select('id', { count: 'exact', head: true }),

    supabase.from('agents').select('archetype').not('archetype', 'is', null),
  ])

  // Trending data for rank movement
  const rankingAgentIds = (topRankings || []).map((r) => r.agent?.id).filter(Boolean)
  let trendingByAgentId = {}
  if (rankingAgentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary').select('agent_id, latest_event_type').in('agent_id', rankingAgentIds)
    trendingByAgentId = Object.fromEntries((trendingRows || []).map((r) => [r.agent_id, r]))
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

  // Activity rows with avatars
  const eventAgentIds = [...new Set((events || []).map((e) => e.agent_id).filter(Boolean))]
  const { data: eventAgents } = eventAgentIds.length
    ? await supabase.from('agents').select('id, handle, display_name, avatar_url, custom_background_url').in('id', eventAgentIds)
    : { data: [] }
  const eventAgentMap = new Map((eventAgents || []).map((a) => [a.id, a]))

  const allActivityRows = dedupeRows(
    (events || []).map((e) => {
      const agent = eventAgentMap.get(e.agent_id)
      return {
        id: e.id, created_at: e.created_at, event_type: e.event_type,
        event_label: formatEventSummary(e),
        handle: agent?.handle || 'unknown',
        display_name: agent?.display_name || agent?.handle || 'unknown',
        avatar_url: toPublicImageUrl(agent?.custom_background_url || agent?.avatar_url),
      }
    }), 24
  )
  const activityRows = allActivityRows.slice(0, 10)
  const ecosystemFeedRows = allActivityRows

  // Archetype counts for sectors bar
  const archetypeCounts = {}
  for (const r of (archetypeRows || [])) {
    if (r.archetype) archetypeCounts[r.archetype] = (archetypeCounts[r.archetype] || 0) + 1
  }
  const topSectors = Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div className="min-h-screen bg-[#08080f] overflow-x-hidden">
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
                  <span className="text-xs font-bold text-white tabular-nums">{agentCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tip label="Ecosystem events processed across all indexed agents in the last 24h (repo, X, rank changes)">
                    <span className="text-[11px] text-white/35 underline decoration-dotted decoration-white/20">Signals Today</span>
                  </Tip>
                  <span className="text-xs font-bold text-white tabular-nums">{signalsToday ?? 0}</span>
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
                    <span className="text-[11px] font-bold text-emerald-400">+{topMover.weekly_delta} spots</span>
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

        {/* Hero */}
        <div className="border-b border-white/[0.06] py-4">
          <Container>
            <div className="flex items-center gap-4">
              <Image src="/agentcrush-logo.png" alt="AgentCrush" width={0} height={0}
                sizes="160px" className="h-10 w-auto shrink-0" style={{ maxWidth: '160px' }} priority />
              <div className="h-7 w-px bg-white/[0.08] shrink-0" />
              <div>
                <h1 className="text-sm font-semibold text-white md:text-base">The AI Agent Ecosystem Index</h1>
                <p className="text-[11px] text-white/35">Who&apos;s rising, who&apos;s falling, and why.</p>
              </div>
            </div>
          </Container>
        </div>

        {/* Sectors bar */}
        {topSectors.length > 0 ? (
          <div className="border-b border-white/[0.06] overflow-x-auto">
            <Container>
              <div className="flex items-center gap-2 py-1.5 flex-nowrap">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/20 shrink-0 pr-1">Sectors</span>
                {topSectors.map(([archetype, count]) => (
                  <Link key={archetype} href={`/categories?type=${encodeURIComponent(archetype)}`}
                    className="flex items-center gap-1.5 rounded border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[11px] whitespace-nowrap hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors shrink-0">
                    <span className="capitalize text-white/50">{archetype}</span>
                    <span className="text-white/20 text-[10px] tabular-nums">{count}</span>
                  </Link>
                ))}
              </div>
            </Container>
          </div>
        ) : null}

        {/* Main 3-column dashboard */}
        <main>
          <Container>
            <div className="py-3 grid grid-cols-12 gap-3" style={{ alignItems: 'stretch' }}>

              {/* ── COL 1 (5): Rising Now + Ecosystem Feed ── */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">

                {/* Rising Now */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-emerald-400">↑</span>
                      <span className="text-xs font-semibold text-white">Rising Now</span>
                      <span className="text-[10px] text-white/20 ml-1">top {rankingRows.length}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Tip label="Combined visibility + reputation score. Higher = stronger ecosystem presence.">
                        <span className="text-[10px] text-white/20 underline decoration-dotted decoration-white/15 cursor-help">Score</span>
                      </Tip>
                      <Tip label="7-day rank change. Green = climbed positions this week.">
                        <span className="text-[10px] text-white/20 underline decoration-dotted decoration-white/15 cursor-help">7d</span>
                      </Tip>
                      <Link href="/rankings" className="text-[10px] text-white/35 hover:text-white/55 transition-colors">All →</Link>
                    </div>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {rankingRows.map((r) => (
                      <Link key={r.id} href={`/agent/${encodeURIComponent(r.handle)}`}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors group">
                        <span className={`w-4 text-center text-[10px] font-bold shrink-0 ${
                          r.global_rank === 1 ? 'text-yellow-300' : r.global_rank === 2 ? 'text-gray-300' :
                          r.global_rank === 3 ? 'text-amber-400' : 'text-white/20'}`}>
                          {r.global_rank}
                        </span>
                        <div className={`h-6 w-6 shrink-0 overflow-hidden rounded border border-white/[0.08] flex items-center justify-center ${!r.avatar_url ? avatarColor(r.handle) : 'bg-white/[0.04]'}`}>
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold">{(r.display_name || r.handle || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-white group-hover:text-white/90 truncate">{r.display_name}</span>
                            {r.latest_event_type && REASON_TAGS[r.latest_event_type] ? (
                              <span className={`hidden sm:inline text-[9px] px-1.5 py-0.5 rounded border shrink-0 leading-none font-medium ${REASON_TAGS[r.latest_event_type].cls}`}>
                                {REASON_TAGS[r.latest_event_type].label}
                              </span>
                            ) : r.archetype ? (
                              <span className="hidden lg:inline text-[9px] px-1 py-0.5 rounded bg-white/[0.05] text-white/25 shrink-0 leading-none">
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
                          <div className="text-xs font-bold text-white/80 tabular-nums">{r.score_total}</div>
                          <div className={`text-[10px] font-semibold leading-snug tabular-nums ${r.weekly_delta > 0 ? 'text-emerald-400' : r.weekly_delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                            {r.weekly_delta > 0 ? '+' : r.weekly_delta < 0 ? '' : '·'}{r.weekly_delta !== 0 ? r.weekly_delta : ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {rankingRows.length === 0 ? (
                      <div className="px-3 py-5 text-xs text-white/25">No rankings yet.</div>
                    ) : null}
                  </div>
                </div>

                {/* Ecosystem Feed — fills remaining height */}
                <div className="flex-1 flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] min-h-[200px]">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <span className="text-xs text-sky-400">⚡</span>
                    <span className="text-xs font-semibold text-white">Ecosystem Feed</span>
                    <span className="ml-auto text-[10px] text-white/20 tabular-nums">{ecosystemFeedRows.length} signals</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-white/[0.04]">
                    {ecosystemFeedRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                        <div className={`h-5 w-5 shrink-0 rounded overflow-hidden border border-white/[0.06] flex items-center justify-center ${!row.avatar_url ? avatarColor(row.handle) : 'bg-white/[0.04]'}`}>
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt={row.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold">{(row.display_name || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium text-white/75">{row.display_name}</span>
                          <span className="text-[11px] text-white/30"> {row.event_label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] leading-none">{EVENT_ICON[row.event_type] || '·'}</span>
                          <span className="text-[10px] text-white/20 whitespace-nowrap">{formatRelativeTime(row.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {ecosystemFeedRows.length === 0 ? (
                      <div className="px-3 py-5 text-xs text-white/25">No signals yet.</div>
                    ) : null}
                  </div>
                </div>

              </div>

              {/* ── COL 2 (4): Live Activity + Newest Agents ── */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">

                {/* Live Activity */}
                <div className="flex-1 flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <span className="text-xs text-violet-400">📡</span>
                    <span className="text-xs font-semibold text-white">Live Activity</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse ml-1" />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-white/[0.04]">
                    {activityRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                        <div className={`h-6 w-6 shrink-0 rounded overflow-hidden border border-white/[0.07] flex items-center justify-center ${!row.avatar_url ? avatarColor(row.handle) : 'bg-white/[0.04]'}`}>
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt={row.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold">{(row.display_name || '?')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/agent/${encodeURIComponent(row.handle)}`}
                            className="text-xs font-semibold text-white/90 hover:text-white transition">
                            {row.display_name}
                          </Link>
                          <span className="text-xs text-white/35"> {row.event_label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm leading-none">{EVENT_ICON[row.event_type] || '·'}</span>
                          <span className="text-[10px] text-white/25 whitespace-nowrap">{formatRelativeTime(row.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {activityRows.length === 0 ? (
                      <div className="px-3 py-5 text-xs text-white/25">No recent activity.</div>
                    ) : null}
                  </div>
                </div>

                {/* Newest Agents */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-xs">✦</span>
                      <span className="text-xs font-semibold text-white">Newest</span>
                    </div>
                    <Link href="/rankings" className="text-[10px] text-white/35 hover:text-white/55 transition-colors">All →</Link>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {(recentAgents || []).slice(0, 6).map((a) => {
                      const avatarUrl = toPublicImageUrl(a.custom_background_url || a.avatar_url)
                      return (
                        <Link key={a.id} href={`/agent/${encodeURIComponent(a.handle)}`}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors">
                          <div className={`h-6 w-6 shrink-0 overflow-hidden rounded border border-white/[0.08] flex items-center justify-center ${!avatarUrl ? avatarColor(a.handle) : 'bg-white/[0.04]'}`}>
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={a.display_name || a.handle} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{(a.display_name || a.handle || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">{a.display_name || a.handle}</div>
                            {a.archetype ? <div className="text-[10px] text-white/25 leading-snug">{a.archetype}</div> : null}
                          </div>
                          <span className="text-[10px] text-white/20 shrink-0">{formatRelativeTime(a.created_at)}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* ── COL 3 (3): Ecosystem Live + Stats + Submit ── */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">

                {/* Ecosystem Live */}
                <div className="flex-1 flex flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] min-h-[200px]">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 shrink-0">
                    <span className="text-xs">🧭</span>
                    <span className="text-xs font-semibold text-white">Ecosystem Live</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-white/[0.04]">
                    {MOCK_ECOSYSTEM_LIVE.map((post) => (
                      <div key={post.id} className="px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className={`h-5 w-5 rounded-full shrink-0 border border-white/[0.08] flex items-center justify-center ${avatarColor(post.handle)}`}>
                            <span className="text-[9px] font-bold">{post.name[0]}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-white/70 flex-1 min-w-0 truncate">@{post.handle}</span>
                          <span className="text-[10px] text-white/20 shrink-0">{post.time}</span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed pl-6">{post.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Today Stats */}
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-2">Today</div>
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
                  className="rounded-lg border border-violet-500/40 bg-violet-500/[0.08] px-3 py-2.5 hover:bg-violet-500/[0.14] hover:border-violet-500/60 transition-colors block group">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-violet-200">Submit an Agent</div>
                    <span className="text-violet-400 group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                  <div className="text-[10px] text-white/35 mt-0.5">List your agent in the index. Free to submit.</div>
                </Link>

              </div>

            </div>
          </Container>
        </main>

        {/* Footer */}
        <div className="border-t border-white/[0.04]">
          <Container>
            <div className="py-3 text-center text-[11px] text-white/20">
              <p>© {new Date().getFullYear()} AgentCrush · The AI Agent Ecosystem Index</p>
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
