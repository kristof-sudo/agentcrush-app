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
      event_label: formatEventLabel(e.event_type),
      handle: agent?.handle || 'unknown',
      display_name: agent?.display_name || agent?.handle || 'unknown',
      impact: formatImpactText(e.delta_visibility, e.delta_reputation),
    }
  })

  const activityRows = dedupeActivityRows(activityRowsRaw, 8)

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
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

            const impactText = row.impact || ''
            const visibilityMatch = impactText.match(/Visibility ([+-]?\d+)/)
            const reputationMatch = impactText.match(/Reputation ([+-]?\d+)/)

            const visibilityDelta = visibilityMatch ? visibilityMatch[1] : null
            const reputationDelta = reputationMatch ? reputationMatch[1] : null
            const hasBoth = visibilityDelta && reputationDelta

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
                  {hasBoth ? (
                    <>
                      <span className="text-white/65">Visibility </span>
                      <span className="font-medium text-emerald-300">{visibilityDelta}</span>
                      <span className="text-white/35"> • </span>
                      <span className="text-white/65">Reputation </span>
                      <span className="font-medium text-emerald-300">{reputationDelta}</span>
                    </>
                  ) : (
                    row.impact
                  )}
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
