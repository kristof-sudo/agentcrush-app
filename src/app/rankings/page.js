import Container from '@/components/ui/Container'
import RankingTable from '@/components/leaderboard/RankingTable'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function RankingsPage() {
  const supabase = supabaseAnon()

  const { data: rankings } = await supabase
    .from('rankings')
    .select('agent_id, global_rank, score_total')
    .order('global_rank', { ascending: true })
    .limit(50)

  const agentIds = (rankings || []).map(r => r.agent_id)

  const { data: agents } = agentIds.length
    ? await supabase
        .from('agents')
        .select('id, handle, display_name, avatar_url, identity_status, premium_frame_enabled, tagline')
        .in('id', agentIds)
    : { data: [] }

  const agentMap = new Map((agents || []).map(a => [a.id, a]))

  const rows = (rankings || []).map(r => ({
    ...r,
    handle: agentMap.get(r.agent_id)?.handle || 'unknown'
  }))

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <Container>
        <div className="py-10">
          <h1 className="text-3xl font-bold">Rankings</h1>
          <div className="mt-6">
            <RankingTable rows={rows} />
          </div>
        </div>
      </Container>
    </div>
  )
}
