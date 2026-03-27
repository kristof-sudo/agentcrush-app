import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import RankingTable from '@/components/leaderboard/RankingTable'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'
import Link from "next/link"

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'

  return `${base}/storage/v1/object/public/${path}`
}

function mixAgentsByArchetype(agents = [], limit = 12) {
  const buckets = new Map()

  for (const agent of agents) {
    const key = agent?.archetype || 'Unknown'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(agent)
  }

  const bucketEntries = Array.from(buckets.entries()).sort((a, b) => {
    const aNewest = new Date(a[1][0]?.created_at || 0).getTime()
    const bNewest = new Date(b[1][0]?.created_at || 0).getTime()
    return bNewest - aNewest
  })

  const result = []

  while (result.length < limit) {
    let addedInRound = false

    for (const [, bucket] of bucketEntries) {
      if (bucket.length > 0) {
        result.push(bucket.shift())
        addedInRound = true
        if (result.length >= limit) break
      }
    }

    if (!addedInRound) break
  }

  return result
}

function formatDateTime(value) {
  if (!value) return ''

  const now = Date.now()
  const ts = new Date(value).getTime()
  const diff = Math.floor((now - ts) / 1000)

  if (diff < 3600) {
    const m = Math.max(1, Math.floor(diff / 60))
    return `${m} min ago`
  }

  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `${h} h ago`
  }

  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value)) + ' UTC'
    )
  } catch {
    return value
  }
}

function formatEventLabel(eventType) {
  const map = {
    daily_boost: 'Gained community traction',
    collab_win: 'Collaboration showing momentum',
    spotlight_pick: 'Featured in spotlight',
    profile_upgrade: 'Profile upgraded',
    rumor_wave: 'Ecosystem chatter increasing',
    canon_scene: 'New ecosystem development',
    timeline_ping: 'Mentioned in the timeline',
    ranking_jump: 'Climbed in the rankings',
    audience_spike: 'Discovered by a new audience',
    reputation_hit: 'Reputation under pressure',
    reputation_recovery: 'Reputation recovering',
    launch_buzz: 'Launch gaining attention',
  }

  return map[eventType] || 'Activity detected'
}

function formatImpactText(v, r) {
  const vis = Number(v || 0)
  const rep = Number(r || 0)

  const parts = []

  if (vis !== 0) {
    parts.push(`Visibility ${vis > 0 ? '+' : ''}${vis}`)
  }

  if (rep !== 0) {
    parts.push(`Reputation ${rep > 0 ? '+' : ''}${rep}`)
  }

  if (parts.length === 0) return 'No score change'

  return parts.join(' • ')
}

function formatSignedValue(value) {
  return value > 0 ? `+${value}` : `${value}`
}

function readMetadataNumber(metadata, keys = []) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (value === null || value === undefined || value === '') continue

    const numericValue = Number(value)
    if (!Number.isNaN(numericValue)) return numericValue
  }

  return null
}

function readMetadataText(metadata, keys = []) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function formatEventSummary(event) {
  const metadata = event?.metadata || {}
  const visibilityDelta = Number(event?.delta_visibility || 0)
  const stars = readMetadataNumber(metadata, ['stars_gained', 'star_gain', 'stars', 'github_stars'])
  const mentions = readMetadataNumber(metadata, ['mention_count', 'mentions', 'post_count', 'x_posts'])
  const rankJump = readMetadataNumber(metadata, ['rank_jump', 'positions_gained', 'rank_delta'])
  const releaseName = readMetadataText(metadata, ['release_name', 'version', 'tag_name'])
  const integrationName = readMetadataText(metadata, ['integration_name', 'partner', 'framework', 'platform'])

  switch (event?.event_type) {
    case 'repo_star_growth':
      if (stars) return `gained ${stars} GitHub stars recently`
      return 'GitHub repository picked up new stars'
    case 'repo_release':
      if (releaseName) return `published a new release: ${releaseName}`
      return 'published a new release'
    case 'audience_spike':
      if (mentions) return `mentioned in ${mentions} recent X posts`
      return 'audience spike detected'
    case 'ranking_jump':
      if (rankJump) return `climbed ${rankJump} spots in the rankings`
      return 'moved up in the rankings'
    case 'timeline_ping':
      if (mentions) return `surfaced in ${mentions} ecosystem mentions`
      return 'mentioned in multiple ecosystem events'
    case 'launch_buzz':
      if (mentions) return `generated ${mentions} launch mentions`
      return 'launch attention detected'
    case 'collab_win':
      if (integrationName) return `new collaboration detected with ${integrationName}`
      return 'new collaboration detected'
    case 'daily_boost':
      return 'picked up fresh momentum'
    case 'canon_scene':
      return 'ecosystem milestone detected'
    case 'ecosystem_integration':
      if (integrationName) return `new integration with ${integrationName}`
      return 'new ecosystem integration'
    case 'dev_activity':
      return 'new development activity'
    default:
      return formatEventLabel(event?.event_type)
  }
}

function formatEventWhyItMatters(event) {
  switch (event?.event_type) {
    case 'repo_release':
      return 'shipping signal — actively maintained'
    case 'repo_star_growth':
      return 'developer interest rising'
    case 'audience_spike':
      return 'broader audience discovering this agent'
    case 'timeline_ping':
      return 'ecosystem is talking about this'
    case 'launch_buzz':
      return 'launch generating real attention'
    case 'ranking_jump':
      return 'rising in the rankings'
    case 'collab_win':
      return 'ecosystem position strengthened'
    case 'ecosystem_integration':
      return 'expanding ecosystem reach'
    case 'dev_activity':
      return 'active development underway'
    case 'daily_boost':
      return 'momentum building'
    case 'canon_scene':
      return 'notable ecosystem moment'
    default:
      return 'ecosystem signal detected'
  }
}

function dedupeActivityRows(rows = [], limit = 8) {
  const seen = new Set()
  const output = []

  for (const row of rows) {
    const minuteBucket = row.created_at ? String(row.created_at).slice(0, 16) : 'no-time'
    const key = `${row.handle}|${row.event_type}|${minuteBucket}`

    if (seen.has(key)) continue
    seen.add(key)
    output.push(row)

    if (output.length >= limit) break
  }

  return output
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = supabaseAnon()

  const { data: topRankings } = await supabase
  .from('rankings')
  .select(`
    agent_id,
    global_rank,
    score_visibility,
    score_reputation,
    score_total,
    agent:agents!inner (
      id,
      handle,
      display_name,
      avatar_url,
      custom_background_url,
      identity_status,
      premium_frame_enabled,
      tagline,
      archetype,
      weekly_delta,
      entity_type
    )
  `)
  .eq('agents.entity_type', 'agent')
  .order('global_rank', { ascending: true })
  .limit(10)

  const rows = (topRankings || []).map((row) => {
    const a = row.agent || {}

    return {
      id: a.id || row.agent_id,
      global_rank: row.global_rank,
      handle: a.handle,
      display_name: a.display_name || a.handle,
      avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
      custom_background_url: a.custom_background_url,
      identity_status: a.identity_status,
      premium_frame_enabled: a.premium_frame_enabled,
      tagline: a.tagline || '',
      archetype: a.archetype || '',
      visibility_score: row.score_visibility || 0,
      reputation_score: row.score_reputation || 0,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
      weekly_delta: a.weekly_delta || 0,
    }
  })

  const { data: recentAgents } = await supabase
    .from('agents')
    .select(`
      id,
      handle,
      display_name,
      avatar_url,
      custom_background_url,
      identity_status,
      premium_frame_enabled,
      tagline,
      archetype,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(36)

  const featuredAgents = mixAgentsByArchetype(recentAgents || [], 12)

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(`
      id,
      agent_id,
      event_type,
      delta_visibility,
      delta_reputation,
      metadata,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(24)

  console.log('EVENTS_DEBUG', {
    count: events?.length || 0,
    error: eventsError?.message || null,
    sample: events?.[0] || null,
  })

  const eventAgentIds = [...new Set((events || []).map((e) => e.agent_id).filter(Boolean))]

  const { data: eventAgents } = eventAgentIds.length
    ? await supabase
        .from('agents')
        .select('id, handle, display_name')
        .in('id', eventAgentIds)
    : { data: [] }

  const eventAgentMap = new Map((eventAgents || []).map((a) => [a.id, a]))

  const activityRowsRaw = (events || []).map((e) => {
    const agent = eventAgentMap.get(e.agent_id)

    return {
      id: e.id,
      created_at: e.created_at,
      event_type: e.event_type,
      event_label: formatEventSummary(e),
      handle: agent?.handle || 'unknown',
      display_name: agent?.display_name || agent?.handle || 'unknown',
      impact: formatEventWhyItMatters(e),
    }
  })

  const activityRows = dedupeActivityRows(activityRowsRaw, 8)

  // Today on AgentCrush block data
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { data: topMover },
    { data: newestAgent },
    { data: trendingFramework },
    { count: signalsToday },
  ] = await Promise.all([
    supabase
      .from('agents')
      .select('id, handle, display_name, weekly_delta')
      .gt('weekly_delta', 0)
      .order('weekly_delta', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id, handle, display_name, archetype, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id, handle, display_name, visibility_score')
      .eq('ecosystem_layer', 'framework')
      .order('visibility_score', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
  ])

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <div style={{background: 'red', color: 'white', padding: '10px', textAlign: 'center'}}>
        REAL HOMEPAGE FILE
      </div>
      <div style={{background: 'red', color: 'white', padding: '10px', textAlign: 'center'}}>
        TEST DEPLOY VISIBLE
      </div>
      <div className="w-full py-2 text-center text-sm text-white/80">
        AgentCrush — live agent index
      </div>
     <div className="bg-gradient-to-b from-violet-900/30 via-[#0B0F1A] to-[#0B0F1A] border-b border-white/10">
  <Container>
    <div className="py-16">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/agentcrush-icon-512.png"
          alt="AgentCrush"
          className="h-32 w-32 rounded-2xl bg-black/20 border border-white/10 object-cover"
        />
        <div>
          <div className="text-4xl font-bold tracking-tight">AgentCrush</div>

          <div className="mt-2 text-white/80 max-w-2xl text-lg">
            Your agent has a secret social life.
          </div>

          <div className="mt-2 text-white/60 max-w-2xl">
            Public rankings, visibility shifts, and emerging influence across the AI agent ecosystem.
          </div>

          <div className="mt-1 text-xs text-white/40">
            Ecosystem observations by Mike Matsh
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-2xl text-sm text-white/60 space-y-1">
        <div><span className="text-white/80 font-medium">Live:</span> rankings, status shifts, and new agents entering the ecosystem</div>
        <div><span className="text-white/80 font-medium">Status:</span> identity, visibility, and reputation tracked in real time</div>
        <div><span className="text-white/80 font-medium">Upgrades:</span> advanced profiles and unlocks (coming soon)</div>
      </div>

      <div className="mt-5 flex justify-start">
        <Link
          href="/start-here"
          className="rounded-xl border border-white/10 bg-gradient-to-b from-[#5B6CFF] via-[#3B2FA8] to-[#211A68] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-950/40 ring-1 ring-white/10 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-950/50 active:translate-y-0"
        >
          Curious about AI agents? Start here →
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/rankings">View Rankings</Button>
        <Button href="/categories" variant="secondary">Browse Categories</Button>
        <Button href="/submit" variant="secondary">Submit Agent</Button>
      </div>
    </div>
  </Container>
</div>

<Container>
  <div className="py-10 grid gap-8">

    {/* Today on AgentCrush */}
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 text-xs font-semibold text-white/50 uppercase tracking-widest">Today on AgentCrush</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {topMover ? (
          <a
            href={`/agent/${encodeURIComponent(topMover.handle)}`}
            className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition block"
          >
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Top Mover</div>
            <div className="font-semibold text-white truncate text-sm">{topMover.display_name || topMover.handle}</div>
            <div className="mt-1 text-sm text-emerald-300 font-medium">↑ +{topMover.weekly_delta} this week</div>
          </a>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Top Mover</div>
            <div className="text-sm text-white/40">No data yet</div>
          </div>
        )}

        {newestAgent ? (
          <a
            href={`/agent/${encodeURIComponent(newestAgent.handle)}`}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition block"
          >
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Just Added</div>
            <div className="font-semibold text-white truncate text-sm">{newestAgent.display_name || newestAgent.handle}</div>
            <div className="mt-1 text-sm text-white/50">{formatDateTime(newestAgent.created_at)}</div>
          </a>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Signals Today</div>
          <div className="text-2xl font-bold text-white">{signalsToday ?? 0}</div>
          <div className="mt-1 text-xs text-white/40">ecosystem events tracked</div>
        </div>

        {trendingFramework ? (
          <a
            href={`/agent/${encodeURIComponent(trendingFramework.handle)}`}
            className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 hover:bg-violet-500/10 transition block"
          >
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Top Framework</div>
            <div className="font-semibold text-white truncate text-sm">{trendingFramework.display_name || trendingFramework.handle}</div>
            <div className="mt-1 text-sm text-white/50">Score {trendingFramework.visibility_score ?? 0}</div>
          </a>
        ) : null}

      </div>
    </div>

    <div>
      <div className="mb-3 text-white/90 font-semibold">Live Activity</div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-white/50">
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Agent</div>
          <div className="col-span-3">Event</div>
          <div className="col-span-3 text-right">Impact</div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {activityRows.map((row) => {
            const eventIcon =
              row.event_type === 'audience_spike'
                ? '📡'
                : row.event_type === 'ranking_jump'
                ? '📈'
                : row.event_type === 'timeline_ping'
                ? '💬'
                : row.event_type === 'canon_scene'
                ? '🌀'
                : row.event_type === 'collab_win'
                ? '🤝'
                : row.event_type === 'launch_buzz'
                ? '🚀'
                : row.event_type === 'daily_boost'
                ? '✨'
                : '•'

            return (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-3 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/5"
              >
                <div className="col-span-3 text-white/60">
                  {formatDateTime(row.created_at)}
                </div>

                <div className="col-span-3 truncate">
                  <div className="text-white">{row.display_name}</div>
                  <div className="text-xs text-white/45">@{row.handle}</div>
                </div>

                <div className="col-span-3 break-words whitespace-normal text-white/90 font-medium">
                  <span className="mr-2">{eventIcon}</span>
                  {row.event_label}
                </div>

                <div className="col-span-3 text-right text-white/60">
                  {row.impact}
                </div>
              </div>
            )
          })}

          {activityRows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-white/50">No recent activity yet.</div>
          ) : null}
        </div>
      </div>
    </div>

    <RankingTable rows={rows} />

<div>
  <div className="mb-3 text-white/90 font-semibold">Newest Agents</div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {featuredAgents.map((a) => (
      <AgentCard key={a.id} agent={a} />
    ))}
  </div>
</div>

        <div className="mt-16 border-t border-white/10 pt-6 text-center text-sm text-white/50">
          <p>© {new Date().getFullYear()} AgentCrush</p>
          <div className="mt-2 flex justify-center gap-6">
            <a href="/about" className="hover:text-white">About</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a
              href="https://x.com/MikeMatshAI"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Mike on X
            </a>
          </div>
        </div>
      </div>
    </Container>
  </div>
)
}
