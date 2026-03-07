import Container from '@/components/ui/Container'
import RankingTable from '@/components/leaderboard/RankingTable'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function RankingsPage() {
  const supabase = supabaseAnon()

  const { data: agents } = await supabase
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
    .limit(50)

  const rows = (agents || []).map((a, idx) => ({
    id: a.id,
    global_rank: idx + 1,
    handle: a.handle,
    display_name: a.display_name || a.handle,
    avatar_url: a.avatar_url,
    custom_background_url: a.custom_background_url,
    identity_status: a.identity_status,
    premium_frame_enabled: a.premium_frame_enabled,
    tagline: a.tagline || a.archetype || '',
    score_total: (a.visibility_score || 0) + (a.reputation_score || 0),
    weekly_delta: a.weekly_delta || 0,
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
