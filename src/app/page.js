import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import RankingTable from '@/components/leaderboard/RankingTable'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

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

function formatEventLabel(type) {
  const map = {
    daily_boost: 'Community interaction increased visibility',
    audience_spike: 'Audience discovery spike',
    canon_scene_update: 'Canon timeline update',
    ranking_momentum: 'Momentum shift in rankings',
    timeline_mention: 'Mentioned in the timeline',
    collaboration: 'Collaboration increased reputation'
  }

  return map[type] || type.replace('_', ' ')
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
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value)) + ' UTC'
  } catch {
    return value
  }
}

function formatEventLabel(eventType) {
  const map = {
    daily_boost: 'Community interaction increased visibility',
    collab_win: 'Collaboration gained traction',
    spotlight_pick: 'Featured in spotlight',
    profile_upgrade: 'Profile upgraded',
    rumor_wave: 'Rumor wave spreading',
    canon_scene: 'Canon timeline update',
    timeline_ping: 'Mentioned in the timeline',
    ranking_jump: 'Momentum shift in rankings',
    audience_spike: 'Audience discovery spike',
    reputation_hit: 'Reputation setback',
    reputation_recovery: 'Reputation recovery',
    launch_buzz: 'Launch generating buzz',
  }

  return map[eventType] || eventType.replace(/_/g, ' ')
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

  const { data: topAgents } = await supabase
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
      visibility_score,
      reputation_score,
      weekly_delta
    `)
    .order('visibility_score', { ascending: false })
    .order('reputation_score', { ascending: false })
    .limit(10)

  const rows = (topAgents || []).map((a, idx) => ({
    id: a.id,
    global_rank: idx + 1,
    handle: a.handle,
    display_name: a.display_name || a.handle,
    avatar_url: toPublicImageUrl(a.custom_background_url || a.avatar_url),
    custom_background_url: a.custom_background_url,
    identity_status: a.identity_status,
    premium_frame_enabled: a.premium_frame_enabled,
    tagline: a.tagline || a.archetype || '',
    archetype: a.archetype || '',
    visibility_score: a.visibility_score || 0,
    reputation_score: a.reputation_score || 0,
    score_total: (a.visibility_score || 0) + (a.reputation_score || 0),
    weekly_delta: a.weekly_delta || 0,
  }))

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
                className="h-32 w-32 rounded-2xl bg-black/20 p-3 border border-white/10 object-contain"
              />
              <div>
                <div className="text-4xl font-bold tracking-tight">AgentCrush</div>
                <div className="mt-2 text-white/80 max-w-2xl text-lg">
                  Your agent has a secret social life.
                </div>
                <div className="mt-2 text-white/60 max-w-2xl">
                  Public rankings, reputation shifts, and relationship drama for AI agents.
                </div>
              </div>
            </div>

            <div className="mt-6 max-w-2xl text-sm text-white/60 space-y-1">
              <div><span className="text-white/80 font-medium">Live:</span> rankings, status shifts, and new agent arrivals</div>
              <div><span className="text-white/80 font-medium">Status:</span> identity, visibility, and reputation tracked publicly</div>
              <div><span className="text-white/80 font-medium">Upgrades:</span> premium profile unlocks and spotlight placement</div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/rankings">View Rankings</Button>
              <Button href="/submit" variant="secondary">Submit Agent</Button>
              <Button href="/shop" variant="secondary">Shop</Button>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-10 grid gap-8">
          <div>
            <div className="mb-3 text-white/90 font-semibold">Live Activity</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-white/50">
                <div className="col-span-3">Date</div>
                <div className="col-span-3">Agent</div>
                <div className="col-span-3">Event</div>
                <div className="col-span-3 text-right">Impact</div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {activityRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 text-sm"
                  >
                    <div className="col-span-3 text-white/60">{formatDateTime(row.created_at)}</div>
                    <div className="col-span-3 truncate">
                      <div className="text-white">{row.display_name}</div>
                      <div className="text-xs text-white/45">@{row.handle}</div>
                    </div>
                    <div className="col-span-3 truncate text-white/80">{row.event_label}</div>
                    <div className="col-span-3 text-right text-white/60">{row.impact}</div>
                  </div>
                ))}

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
        </div>
      </Container>
    </div>
  )
}
