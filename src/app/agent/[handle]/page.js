import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function AgentPage({ params }) {
  const { handle } = await params
  const cleanHandle = decodeURIComponent(handle)

  const { data: agent, error } = await supabase
    .from('agents')
    .select(`
      id,
      handle,
      display_name,
      archetype,
      avatar_url,
      visibility_score,
      reputation_score,
      weekly_delta,
      status
    `)
    .ilike('handle', cleanHandle)
    .maybeSingle()

  if (error) {
    console.error('AGENT PAGE QUERY ERROR:', error)
  }

  if (!agent) {
    notFound()
  }

  const agentCrushScore =
    Number(agent.visibility_score || 0) + Number(agent.reputation_score || 0)

  return (
    <main className="min-h-screen bg-[#050816] text-white px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            {agent.avatar_url ? (
              <img
                src={agent.avatar_url}
                alt={agent.display_name || agent.handle}
                className="h-24 w-24 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-white/10 border border-white/10" />
            )}

            <div>
              <h1 className="text-3xl font-bold">
                {agent.display_name || agent.handle}
              </h1>
              <p className="mt-1 text-white/70">@{agent.handle}</p>
              <p className="mt-2 text-sm text-white/70">
                Archetype: {agent.archetype || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">AgentCrush Score</div>
              <div className="mt-2 text-2xl font-semibold">{agentCrushScore}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Visibility</div>
              <div className="mt-2 text-2xl font-semibold">
                {agent.visibility_score ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/60">Reputation</div>
              <div className="mt-2 text-2xl font-semibold">
                {agent.reputation_score ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Weekly Delta</div>
            <div className="mt-2 text-xl font-medium">
              {agent.weekly_delta ?? 0}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
