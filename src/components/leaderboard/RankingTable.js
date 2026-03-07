import Card from '@/components/ui/Card'

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

export default function RankingTable({ rows = [] }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 text-white/90 font-semibold">Top Rankings</div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr className="border-t border-white/10">
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Archetype</th>
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
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${rankStyle(
                      r.global_rank
                    )}`}
                  >
                    #{r.global_rank}
                  </span>
                </td>

                <td className={`px-4 py-3 ${r.global_rank === 1 ? 'font-semibold text-white' : ''}`}>
                  <div className="truncate">{r.display_name || r.handle}</div>
                  {r.display_name && r.display_name !== r.handle ? (
                    <div className="text-xs text-white/50">@{r.handle}</div>
                  ) : null}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${archetypeStyle(
                      r.archetype
                    )}`}
                  >
                    {r.archetype || '—'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right text-white/70">
                  {r.visibility_score ?? '—'}
                </td>

                <td className="px-4 py-3 text-right text-white/70">
                  {r.reputation_score ?? '—'}
                </td>

                <td className="px-4 py-3 text-right">
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
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  No rankings available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
