import Card from '@/components/ui/Card'

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
              <tr key={r.agent_id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-4 py-3">{r.global_rank}</td>
                <td className="px-4 py-3">{r.handle}</td>
                <td className="px-4 py-3 text-right">{r.score_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
