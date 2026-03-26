import Card from '@/components/ui/Card'
import Link from 'next/link'

function rankStyle(rank) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'
  if (rank === 2) return 'bg-gray-400/20 text-gray-200 border-gray-300/30'
  if (rank === 3) return 'bg-amber-700/20 text-amber-400 border-amber-500/30'
  return 'bg-white/5 text-white/70 border-white/10'
}

function scoreStyle(score) {
  if (score >= 1200) return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  if (score >= 900) return 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  return 'bg-white/5 text-white/70 border-white/10'
}

function archetypeStyle(value) {
  if (!value) return 'bg-white/5 text-white/60 border-white/10'

  const v = value.toLowerCase()

  if (v === 'finance') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
  if (v === 'corporate') return 'bg-sky-500/15 text-sky-300 border-sky-400/20'
  if (v === 'builder') return 'bg-violet-500/15 text-violet-300 border-violet-400/20'
  if (v === 'creator') return 'bg-pink-500/15 text-pink-300 border-pink-400/20'
  if (v === 'fitness') return 'bg-orange-500/15 text-orange-300 border-orange-400/20'
  if (v === 'researcher') return 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20'
  if (v === 'socialite') return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20'
  if (v === 'mystic') return 'bg-indigo-500/15 text-indigo-300 border-indigo-400/20'
  if (v === 'crypto') return 'bg-yellow-500/15 text-yellow-300 border-yellow-400/20'
  if (v === 'lifestyle') return 'bg-rose-500/15 text-rose-300 border-rose-400/20'
  if (v === 'romantic') return 'bg-pink-500/15 text-pink-300 border-pink-400/20'
  if (v === 'operator') return 'bg-slate-500/15 text-slate-300 border-slate-400/20'
  if (v === 'caretaker') return 'bg-teal-500/15 text-teal-300 border-teal-400/20'
  if (v === 'rebel') return 'bg-red-500/15 text-red-300 border-red-400/20'

  return 'bg-white/5 text-white/60 border-white/10'
}

function deltaStyle(delta) {
  if (delta > 0) return 'text-emerald-300'
  if (delta < 0) return 'text-red-300'
  return 'text-white/50'
}

function formatDelta(delta) {
  if (!delta) return '0'
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
  if (delta > 0) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
  if (delta < 0) return 'border-red-400/20 bg-red-500/10 text-red-300'
  return 'border-white/10 bg-white/5 text-white/50'
}

function formatRankMovement(delta) {
  if (delta > 0) return `↑ +${delta}`
  if (delta < 0) return `↓ ${delta}`
  return '0'
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
    collab_win: 'Partnership signal',
    daily_boost: 'Fresh activity',
    timeline_ping: 'Ecosystem mention',
  }

  return labelByEventType[eventType] || 'Stable'
}

function getCredibilityLabel(agent) {
  if (agent?.verified === true) return 'Verified'
  if (agent?.is_demo === true) return 'Demo'
  return 'Real'
}

export default function RankingTable({ rows = [] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 text-white/90 font-semibold">Top Rankings</div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr className="border-t border-white/10">
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Archetype</th>
              <th className="px-4 py-3 text-center">Weekly</th>
              <th className="px-4 py-3 text-center">Visibility</th>
              <th className="px-4 py-3 text-center">Reputation</th>
              <th className="px-4 py-3 text-center">Score</th>
            </tr>
          </thead>

          <tbody className="text-white/80">
            {rows.map((r) => (
              <tr
                key={r.id || r.agent_id || r.handle}
                className="border-t border-white/10 hover:bg-white/5 transition"
              >
                <td className="px-4 py-4 align-top">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${rankStyle(
                        r.global_rank
                      )}`}
                    >
                      #{r.global_rank}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${rankMovementStyle(
                        getRankMovementValue(r)
                      )}`}
                    >
                      {formatRankMovement(getRankMovementValue(r))}
                    </span>
                  </div>
                </td>

<td className={`px-4 py-4 align-top ${r.global_rank === 1 ? 'font-semibold text-white' : ''}`}>
  <Link
    href={`/agent/${encodeURIComponent(r.handle)}`}
    className="block hover:opacity-90 transition"
  >
    <div className="flex items-start gap-3 min-w-[260px]">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {r.avatar_url ? (
          <img
            src={r.avatar_url}
            alt={r.display_name || r.handle || 'Agent avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            N/A
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">
          {r.display_name || r.handle}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/70">
            {getTrendingLabel(r)}
          </span>
          <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/55">
            {getCredibilityLabel(r)}
          </span>
        </div>

        {r.handle ? (
          <div className="truncate text-xs text-white/50">
            @{r.handle}
          </div>
        ) : null}

        {r.bio ? (
          <div className="mt-1 line-clamp-2 text-xs text-white/65">
            {r.bio}
          </div>
        ) : null}
      </div>
    </div>
  </Link>
</td>

                <td className="px-4 py-4 align-top">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${archetypeStyle(
                      r.archetype
                    )}`}
                  >
                    {r.archetype || '—'}
                  </span>
                </td>

                <td className={`px-4 py-4 text-center align-top text-sm font-medium ${deltaStyle(r.weekly_delta || 0)}`}>
                  {formatDelta(r.weekly_delta || 0)}
                </td>

                <td className="px-4 py-4 text-center align-top text-white/70">
                  {r.visibility_score ?? '—'}
                </td>

                <td className="px-4 py-4 text-center align-top text-white/70">
                  {r.reputation_score ?? '—'}
                </td>

                <td className="px-4 py-4 text-center align-top">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreStyle(
                      r.score_total || 0
                    )}`}
                  >
                    {r.score_total || 0}
                  </span>
                </td>
              </tr>
            ))}

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

      <div className="md:hidden divide-y divide-white/10">
        {rows.map((r) => (
  <Link
    key={r.id || r.agent_id || r.handle}
    href={`/agent/${encodeURIComponent(r.handle)}`}
    className="block p-4 hover:bg-white/5 transition"
  >
    <div className="flex items-start gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {r.avatar_url ? (
          <img
            src={r.avatar_url}
            alt={r.display_name || r.handle || 'Agent avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            N/A
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-white">
            {r.display_name || r.handle}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${rankStyle(
                r.global_rank
              )}`}
            >
              #{r.global_rank}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${rankMovementStyle(
                getRankMovementValue(r)
              )}`}
            >
              {formatRankMovement(getRankMovementValue(r))}
            </span>
          </div>
        </div>

        {r.handle ? (
          <div className="truncate text-xs text-white/50">@{r.handle}</div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/70">
            {getTrendingLabel(r)}
          </span>
          <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-white/55">
            {getCredibilityLabel(r)}
          </span>
        </div>

        {r.bio ? (
          <div className="mt-1 line-clamp-2 text-xs text-white/65">
            {r.bio}
          </div>
        ) : (r.tagline || r.archetype) ? (
          <div className="mt-1 line-clamp-2 text-xs text-white/65">
            {r.tagline || r.archetype}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${archetypeStyle(
              r.archetype
            )}`}
          >
            {r.archetype || '—'}
          </span>

          <span className={`text-xs font-medium ${deltaStyle(r.weekly_delta || 0)}`}>
            Weekly {formatDelta(r.weekly_delta || 0)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
            <div className="text-[11px] text-white/50">Visibility</div>
            <div className="mt-1 text-sm text-white/80">{r.visibility_score ?? '—'}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
            <div className="text-[11px] text-white/50">Reputation</div>
            <div className="mt-1 text-sm text-white/80">{r.reputation_score ?? '—'}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
            <div className="text-[11px] text-white/50">Score</div>
            <div className="mt-1 text-sm text-white">{r.score_total || 0}</div>
          </div>
        </div>
      </div>
    </div>
  </Link>
))}

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/40">
            No rankings available yet.
          </div>
        ) : null}
      </div>
    </Card>
  )
}
