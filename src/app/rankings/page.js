import SearchableRankings from '@/components/rankings/SearchableRankings'
import HowCalculatedBar from '@/components/rankings/HowCalculatedBar'
import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { getMovementReason } from '@/lib/why-moving'

function toPublicImageUrl(path) {
  if (!path) return '/placeholder.png'
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return '/placeholder.png'
  return `${base}/storage/v1/object/public/${path}`
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
      rank_move_reason: getMovementReason(agent.weekly_delta, trending?.latest_event_type),
    }
  })

  const scoredRows = rows.filter((r) => (r.score_total || 0) > 0)
  const unscoredCount = rows.length - scoredRows.length
  const risingCount = scoredRows.filter((r) => (r.weekly_delta || 0) > 0).length
  const trendingCount = scoredRows.filter((r) => r.trending?.latest_event_type).length

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Rankings</h1>
        <p className="mt-1 text-sm text-white/45">
          Live ecosystem standings · {scoredRows.length} agents ranked ·{' '}
          <span className="text-emerald-400">{risingCount} rising</span> ·{' '}
          <span className="text-violet-400">{trendingCount} trending</span>
        </p>
      </div>
      <div className="space-y-3">
        <HowCalculatedBar />
        <SearchableRankings rows={scoredRows} initialQuery={initialQuery} />
        {unscoredCount > 0 && (
          <p className="px-1 text-xs text-white/25">
            +{unscoredCount} more agents being indexed —{' '}
            <Link href="/categories" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
              browse by category
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}
