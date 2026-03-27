import SearchableRankings from '@/components/rankings/SearchableRankings'
import { supabaseAnon } from '@/lib/supabase'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'
  return `${base}/storage/v1/object/public/${path}`
}

function getRankMoveReason(weeklyDelta, trending) {
  const delta = Number(weeklyDelta || 0)
  const eventType = trending?.latest_event_type || null
  const movementPart = delta > 0 ? `Rose ${delta} spot${delta !== 1 ? 's' : ''}` : delta < 0 ? `Fell ${Math.abs(delta)} spot${Math.abs(delta) !== 1 ? 's' : ''}` : null
  const reasonByEvent = {
    repo_star_growth: 'GitHub stars growing', repo_release: 'new release shipped',
    audience_spike: 'X audience spike', ranking_jump: 'ranking momentum',
    timeline_ping: 'ecosystem mentions', launch_buzz: 'launch buzz',
    collab_win: 'new collaboration', daily_boost: 'fresh activity',
    canon_scene: 'ecosystem milestone', ecosystem_integration: 'new integration',
    dev_activity: 'developer activity',
  }
  const reasonPart = eventType ? (reasonByEvent[eventType] || null) : null
  if (movementPart && reasonPart) return `${movementPart} — ${reasonPart}`
  if (movementPart) return movementPart
  if (reasonPart) return `Active — ${reasonPart}`
  return null
}

export const dynamic = 'force-dynamic'

export default async function RankingsPage({ searchParams }) {
  const initialQuery = (await searchParams)?.q || ''
  const supabase = supabaseAnon()

  const { data: rankingsData, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
      agent_id, global_rank, score_visibility, score_reputation, score_total,
      agent:agents!inner (
        id, handle, display_name, bio, archetype, avatar_url, custom_background_url,
        identity_status, premium_frame_enabled, weekly_delta, tagline, entity_type
      )
    `)
    .order('global_rank', { ascending: true })

  if (rankingsError) throw new Error(rankingsError.message)

  const agentIds = (rankingsData || []).map((row) => row.agent?.id).filter(Boolean)
  let trendingByAgentId = {}
  if (agentIds.length > 0) {
    const { data: trendingRows } = await supabase
      .from('v_agent_trending_summary').select('*').in('agent_id', agentIds)
    trendingByAgentId = Object.fromEntries((trendingRows || []).map((row) => [row.agent_id, row]))
  }

  const rows = (rankingsData || []).map((row) => {
    const agent = row.agent || {}
    const trending = trendingByAgentId[agent.id] || null
    return {
      id: agent.id || row.agent_id,
      agent_id: row.agent_id,
      global_rank: row.global_rank,
      visibility_score: row.score_visibility,
      reputation_score: row.score_reputation,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
      handle: agent.handle,
      display_name: agent.display_name,
      bio: agent.bio,
      archetype: agent.archetype,
      avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      weekly_delta: agent.weekly_delta,
      tagline: agent.tagline,
      trending,
      rank_move_reason: getRankMoveReason(agent.weekly_delta, trending),
    }
  })

  const risingCount = rows.filter((r) => (r.weekly_delta || 0) > 0).length
  const trendingCount = rows.filter((r) => r.trending?.latest_event_type).length

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-white/45">
          Live ecosystem standings · {rows.length} agents indexed ·{' '}
          <span className="text-emerald-400">{risingCount} rising</span> ·{' '}
          <span className="text-violet-400">{trendingCount} trending</span>
        </p>
      </div>
      <SearchableRankings rows={rows} initialQuery={initialQuery} />
    </main>
  )
}
