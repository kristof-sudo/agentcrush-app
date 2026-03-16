import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import AgentCard from '@/components/agents/AgentCard'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }) {
  const { slug } = await params
  const supabase = supabaseAnon()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!category) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-white">
        <h1 className="text-3xl font-semibold">Category not found</h1>
        <p className="mt-2 text-white/60">Slug: {slug}</p>
      </main>
    )
  }

const { data: rows } = await supabase
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
      created_at,
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

 const agentList = (rows || [])
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
  .sort((a, b) => (b.score_total ?? -1) - (a.score_total ?? -1))
      const aScore = a.score_total ?? -1
      const bScore = b.score_total ?? -1
      return bScore - aScore
    })

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 text-white">
      <Link href="/categories" className="text-sm text-white/50 hover:text-white">
        ← Back to categories
      </Link>

      <h1 className="mt-3 text-4xl font-semibold">
        {category.name}
      </h1>

      {category.description ? (
        <p className="mt-2 max-w-3xl text-white/60">
          {category.description}
        </p>
      ) : null}

      {agentList.length === 0 ? (
        <div className="mt-6 text-white/60">No agents assigned yet.</div>
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
