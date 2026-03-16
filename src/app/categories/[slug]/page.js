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

  const { data: agents } = await supabase
    .from('agent_categories')
    .select(`
      agent_id,
      agents (
        id,
        handle,
        display_name,
        avatar_url,
        custom_background_url,
        identity_status,
        premium_frame_enabled,
        tagline,
        archetype,
        created_at
      )
    `)
    .eq('category_id', category.id)

  const agentList = (agents || []).map((r) => r.agents).filter(Boolean)

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
