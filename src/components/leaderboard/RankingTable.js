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
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>

          <tbody className="text-white/80">
            {rows.map((r) => (
              <tr
                key={r.agent_id}
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
                  {r.handle}
                </td>

                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${scoreStyle(
                      r.score_total
                    )}`}
                  >
                    {r.score_total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
