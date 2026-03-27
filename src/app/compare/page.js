import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'
import { getAgentArchetype, getAgentDisplayName } from '@/lib/agent-quality'

export const dynamic = 'force-dynamic'

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/${path}` : null
}

function formatTimeAgo(value) {
  if (!value) return ''
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const EVENT_LABELS = {
  repo_star_growth: 'repo spike', audience_spike: 'X spike', launch_buzz: 'launch buzz',
  ranking_jump: 'ranking jump', repo_release: 'new release', timeline_ping: 'ecosystem mention',
  ecosystem_integration: 'integration', collab_win: 'collab', dev_activity: 'dev activity',
}

async function fetchAgent(supabase, handle) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id, handle, display_name, archetype, avatar_url, custom_background_url, visibility_score, reputation_score, weekly_delta, bio, tagline, ecosystem_layer')
    .ilike('handle', handle)
    .maybeSingle()
  if (!agent) return null

  const [rankingRes, eventsRes] = await Promise.all([
    supabase.from('rankings').select('global_rank, score_visibility, score_reputation').eq('agent_id', agent.id).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('events').select('event_type, created_at').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(5),
  ])

  const ranking = rankingRes.data
  return {
    ...agent,
    display_name: getAgentDisplayName(agent),
    archetype: getAgentArchetype(agent),
    avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
    global_rank: ranking?.global_rank ?? null,
    score_total: ranking ? (ranking.score_visibility || 0) + (ranking.score_reputation || 0)
      : (Number(agent.visibility_score || 0) + Number(agent.reputation_score || 0)),
    recent_events: eventsRes.data || [],
  }
}

function ScoreBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-bold tabular-nums text-white/70">{value ?? '—'}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.08]">
        <div className={`h-1 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function ComparePage({ searchParams }) {
  const { a, b } = await searchParams || {}

  if (!a || !b) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 text-white">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Compare Agents</h1>
          <p className="mt-1 text-sm text-white/40">Side-by-side score, movement, and signal breakdown.</p>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-6 text-center">
          <div className="text-sm text-white/40 mb-2">Add two agent handles to the URL to compare</div>
          <code className="text-xs text-violet-300 bg-violet-500/10 px-3 py-1 rounded">/compare?a=handle1&b=handle2</code>
          <div className="mt-4">
            <Link href="/rankings" className="text-xs text-violet-400 hover:text-violet-300 underline transition-colors">
              Browse rankings to find agents →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const supabase = supabaseAnon()
  const [agentA, agentB] = await Promise.all([
    fetchAgent(supabase, a),
    fetchAgent(supabase, b),
  ])

  if (!agentA || !agentB) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 text-white">
        <h1 className="text-xl font-bold mb-3">Compare Agents</h1>
        <p className="text-sm text-white/40">
          {!agentA && <span>Agent &quot;{a}&quot; not found. </span>}
          {!agentB && <span>Agent &quot;{b}&quot; not found.</span>}
        </p>
        <Link href="/rankings" className="mt-3 inline-block text-xs text-violet-400 underline">← Rankings</Link>
      </main>
    )
  }

  const maxScore = Math.max(agentA.score_total || 0, agentB.score_total || 0, 1)
  const maxVis = Math.max(agentA.visibility_score || 0, agentB.visibility_score || 0, 1)
  const maxRep = Math.max(agentA.reputation_score || 0, agentB.reputation_score || 0, 1)

  const agents = [agentA, agentB]

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 text-white">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/rankings" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">← Rankings</Link>
        <span className="text-[11px] text-white/20">/</span>
        <h1 className="text-base font-semibold text-white">Compare</h1>
      </div>

      {/* Agent headers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {agents.map((agent) => (
          <Link key={agent.handle} href={`/agent/${encodeURIComponent(agent.handle)}`}
            className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.04] flex items-center justify-center">
                {agent.avatar_url
                  ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                  : <span className="text-sm font-bold text-white/50">{agent.display_name[0]}</span>}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{agent.display_name}</div>
                <div className="text-[11px] text-white/40">@{agent.handle}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/35 border border-white/[0.07] leading-none">{agent.archetype}</span>
              {agent.global_rank && <span className="text-[10px] text-white/35">#{agent.global_rank}</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Score comparison */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 mb-3">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Score Breakdown</div>
        <div className="grid grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div key={agent.handle} className="space-y-3">
              <ScoreBar label="Total" value={agent.score_total} max={maxScore} color="bg-white/50" />
              <ScoreBar label="Visibility" value={agent.visibility_score} max={maxVis} color="bg-sky-400" />
              <ScoreBar label="Reputation" value={agent.reputation_score} max={maxRep} color="bg-violet-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Movement + why */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden mb-3">
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">7d Movement</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          {agents.map((agent) => {
            const delta = agent.weekly_delta || 0
            const latestEvent = agent.recent_events?.[0]?.event_type
            return (
              <div key={agent.handle} className="px-4 py-3">
                <div className={`text-2xl font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/25'}`}>
                  {delta > 0 ? `+${delta}` : delta < 0 ? delta : '—'}
                </div>
                {latestEvent && EVENT_LABELS[latestEvent] ? (
                  <div className="mt-1 text-[11px] text-white/40">{EVENT_LABELS[latestEvent]}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent events */}
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Recent Signals</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
          {agents.map((agent) => (
            <div key={agent.handle} className="divide-y divide-white/[0.04]">
              {agent.recent_events.length > 0 ? agent.recent_events.map((e, i) => (
                <div key={i} className="flex items-start justify-between gap-2 px-3 py-1.5">
                  <span className="text-[11px] text-white/55">{EVENT_LABELS[e.event_type] || e.event_type}</span>
                  <span className="text-[10px] text-white/20 shrink-0 tabular-nums">{formatTimeAgo(e.created_at)}</span>
                </div>
              )) : (
                <div className="px-3 py-3 text-[11px] text-white/20">No recent signals</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
