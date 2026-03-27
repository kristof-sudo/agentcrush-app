import Link from 'next/link'
import AgentCard from '@/components/agents/AgentCard'
import { supabaseAnon } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function formatFrameworkDescription(frameworkName, categoryDescription) {
  if (categoryDescription) return categoryDescription
  return `${frameworkName} agents and projects tracked on AgentCrush.`
}

function getTrendDirection(events = []) {
  if (events.length === 0) return null
  const positiveTypes = ['repo_star_growth', 'repo_release', 'audience_spike', 'launch_buzz', 'ranking_jump', 'collab_win']
  const positiveCount = events.filter((e) => positiveTypes.includes(e.event_type)).length
  if (positiveCount >= events.length * 0.6) return 'rising'
  if (positiveCount <= events.length * 0.3) return 'stable'
  return 'active'
}

function formatRelativeTime(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const d = Math.floor(diff / 86400)
  return `${d}d ago`
}

function eventLabel(eventType) {
  const map = {
    repo_star_growth: 'GitHub stars growing',
    repo_release: 'New release shipped',
    audience_spike: 'X audience spike',
    ranking_jump: 'Climbed in rankings',
    timeline_ping: 'Ecosystem mention',
    launch_buzz: 'Launch buzz',
    collab_win: 'New collaboration',
    daily_boost: 'Fresh activity',
    canon_scene: 'Ecosystem milestone',
    ecosystem_integration: 'New integration',
    dev_activity: 'Developer activity',
  }
  return map[eventType] || 'Activity detected'
}

export default async function FrameworkPage({ params }) {
  const { name } = await params
  const frameworkName = decodeURIComponent(name)
  const supabase = supabaseAnon()

  const [{ data: category }, { data: agents, error }] = await Promise.all([
    supabase
      .from('categories')
      .select('name, description, category_group')
      .eq('category_group', 'framework')
      .ilike('name', frameworkName)
      .maybeSingle(),
    supabase
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
        framework_name,
        entity_type,
        rankings (
          global_rank,
          score_visibility,
          score_reputation,
          score_total
        )
      `)
      .ilike('framework_name', frameworkName),
  ])

  if (error) {
    throw new Error(error.message)
  }

  const agentList = (agents || [])
    .map((agent) => {
      const ranking = agent?.rankings?.[0]

      return {
        ...agent,
        global_rank: ranking?.global_rank ?? null,
        score_visibility: ranking?.score_visibility ?? null,
        score_reputation: ranking?.score_reputation ?? null,
        score_total: ranking
          ? (ranking.score_visibility || 0) + (ranking.score_reputation || 0)
          : null,
      }
    })
    .sort((a, b) => (b.score_total ?? -1) - (a.score_total ?? -1))

  const agentIds = agentList.map((a) => a.id).filter(Boolean)

  let recentEvents = []
  if (agentIds.length > 0) {
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, agent_id, event_type, created_at, metadata')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(20)

    recentEvents = eventsData || []
  }

  const agentMap = new Map(agentList.map((a) => [a.id, a]))
  const trendDirection = getTrendDirection(recentEvents)
  const avgScore =
    agentList.length > 0
      ? Math.round(agentList.reduce((sum, a) => sum + (a.score_total || 0), 0) / agentList.length)
      : 0

  const topAgents = agentList.slice(0, 3)
  const trendLabel =
    trendDirection === 'rising'
      ? '↑ Rising'
      : trendDirection === 'active'
      ? '◆ Active'
      : '— Stable'
  const trendStyle =
    trendDirection === 'rising'
      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'
      : trendDirection === 'active'
      ? 'text-violet-300 bg-violet-500/10 border-violet-400/20'
      : 'text-white/50 bg-white/5 border-white/10'

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6 text-white">
      <Link href="/categories" className="text-sm text-white/50 hover:text-white">
        ← Back to discovery
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-semibold">{frameworkName}</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            {formatFrameworkDescription(frameworkName, category?.description)}
          </p>
        </div>
        <span className={`mt-1 inline-flex items-center rounded-xl border px-3 py-1.5 text-sm font-semibold ${trendStyle}`}>
          {trendLabel}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-2xl font-bold text-white">{agentList.length}</div>
          <div className="text-xs text-white/45 mt-0.5">agents</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-2xl font-bold text-white">{avgScore}</div>
          <div className="text-xs text-white/45 mt-0.5">avg score</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-2xl font-bold text-white">{recentEvents.length}</div>
          <div className="text-xs text-white/45 mt-0.5">recent signals</div>
        </div>
      </div>

      {/* Top agents mini-ranking */}
      {topAgents.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 text-sm font-semibold text-white/80">Top agents using {frameworkName}</div>
          <div className="space-y-2">
            {topAgents.map((agent, i) => (
              <Link
                key={agent.id}
                href={`/agent/${encodeURIComponent(agent.handle)}`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition"
              >
                <span className="text-sm font-bold text-white/40 w-5">#{i + 1}</span>
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {agent.avatar_url || agent.custom_background_url ? (
                    <img
                      src={agent.avatar_url || agent.custom_background_url}
                      alt={agent.display_name || agent.handle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/30">?</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white text-sm truncate">{agent.display_name || agent.handle}</div>
                  {agent.tagline ? (
                    <div className="text-xs text-white/50 truncate">{agent.tagline}</div>
                  ) : null}
                </div>
                {agent.score_total != null ? (
                  <div className="text-sm font-semibold text-white/70 shrink-0">{agent.score_total}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recent activity */}
      {recentEvents.length > 0 ? (
        <div className="mt-8">
          <div className="mb-3 text-sm font-semibold text-white/80">Recent activity in {frameworkName}</div>
          <div className="space-y-1.5">
            {recentEvents.slice(0, 6).map((event) => {
              const agent = agentMap.get(event.agent_id)
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm"
                >
                  <span className="text-white/40 text-xs w-16 shrink-0">{formatRelativeTime(event.created_at)}</span>
                  {agent ? (
                    <Link href={`/agent/${encodeURIComponent(agent.handle)}`} className="font-medium text-white hover:text-white/80 truncate max-w-[140px] shrink-0">
                      {agent.display_name || agent.handle}
                    </Link>
                  ) : null}
                  <span className="text-white/60 truncate">{eventLabel(event.event_type)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* All agents grid */}
      {agentList.length === 0 ? (
        <div className="mt-6 text-white/60">No agents using this framework yet.</div>
      ) : (
        <div className="mt-8">
          <div className="mb-3 text-sm font-semibold text-white/80">All agents ({agentList.length})</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agentList.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
