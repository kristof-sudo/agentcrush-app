import Link from 'next/link'
import { supabaseAnon } from '@/lib/supabase'

function toPublicImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${path}`
}

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300', 'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300', 'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300', 'bg-cyan-500/25 text-cyan-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const ARCHETYPE_META = {
  'Code Assistant':      { icon: '⌨', color: 'text-violet-300', bg: 'bg-violet-500/10 border-violet-500/20' },
  'DeFi Bot':            { icon: '⬡', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'Research Agent':      { icon: '⌬', color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/20' },
  'Autonomous Agent':    { icon: '◎', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
  'Data Agent':          { icon: '▦', color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  'Social Agent':        { icon: '◈', color: 'text-pink-300', bg: 'bg-pink-500/10 border-pink-500/20' },
  'Trading Bot':         { icon: '↗', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  'Infrastructure':      { icon: '⬡', color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/20' },
  'Framework':           { icon: '◫', color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/20' },
}

function getArchetypeMeta(archetype) {
  return ARCHETYPE_META[archetype] || { icon: '◆', color: 'text-white/60', bg: 'bg-white/[0.05] border-white/[0.08]' }
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = supabaseAnon()

  const { data: rankingsData, error } = await supabase
    .from('rankings')
    .select(`
      agent_id, global_rank, score_visibility, score_reputation, score_total,
      agent:agents!inner (
        id, handle, display_name, archetype, avatar_url, custom_background_url, weekly_delta
      )
    `)
    .order('global_rank', { ascending: true })

  if (error) throw new Error(error.message)

  // Group by archetype
  const archetypeMap = {}
  for (const row of rankingsData || []) {
    const agent = row.agent || {}
    const key = agent.archetype || 'Other'
    if (!archetypeMap[key]) archetypeMap[key] = []
    archetypeMap[key].push({
      id: agent.id || row.agent_id,
      handle: agent.handle,
      display_name: agent.display_name,
      archetype: agent.archetype,
      avatar_url: toPublicImageUrl(agent.custom_background_url || agent.avatar_url),
      weekly_delta: agent.weekly_delta || 0,
      global_rank: row.global_rank,
      score_total: (row.score_visibility || 0) + (row.score_reputation || 0),
    })
  }

  // Build category stats
  const categories = Object.entries(archetypeMap).map(([archetype, agents]) => {
    const risingCount = agents.filter((a) => a.weekly_delta > 0).length
    const trend = agents.length > 0 ? Math.round((risingCount / agents.length) * 100) : 0
    const avgDelta = agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.weekly_delta, 0) / agents.length)
      : 0
    return {
      archetype,
      total: agents.length,
      risingCount,
      trend,
      avgDelta,
      top5: agents.slice(0, 5),
    }
  }).sort((a, b) => b.total - a.total)

  // Trending categories = top 5 by risingCount (min 2 agents)
  const hotCategories = [...categories]
    .filter((c) => c.total >= 2)
    .sort((a, b) => b.risingCount - a.risingCount || b.trend - a.trend)
    .slice(0, 5)

  const totalAgents = categories.reduce((s, c) => s + c.total, 0)
  const totalRising = categories.reduce((s, c) => s + c.risingCount, 0)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-white/45">
          AI agent ecosystem by type · {totalAgents} agents indexed ·{' '}
          <span className="text-emerald-400">{totalRising} rising</span>
        </p>
      </div>

      {/* Hot categories row */}
      {hotCategories.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Trending Categories</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {hotCategories.map((cat) => {
              const meta = getArchetypeMeta(cat.archetype)
              return (
                <Link
                  key={cat.archetype}
                  href={`/rankings?q=${encodeURIComponent(cat.archetype)}`}
                  className={`rounded-lg border p-3 transition hover:brightness-110 ${meta.bg}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-base ${meta.color}`}>{meta.icon}</span>
                    <span className={`text-xs font-bold ${meta.color}`}>{cat.archetype}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/50">{cat.total} agents</span>
                    {cat.trend > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-400">+{cat.trend}%</span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* All categories — mini leaderboard cards */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">All Categories</span>
          <span className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] text-white/30">{categories.length} categories</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const meta = getArchetypeMeta(cat.archetype)
            return (
              <div
                key={cat.archetype}
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden"
              >
                {/* Card header */}
                <Link
                  href={`/rankings?q=${encodeURIComponent(cat.archetype)}`}
                  className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] hover:bg-white/[0.025] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${meta.color}`}>{meta.icon}</span>
                    <span className="text-xs font-semibold text-white">{cat.archetype}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cat.risingCount > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-400">
                        ↑ {cat.trend}% rising
                      </span>
                    )}
                    <span className="text-[10px] text-white/35 tabular-nums">{cat.total} agents</span>
                  </div>
                </Link>

                {/* Top 5 mini-leaderboard */}
                <div className="divide-y divide-white/[0.04]">
                  {cat.top5.map((agent, i) => {
                    const displayName = agent.display_name || agent.handle || '?'
                    const delta = agent.weekly_delta || 0
                    return (
                      <Link
                        key={agent.id || agent.handle}
                        href={`/agent/${encodeURIComponent(agent.handle)}`}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.025] transition-colors group"
                      >
                        {/* Rank */}
                        <span className="text-[10px] tabular-nums text-white/25 w-3 shrink-0 text-right">{i + 1}</span>

                        {/* Avatar */}
                        <div className={`h-5 w-5 shrink-0 rounded overflow-hidden flex items-center justify-center border border-white/[0.07] ${!agent.avatar_url ? avatarColor(agent.handle) : 'bg-white/[0.04]'}`}>
                          {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[7px] font-bold">{(displayName)[0].toUpperCase()}</span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-[11px] text-white/80 truncate flex-1 min-w-0">{displayName}</span>

                        {/* Delta */}
                        <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                        </span>
                      </Link>
                    )
                  })}
                </div>

                {/* Footer: see all */}
                {cat.total > 5 && (
                  <Link
                    href={`/rankings?q=${encodeURIComponent(cat.archetype)}`}
                    className="flex items-center justify-center px-3 py-1.5 border-t border-white/[0.04] text-[10px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    +{cat.total - 5} more
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
