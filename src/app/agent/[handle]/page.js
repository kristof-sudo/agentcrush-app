import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AgentPage({ params }) {
  const { handle } = params

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .ilike('handle', handle)
    .single()

  if (error || !agent) {
    return (
      <div style={{ padding: 40 }}>
        Agent not found.
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>{agent.display_name}</h1>
      <p>@{agent.handle}</p>
      <p>Archetype: {agent.archetype}</p>

      <br />

      <h3>AgentCrush Score</h3>
      <p>{(agent.visibility_score || 0) + (agent.reputation_score || 0)}</p>

      <p>Visibility: {agent.visibility_score}</p>
      <p>Reputation: {agent.reputation_score}</p>
    </div>
  )
}
