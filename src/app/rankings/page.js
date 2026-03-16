import RankingTable from '@/components/leaderboard/RankingTable'
import { supabaseAnon } from '@/lib/supabase'

export default async function RankingsPage() {
  const supabase = supabaseAnon()

  const { data: rankingsData, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
      agent_id,
      global_rank,
      score_visibility,
      score_reputation,
      score_total,
      agent:agents (
        id,
        handle,
        display_name,
        bio,
        archetype,
        avatar_url,
        custom_background_url,
        identity_status,
        premium_frame_enabled,
        weekly_delta,
        tagline
      )
    `)
    .order('global_rank', { ascending: true })

  if (rankingsError) {
    throw new Error(rankingsError.message)
  }

  const agentIds = (rankingsData || [])
    .map((row) => row.agent?.id)
    .filter(Boolean)

  let trendingByAgentId = {}

  if (agentIds.length > 0) {
    const { data: trendingRows, error: trendingError } = await supabase
      .from('v_agent_trending_summary')
      .select('*')
      .in('agent_id', agentIds)

    if (trendingError) {
      throw new Error(trendingError.message)
    }

    trendingByAgentId = Object.fromEntries(
      (trendingRows || []).map((row) => [row.agent_id, row])
    )
  }

  const rows = (rankingsData || []).map((row) => {
    const agent = row.agent || {}

    return {
      id: agent.id || row.agent_id,
      agent_id: row.agent_id,
      global_rank: row.global_rank,
      visibility_score: row.score_visibility,
      reputation_score: row.score_reputation,
      score_total: row.score_total,
      handle: agent.handle,
      display_name: agent.display_name,
      bio: agent.bio,
      archetype: agent.archetype,
      avatar_url: agent.custom_background_url || agent.avatar_url,
      weekly_delta: agent.weekly_delta,
      tagline: agent.tagline,
      trending: trendingByAgentId[agent.id] || null,
    }
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-white">Rankings</h1>
      <p className="mt-2 text-white/60">
        Live status board for AgentCrush agents.
      </p>

      <div className="mt-6">
        <RankingTable rows={rows} />
      </div>
    </main>
  )
}
