import Card from '@/components/ui/Card'
import Link from 'next/link'
import {
  getAgentArchetype,
  getAgentDisplayName,
  getAgentShortDescription,
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

function rankMoveReasonStyle(delta) {
  if (delta > 0) return 'text-emerald-400'
  if (delta < 0) return 'text-red-400'
  return 'text-white/40'
}

function rankMoveArrow(delta) {
  if (delta > 0) return '↑ '
  if (delta < 0) return '↓ '
  return ''
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
              <th className="px-4 py-2.5 text-left w-[70px]">#</th>
              <th className="px-4 py-2.5 text-left">Agent</th>
              <th className="px-4 py-2.5 text-center w-[100px]">Score</th>
              <th className="px-4 py-2.5 text-center w-[80px]">7d</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Visibility</th>
              <th className="px-4 py-2.5 text-center w-[90px]">Reputation</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const displayName = getAgentDisplayName(r)
              const archetype = getAgentArchetype(r)
              const delta = r.weekly_delta || 0

              return (
                <tr
                  key={r.id || r.agent_id || r.handle}
                  className="border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3 align-middle">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${rankStyle(r.global_rank)}`}>
                      #{r.global_rank}
                    </span>
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
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/30">?</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm truncate max-w-[200px]">
                            {displayName}
                          </span>
                          {archetype ? (
                            <span className={`hidden lg:inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${archetypeStyle(archetype)}`}>
                              {archetype}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-white/45 mt-0.5">@{r.handle}</div>
                        {r.rank_move_reason ? (
                          <div className={`text-xs mt-0.5 ${rankMoveReasonStyle(delta)}`}>
                            {rankMoveArrow(delta)}{r.rank_move_reason}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 align-middle text-center">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreStyle(r.score_total || 0)}`}>
                      {r.score_total || 0}
                    </span>
                  </td>

                  {/* 7d delta */}
                  <td className="px-4 py-3 align-middle text-center">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${deltaBadgeStyle(delta)}`}>
                      {formatDelta(delta)}
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
                </tr>
              )
            })}

            {rows.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
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
          const delta = r.weekly_delta || 0

          return (
            <Link
              key={r.id || r.agent_id || r.handle}
              href={`/agent/${encodeURIComponent(r.handle)}`}
              className="flex items-start gap-3 p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {r.avatar_url ? (
                  <img
                    src={r.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/30">?</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-white">{displayName}</div>
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold shrink-0 ${rankStyle(r.global_rank)}`}>
                    #{r.global_rank}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-white/45">@{r.handle}</div>
                {r.rank_move_reason ? (
                  <div className={`text-xs mt-0.5 ${rankMoveReasonStyle(delta)}`}>
                    {rankMoveArrow(delta)}{r.rank_move_reason}
                  </div>
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
                    <span className={`font-semibold ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-white/40'}`}>
                      {formatDelta(delta)}
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
