import Link from 'next/link'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function formatEcosystemDescription(ecosystemName, categoryDescription) {
  if (categoryDescription) return categoryDescription
  return `${ecosystemName} ecosystem agents, frameworks, and infrastructure tracked on AgentCrush.`
}

function uniqueSorted(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export default async function EcosystemPage({ params }) {
  const { name } = await params
  const ecosystemName = decodeURIComponent(name)
  const supabase = supabaseAnon()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description, category_group')
    .eq('category_group', 'ecosystem')
    .ilike('name', ecosystemName)
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
          framework_name,
          network_name,
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
  }

  agentList.sort((a, b) => {
    const aScore = a.score_total ?? -1
    const bScore = b.score_total ?? -1
    return bScore - aScore
  })

  const frameworks = uniqueSorted(agentList.map((agent) => agent.framework_name))
  const infrastructure = uniqueSorted(agentList.map((agent) => agent.network_name))

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 text-white">
      <Link href="/categories" className="text-sm text-white/50 hover:text-white">
        ← Back to discovery
      </Link>

      <h1 className="mt-3 text-4xl font-semibold">{ecosystemName}</h1>
      <p className="mt-2 max-w-3xl text-white/60">
        {formatEcosystemDescription(ecosystemName, category?.description)}
      </p>

      {frameworks.length > 0 || infrastructure.length > 0 ? (
        <div className="mt-6 space-y-4">
          {frameworks.length > 0 ? (
            <div>
              <div className="mb-2 text-sm font-medium text-white/70">Frameworks</div>
              <div className="flex flex-wrap gap-2">
                {frameworks.map((framework) => (
                  <Link
                    key={framework}
                    href={`/framework/${encodeURIComponent(framework)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                  >
                    {framework}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {infrastructure.length > 0 ? (
            <div>
              <div className="mb-2 text-sm font-medium text-white/70">Infrastructure</div>
              <div className="flex flex-wrap gap-2">
                {infrastructure.map((item) => (
                  <Link
                    key={item}
                    href={`/infra/${encodeURIComponent(item)}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {agentList.length === 0 ? (
        <div className="mt-6 text-white/60">No related agents found for this ecosystem yet.</div>
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
