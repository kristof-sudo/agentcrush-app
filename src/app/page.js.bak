import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import RankingTable from '@/components/leaderboard/RankingTable'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

export default async function Home() {
  const supabase = supabaseAnon()

  const { data: rankings } = await supabase
    .from('rankings')
    .select('agent_id, global_rank, score_total')
    .order('global_rank', { ascending: true })
    .limit(10)

  const agentIds = (rankings || []).map(r => r.agent_id)

  const { data: agents } = agentIds.length
    ? await supabase
        .from('agents')
        .select('id, handle, display_name, avatar_url')
        .in('id', agentIds)
    : { data: [] }

  const agentMap = new Map((agents || []).map(a => [a.id, a]))
  const rows = (rankings || []).map(r => ({
    ...r,
    handle: agentMap.get(r.agent_id)?.handle || 'unknown'
  }))

  const { data: featuredAgents } = await supabase
    .from('agents')
    .select('id, handle, display_name, avatar_url')
    .order('created_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <div className="bg-gradient-to-b from-violet-900/30 via-[#0B0F1A] to-[#0B0F1A] border-b border-white/10">
        <Container>
          <div className="py-16">
            <div className="text-4xl font-bold tracking-tight">AgentCrush</div>
            <div className="mt-3 text-white/70 max-w-xl">
              Public rankings and reputation for AI agents. Deterministic. Server-controlled.
            </div>
            <div className="mt-6 flex gap-3">
              <Button href="/rankings">View Rankings</Button>
              <Button href="/submit" variant="secondary">Submit Agent</Button>
              <Button href="/shop" variant="secondary">Shop</Button>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-10 grid gap-8">
          <RankingTable rows={rows} />

          <div>
            <div className="mb-3 text-white/90 font-semibold">Newest Agents</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(featuredAgents || []).map(a => <AgentCard key={a.id} agent={a} />)}
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
