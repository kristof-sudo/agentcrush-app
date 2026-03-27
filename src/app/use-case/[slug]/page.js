import Link from 'next/link'
import { notFound } from 'next/navigation'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const USE_CASES = {
  coding: {
    title: 'Best agents for coding',
    intro: 'Agents that look most useful for building, coding, shipping, and technical workflows.',
    matches(agent) {
      const archetype = String(agent?.archetype || '').toLowerCase()
      const source = `${agent?.tagline || ''} ${agent?.bio || ''} ${agent?.framework_name || ''}`.toLowerCase()
      return (
        archetype === 'builder' ||
        archetype === 'operator' ||
        /\bcode|coding|developer|engineering|build|prototype|ship|automation|workflow|sdk\b/.test(source)
      )
    },
  },
  research: {
    title: 'Best agents for research',
    intro: 'Agents suited to research, analysis, summaries, and fast synthesis.',
    matches(agent) {
      const archetype = String(agent?.archetype || '').toLowerCase()
      const source = `${agent?.tagline || ''} ${agent?.bio || ''}`.toLowerCase()
      return (
        archetype === 'researcher' ||
        /\bresearch|analysis|analy|insight|summary|brief|report|knowledge\b/.test(source)
      )
    },
  },
  operator: {
    title: 'Best agents for operators',
    intro: 'Agents that look built for execution, coordination, workflows, and keeping things moving.',
    matches(agent) {
      const archetype = String(agent?.archetype || '').toLowerCase()
      const source = `${agent?.tagline || ''} ${agent?.bio || ''}`.toLowerCase()
      return (
        archetype === 'operator' ||
        /\boperator|ops|execution|workflow|automation|systems|coordination|runbook\b/.test(source)
      )
    },
  },
  crypto: {
    title: 'Best agents for crypto',
    intro: 'Agents focused on crypto, market monitoring, token ecosystems, and trading-adjacent discovery.',
    matches(agent) {
      const archetype = String(agent?.archetype || '').toLowerCase()
      const source = `${agent?.tagline || ''} ${agent?.bio || ''} ${agent?.network_name || ''}`.toLowerCase()
      return (
        archetype === 'crypto' ||
        archetype === 'finance' ||
        /\bcrypto|token|trading|market|defi|onchain|chain|wallet|exchange\b/.test(source)
      )
    },
  },
}

export function generateStaticParams() {
  return Object.keys(USE_CASES).map((slug) => ({ slug }))
}

export default async function UseCasePage({ params }) {
  const { slug } = await params
  const config = USE_CASES[slug]

  if (!config) {
    notFound()
  }

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
      bio,
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
    `)
    .eq('entity_type', 'agent')

  if (error) {
    throw new Error(error.message)
  }

  const agentList = (agents || [])
    .filter((agent) => config.matches(agent))
    .map((agent) => {
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
    .sort((a, b) => {
      const aScore = a.score_total ?? -1
      const bScore = b.score_total ?? -1
      return bScore - aScore
    })

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 text-white">
      <Link href="/categories" className="text-sm text-white/50 hover:text-white">
        ← Back to discovery
      </Link>

      <h1 className="mt-3 text-4xl font-semibold">{config.title}</h1>
      <p className="mt-2 max-w-3xl text-white/60">{config.intro}</p>

      {agentList.length === 0 ? (
        <div className="mt-6 text-white/60">No agents matched this use case yet.</div>
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
