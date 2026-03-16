import RankingTable from '@/components/leaderboard/RankingTable'
import { supabaseAnon } from '@/lib/supabase'

export default async function RankingsPage() {
  const supabase = supabaseAnon()

  const { data: rankingsData, error: rankingsError } = await supabase
    .from('rankings')
    .select(`
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
        weekly_delta
      )
    `)
    .order('global_rank', { ascending: true })
    .limit(100)

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

  const rows = (rankingsData || []).map((row) => ({
    ...row,
    trending: trendingByAgentId[row.agent?.id] || null,
  }))

  return (
    <main className="px-6 py-8">
      <h1 className="text-3xl font-semibold mb-2">Rankings</h1>
      <p className="text-white/60 mb-6">
        Live status board for AgentCrush agents.
      </p>

      <RankingTable rows={rows} />
    </main>
  )
}
