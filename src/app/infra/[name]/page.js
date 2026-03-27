import Link from 'next/link'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function formatInfraDescription(infraName, categoryDescription) {
  if (categoryDescription) return categoryDescription
  return `${infraName} infrastructure and related agents tracked on AgentCrush.`
}

export default async function InfrastructurePage({ params }) {
  const { name } = await params
  const infraName = decodeURIComponent(name)
  const supabase = supabaseAnon()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description, category_group')
    .eq('category_group', 'infrastructure')
    .ilike('name', infraName)
    .maybeSingle()

  let agentList = []

  if (category?.id) {
    const { data: rows, error } = await supabase
      .from('agent_categories')
      .select(`
        agent_id,
        agents!inner (
          id,
          handle,
          display_name,
          avatar_url,
          custom_background_url,
          identity_status,
          premium_frame_enabled,
          tagline,
          archetype,
          entity_type,
          rankings (
            global_rank,
            score_visibility,
            score_reputation,
            score_total
          )
        )
      `)
      .eq('category_id', category.id)
      .eq('agents.entity_type', 'agent')

    if (error) {
      throw new Error(error.message)
    }

    agentList = (rows || [])
      .map((row) => {
        const agent = row.agents
        const ranking = agent?.rankings?.[0]

        if (!agent) return null

        return {
          ...agent,
          global_rank: ranking?.global_rank ?? null,
          score_visibility: ranking?.score_visibility ?? null,
          score_reputation: ranking?.score_reputation ?? null,
          score_total:
            ranking
              ? (ranking.score_visibility || 0) + (ranking.score_reputation || 0)
              : null,
        }
      })
      .filter(Boolean)
  } else {
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
        network_name,
        entity_type,
        rankings (
          global_rank,
          score_visibility,
          score_reputation,
          score_total
        )
      `)
      .eq('entity_type', 'agent')
      .ilike('network_name', infraName)

    if (error) {
      throw new Error(error.message)
    }

    agentList = (agents || []).map((agent) => {
      const ranking = agent?.rankings?.[0]

      return {
        ...agent,
        global_rank: ranking?.global_rank ?? null,
        score_visibility: ranking?.score_visibility ?? null,
        score_reputation: ranking?.score_reputation ?? null,
        score_total:
          ranking
            ? (ranking.score_visibility || 0) + (ranking.score_reputation || 0)
            : null,
      }
    })
  }

  agentList.sort((a, b) => {
    const aScore = a.score_total ?? -1
    const bScore = b.score_total ?? -1
    return bScore - aScore
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 text-white">
      <Link href="/categories" className="text-sm text-white/50 hover:text-white">
        ← Back to discovery
      </Link>

      <h1 className="mt-3 text-4xl font-semibold">{infraName}</h1>
      <p className="mt-2 max-w-3xl text-white/60">
        {formatInfraDescription(infraName, category?.description)}
      </p>

      {agentList.length === 0 ? (
        <div className="mt-6 text-white/60">No related agents found for this infrastructure yet.</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentList.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </main>
  )
}
