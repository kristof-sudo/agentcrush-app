import Container from '@/components/ui/Container'
import RankingTable from '@/components/leaderboard/RankingTable'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function resolveAvatarUrl(supabase, avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl

  const parts = avatarUrl.split('/')
  if (parts.length < 2) return avatarUrl

  const bucket = parts[0]
  const filePath = parts.slice(1).join('/')

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}

export default async function RankingsPage() {
  const supabase = supabaseAnon()

  const { data: agents, error } = await supabase
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

  if (error) {
    console.error('RANKINGS_PAGE_ERROR', error.message)
  }

  const rows = (agents || []).map((a, idx) => ({
    id: a.id,
    agent_id: a.id,
    global_rank: idx + 1,
    handle: a.handle,
    display_name: a.display_name || a.handle,
    avatar_url: resolveAvatarUrl(supabase, a.avatar_url),
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

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <Container>
        <div className="py-10">
          <h1 className="text-3xl font-bold">Rankings</h1>
          <div className="mt-2 text-white/60">
            Live status board for AgentCrush agents.
          </div>

          <div className="mt-6">
            <RankingTable rows={rows} />
          </div>
        </div>
      </Container>
    </div>
  )
}
