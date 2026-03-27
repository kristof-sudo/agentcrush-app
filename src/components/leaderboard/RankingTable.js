import Link from 'next/link'
import {
  getAgentArchetype,
  getAgentDisplayName,
} from '@/lib/agent-quality'

// Deterministic avatar color from handle
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

const RANK_TAGS = {
  launch_buzz:           { label: 'launch',      cls: 'bg-violet-500/15 text-violet-300/80 border-violet-500/25' },
  audience_spike:        { label: 'trending',    cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  repo_star_growth:      { label: 'repo spike',  cls: 'bg-yellow-500/15 text-yellow-300/80 border-yellow-500/25' },
  repo_release:          { label: 'release',     cls: 'bg-blue-500/15 text-blue-300/80 border-blue-500/25' },
  collab_win:            { label: 'collab',      cls: 'bg-sky-500/15 text-sky-300/80 border-sky-500/25' },
  ranking_jump:          { label: 'rising',      cls: 'bg-emerald-500/15 text-emerald-300/80 border-emerald-500/25' },
  dev_activity:          { label: 'dev active',  cls: 'bg-slate-500/15 text-slate-300/80 border-slate-500/25' },
  ecosystem_integration: { label: 'integration', cls: 'bg-cyan-500/15 text-cyan-300/80 border-cyan-500/25' },
  canon_scene:           { label: 'milestone',   cls: 'bg-indigo-500/15 text-indigo-300/80 border-indigo-500/25' },
  timeline_ping:         { label: 'mentions',    cls: 'bg-pink-500/15 text-pink-300/80 border-pink-500/25' },
}

function scoreColor(score) {
  if (score >= 1200) return 'text-emerald-300'
  if (score >= 900) return 'text-blue-300'
  if (score >= 500) return 'text-violet-300'
  return 'text-white/55'
}

function rankBadgeStyle(rank) {
  if (rank === 1) return 'text-yellow-300'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-amber-400'
  return 'text-white/25'
}

function DeltaArrow({ delta }) {
  if (delta > 5) return <span className="text-emerald-400 text-xs font-bold">↑↑</span>
  if (delta > 0) return <span className="text-emerald-400 text-xs">↑</span>
  if (delta < -5) return <span className="text-red-400 text-xs font-bold">↓↓</span>
  if (delta < 0) return <span className="text-red-400 text-xs">↓</span>
  return <span className="text-white/20 text-xs">—</span>
}

export default function RankingTable({ rows = [] }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Table header */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">All Agents</span>
        <span className="text-[11px] text-white/30 tabular-nums">{rows.length} tracked</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/25">
              <th className="px-3 py-2 text-left w-[52px]">#</th>
              <th className="px-3 py-2 text-left">Agent</th>
              <th className="px-3 py-2 text-right w-[72px]">Score</th>
              <th className="px-3 py-2 text-center w-[56px]">7d</th>
              <th className="px-3 py-2 text-right w-[64px] hidden lg:table-cell">Vis</th>
              <th className="px-3 py-2 text-right w-[64px] hidden lg:table-cell">Rep</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((r) => {
              const displayName = getAgentDisplayName(r)
              const archetype = getAgentArchetype(r)
              const delta = r.weekly_delta || 0
              const tag = r.trending?.latest_event_type ? RANK_TAGS[r.trending.latest_event_type] : null

              return (
                <tr key={r.id || r.agent_id || r.handle}
                  className="hover:bg-white/[0.025] transition-colors group">

                  {/* Rank + trend arrow */}
                  <td className="px-3 py-1.5 align-middle">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold tabular-nums w-5 text-right ${rankBadgeStyle(r.global_rank)}`}>
                        {r.global_rank}
                      </span>
                      <DeltaArrow delta={delta} />
                    </div>
                  </td>

                  {/* Agent: avatar + name + tags + move reason on hover */}
                  <td className="px-3 py-1.5 align-middle">
                    <Link href={`/agent/${encodeURIComponent(r.handle)}`}
                      className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/[0.08] flex items-center justify-center ${!r.avatar_url || r.avatar_url === '/placeholder.png' ? avatarColor(r.handle) : 'bg-white/[0.04]'}`}>
                        {r.avatar_url && r.avatar_url !== '/placeholder.png' ? (
                          <img src={r.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold">{(displayName || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate max-w-[160px]">{displayName}</span>
                          {tag ? (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium leading-none shrink-0 ${tag.cls}`}>
                              {tag.label}
                            </span>
                          ) : archetype ? (
                            <span className="hidden xl:inline text-[9px] px-1 py-0.5 rounded bg-white/[0.05] text-white/25 shrink-0 leading-none">
                              {archetype}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">@{r.handle}</span>
                          {r.rank_move_reason ? (
                            <span className={`text-[10px] truncate max-w-[200px] ${delta > 0 ? 'text-emerald-400/60' : delta < 0 ? 'text-red-400/60' : 'text-white/20'}`}>
                              {r.rank_move_reason}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Score — dimmed, delta is primary signal */}
                  <td className="px-3 py-1.5 align-middle text-right">
                    <span className={`text-[11px] font-medium tabular-nums ${scoreColor(r.score_total || 0)}`}>
                      {r.score_total || 0}
                    </span>
                  </td>

                  {/* 7d delta — emphasized */}
                  <td className="px-3 py-1.5 align-middle text-center">
                    <span className={`text-xs font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                      {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                    </span>
                  </td>

                  {/* Visibility */}
                  <td className="px-3 py-1.5 align-middle text-right hidden lg:table-cell">
                    <span className="text-[11px] font-medium text-white/50 tabular-nums">{r.visibility_score ?? '—'}</span>
                  </td>

                  {/* Reputation */}
                  <td className="px-3 py-1.5 align-middle text-right hidden lg:table-cell">
                    <span className="text-[11px] font-medium text-white/50 tabular-nums">{r.reputation_score ?? '—'}</span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-white/25">
                  No rankings available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-white/[0.05]">
        {rows.map((r) => {
          const displayName = getAgentDisplayName(r)
          const delta = r.weekly_delta || 0
          const tag = r.trending?.latest_event_type ? RANK_TAGS[r.trending.latest_event_type] : null

          return (
            <Link key={r.id || r.agent_id || r.handle}
              href={`/agent/${encodeURIComponent(r.handle)}`}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.025] transition-colors">
              <div className="flex flex-col items-center gap-0.5 w-7 shrink-0">
                <span className={`text-[10px] font-bold tabular-nums ${rankBadgeStyle(r.global_rank)}`}>{r.global_rank}</span>
                <DeltaArrow delta={delta} />
              </div>
              <div className={`h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/[0.08] flex items-center justify-center ${!r.avatar_url || r.avatar_url === '/placeholder.png' ? avatarColor(r.handle) : 'bg-white/[0.04]'}`}>
                {r.avatar_url && r.avatar_url !== '/placeholder.png' ? (
                  <img src={r.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold">{(displayName || '?')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-white truncate">{displayName}</span>
                  {tag ? (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium leading-none shrink-0 ${tag.cls}`}>
                      {tag.label}
                    </span>
                  ) : null}
                </div>
                {r.rank_move_reason ? (
                  <div className={`text-[10px] mt-0.5 ${delta > 0 ? 'text-emerald-400/60' : delta < 0 ? 'text-red-400/60' : 'text-white/20'}`}>
                    {r.rank_move_reason}
                  </div>
                ) : null}
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-bold tabular-nums ${scoreColor(r.score_total || 0)}`}>{r.score_total || 0}</div>
                <div className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                </div>
              </div>
            </Link>
          )
        })}
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-white/25">No rankings available yet.</div>
        ) : null}
      </div>
    </div>
  )
}
