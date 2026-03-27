import Card from '@/components/ui/Card'
import Link from 'next/link'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
  isDemoAgent,
} from '@/lib/agent-quality'

function rankStyle(rank) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'
  if (rank === 2) return 'bg-gray-400/20 text-gray-200 border-gray-300/30'
  if (rank === 3) return 'bg-amber-700/20 text-amber-400 border-amber-500/30'
  return 'bg-white/5 text-white/70 border-white/10'
}

function scoreStyle(score) {
  if (score >= 1200) return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  if (score >= 900) return 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  if (score >= 500) return 'bg-violet-500/15 text-violet-300 border-violet-400/20'
  return 'bg-white/5 text-white/60 border-white/10'
}

function archetypeStyle(value) {
  if (!value) return 'bg-white/5 text-white/60 border-white/10'

  const v = value.toLowerCase()

  if (v === 'finance') return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
  if (v === 'corporate') return 'bg-sky-500/20 text-sky-200 border-sky-400/30'
  if (v === 'builder') return 'bg-violet-500/20 text-violet-200 border-violet-400/30'
  if (v === 'creator') return 'bg-pink-500/20 text-pink-200 border-pink-400/30'
  if (v === 'fitness') return 'bg-orange-500/20 text-orange-200 border-orange-400/30'
  if (v === 'researcher') return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30'
  if (v === 'socialite') return 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30'
  if (v === 'mystic') return 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
  if (v === 'crypto') return 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30'
  if (v === 'lifestyle') return 'bg-rose-500/20 text-rose-200 border-rose-400/30'
  if (v === 'romantic') return 'bg-pink-500/20 text-pink-200 border-pink-400/30'
  if (v === 'operator') return 'bg-slate-500/20 text-slate-200 border-slate-400/30'
  if (v === 'caretaker') return 'bg-teal-500/20 text-teal-200 border-teal-400/30'
  if (v === 'rebel') return 'bg-red-500/20 text-red-200 border-red-400/30'

  return 'bg-white/5 text-white/60 border-white/10'
}

function deltaBadgeStyle(delta) {
  if (delta > 0) return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25'
  if (delta < 0) return 'bg-red-500/15 text-red-300 border-red-400/25'
  return 'bg-white/5 text-white/40 border-white/10'
}

function formatDelta(delta) {
  if (!delta) return '—'
  return delta > 0 ? `+${delta}` : `${delta}`
}

function getRankMovementValue(row) {
  const candidates = [row?.rank_delta, row?.delta, row?.change, row?.rankChange]

  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue

    const numericValue = Number(value)
    if (!Number.isNaN(numericValue)) return numericValue
  }

  return 0
}

function rankMovementStyle(delta) {
  if (delta > 0) return 'text-emerald-400'
  if (delta < 0) return 'text-red-400'
  return 'text-white/30'
}

function formatRankMovement(delta) {
  if (delta > 0) return `↑${delta}`
  if (delta < 0) return `↓${Math.abs(delta)}`
  return null
}

function getTrendingLabel(agent) {
  const eventType =
    agent?.latest_event_type ||
    agent?.event_type ||
    agent?.latestEventType ||
    agent?.trending?.latest_event_type ||
    agent?.trending?.event_type ||
    null

  const labelByEventType = {
    launch_buzz: 'Launch buzz',
    repo_star_growth: 'GitHub spike',
    audience_spike: 'X traction',
    ranking_jump: 'Ranking momentum',
    collab_win: 'Partnership',
    daily_boost: 'Fresh activity',
    timeline_ping: 'Ecosystem mention',
    repo_release: 'New release',
    ecosystem_integration: 'New integration',
    dev_activity: 'Dev activity',
  }

  return labelByEventType[eventType] || null
}

function getTrendingStyle(agent) {
  const eventType =
    agent?.latest_event_type ||
    agent?.event_type ||
    agent?.latestEventType ||
    agent?.trending?.latest_event_type ||
    agent?.trending?.event_type ||
    null

  if (eventType === 'launch_buzz' || eventType === 'repo_release') {
    return 'bg-amber-500/15 text-amber-300 border-amber-400/20'
  }
  if (eventType === 'repo_star_growth' || eventType === 'dev_activity') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
  }
  if (eventType === 'audience_spike' || eventType === 'timeline_ping') {
    return 'bg-sky-500/15 text-sky-300 border-sky-400/20'
  }
  if (eventType === 'ranking_jump') {
    return 'bg-violet-500/15 text-violet-300 border-violet-400/20'
  }
  if (eventType === 'collab_win' || eventType === 'ecosystem_integration') {
    return 'bg-teal-500/15 text-teal-300 border-teal-400/20'
  }
  return 'bg-white/5 text-white/40 border-white/10'
}

function getCredibilityLabel(agent) {
  if (agent?.verified === true) return 'Verified'
  if (agent?.is_demo === true || isDemoAgent(agent)) return 'Demo'
  return 'Real'
}

export default function RankingTable({ rows = [] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-white/90 font-semibold">Rankings</span>
        <span className="text-xs text-white/40">{rows.length} agents tracked</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-white/10 text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-2.5 text-left w-[80px]">#</th>
              <th className="px-4 py-2.5 text-left">Agent</th>
              <th className="px-4 py-2.5 text-center w-[100px]">Score</th>
              <th className="px-4 py-2.5 text-center w-[80px]">7d</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Visibility</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Reputation</th>
              <th className="px-4 py-2.5 text-left w-[140px]">Signal</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const displayName = getAgentDisplayName(r)
              const archetype = getAgentArchetype(r)
              const description = getAgentShortDescription(r)
              const rankMovement = getRankMovementValue(r)
              const trendingLabel = getTrendingLabel(r)

              return (
                <tr
                  key={r.id || r.agent_id || r.handle}
                  className="border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col items-start gap-0.5">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${rankStyle(r.global_rank)}`}
                      >
                        #{r.global_rank}
                      </span>
                      {rankMovement !== 0 ? (
                        <span className={`text-[11px] font-medium ${rankMovementStyle(rankMovement)}`}>
                          {formatRankMovement(rankMovement)}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/agent/${encodeURIComponent(r.handle)}`}
                      className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt={r.display_name || r.handle || 'Agent avatar'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                            ?
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm truncate max-w-[200px]">
                            {displayName}
                          </span>
                          {archetype ? (
                            <span
                              className={`hidden lg:inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${archetypeStyle(archetype)}`}
                            >
                              {archetype}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-white/45 mt-0.5">@{r.handle}</div>
                        {description ? (
                          <div className="text-xs text-white/55 mt-0.5 line-clamp-1 max-w-[320px]">
                            {description}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 align-middle text-center">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreStyle(r.score_total || 0)}`}
                    >
                      {r.score_total || 0}
                    </span>
                  </td>

                  {/* 7d delta */}
                  <td className="px-4 py-3 align-middle text-center">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${deltaBadgeStyle(r.weekly_delta || 0)}`}
                    >
                      {formatDelta(r.weekly_delta || 0)}
                    </span>
                  </td>

                  {/* Visibility */}
                  <td className="px-4 py-3 align-middle text-center">
                    <div className="text-sm font-medium text-white/70">{r.visibility_score ?? '—'}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">vis</div>
                  </td>

                  {/* Reputation */}
                  <td className="px-4 py-3 align-middle text-center">
                    <div className="text-sm font-medium text-white/70">{r.reputation_score ?? '—'}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">rep</div>
                  </td>

                  {/* Signal */}
                  <td className="px-4 py-3 align-middle">
                    {trendingLabel ? (
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getTrendingStyle(r)}`}
                      >
                        {trendingLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-white/25">Stable</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  No rankings available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-white/[0.06]">
        {rows.map((r) => {
          const displayName = getAgentDisplayName(r)
          const archetype = getAgentArchetype(r)
          const description = getAgentShortDescription(r)
          const rankMovement = getRankMovementValue(r)
          const trendingLabel = getTrendingLabel(r)

          return (
            <Link
              key={r.id || r.agent_id || r.handle}
              href={`/agent/${encodeURIComponent(r.handle)}`}
              className="flex items-start gap-3 p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {r.avatar_url ? (
                  <img
                    src={r.avatar_url}
                    alt={r.display_name || r.handle || 'Agent avatar'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/30">?</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-white">{displayName}</div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${rankStyle(r.global_rank)}`}>
                      #{r.global_rank}
                    </span>
                    {rankMovement !== 0 ? (
                      <span className={`text-[11px] font-medium ${rankMovementStyle(rankMovement)}`}>
                        {formatRankMovement(rankMovement)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-0.5 text-xs text-white/45">@{r.handle}</div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {archetype ? (
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${archetypeStyle(archetype)}`}>
                      {archetype}
                    </span>
                  ) : null}
                  {trendingLabel ? (
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getTrendingStyle(r)}`}>
                      {trendingLabel}
                    </span>
                  ) : null}
                </div>

                {description ? (
                  <div className="mt-1 text-xs text-white/55 line-clamp-1">{description}</div>
                ) : null}

                <div className="mt-2 flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-white/40">Score</span>
                    <span className={`font-bold ${(r.score_total || 0) >= 900 ? 'text-emerald-300' : 'text-white/80'}`}>
                      {r.score_total || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/40">7d</span>
                    <span className={`font-semibold ${(r.weekly_delta || 0) > 0 ? 'text-emerald-300' : (r.weekly_delta || 0) < 0 ? 'text-red-300' : 'text-white/40'}`}>
                      {formatDelta(r.weekly_delta || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/40">Vis</span>
                    <span className="text-white/70">{r.visibility_score ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/40">Rep</span>
                    <span className="text-white/70">{r.reputation_score ?? '—'}</span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/40">
            No rankings available yet.
          </div>
        ) : null}
      </div>
    </Card>
  )
}
