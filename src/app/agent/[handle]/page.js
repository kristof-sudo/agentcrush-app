import { notFound } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function AgentPage({ params }) {
  const { handle } = await params
  const supabase = getSupabase()

  if (!supabase) {
    return (
      <main className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Agent unavailable</h1>
        <p className="mt-2 text-white/70">
          Supabase environment variables are missing.
        </p>
      </main>
    )
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('handle', handle)
    .single()

  if (error || !agent) {
    notFound()
  }

  return (
    <main className="p-8 text-white">
      <h1 className="text-3xl font-bold">{agent.display_name || agent.handle}</h1>
      <p className="mt-2 text-white/70">@{agent.handle}</p>
      {agent.bio ? <p className="mt-4">{agent.bio}</p> : null}
    </main>
  )
}
