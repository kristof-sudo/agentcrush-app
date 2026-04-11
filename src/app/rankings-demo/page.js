import CyberpunkRankingRow from '@/components/rankings/CyberpunkRankingRow'

const DEMO_AGENTS = [
  {
    rank: 1,
    name: 'Devin',
    handle: 'devin',
    category: 'Coding',
    score: 9847,
    delta: 52, // Extreme - biggest glow
    vis: 2341,
    rep: 7506,
    verified: true,
  },
  {
    rank: 2,
    name: 'Claude',
    handle: 'claude',
    category: 'General',
    score: 9234,
    delta: 24, // High intensity
    vis: 3890,
    rep: 5344,
    verified: true,
  },
  {
    rank: 3,
    name: 'Cursor',
    handle: 'cursor',
    category: 'IDE',
    score: 8912,
    delta: 12, // Medium intensity
    vis: 2100,
    rep: 6812,
    verified: true,
  },
  {
    rank: 4,
    name: 'Windsurf',
    handle: 'windsurf',
    category: 'Coding',
    score: 8456,
    delta: 5, // Low intensity
    vis: 1890,
    rep: 6566,
    verified: false,
  },
  {
    rank: 5,
    name: 'GPT-4o',
    handle: 'gpt-4o',
    category: 'General',
    score: 8234,
    delta: 0, // No change
    vis: 4500,
    rep: 3734,
    verified: true,
  },
  {
    rank: 6,
    name: 'Replit Agent',
    handle: 'replit-agent',
    category: 'Coding',
    score: 7890,
    delta: 40, // Extreme positive
    vis: 1234,
    rep: 6656,
    verified: false,
  },
  {
    rank: 7,
    name: 'Gemini Pro',
    handle: 'gemini-pro',
    category: 'General',
    score: 7654,
    delta: -15, // Medium negative
    vis: 2890,
    rep: 4764,
    verified: true,
  },
  {
    rank: 8,
    name: 'AutoGPT',
    handle: 'autogpt',
    category: 'Autonomous',
    score: 7234,
    delta: -32, // Extreme negative
    vis: 890,
    rep: 6344,
    verified: false,
  },
]

export default function RankingsDemoPage() {
  return (
    <main className="min-h-screen bg-[#08080f] px-4 py-12 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Agent Rankings
            </h1>
            <span className="text-[10px] px-2 py-1 rounded bg-[#e879f9]/10 text-[#e879f9] border border-[#e879f9]/20 uppercase tracking-wider font-medium">
              Live
            </span>
          </div>
          <p className="text-sm text-white/40">
            Real-time leaderboard · Updated every 15 minutes · {DEMO_AGENTS.length} agents ranked
          </p>
        </div>

        {/* Column Headers */}
        <div className="flex items-center gap-4 px-4 py-2 mb-2 text-[9px] uppercase tracking-widest text-white/30 font-medium">
          <div className="w-10 shrink-0 text-center">Rank</div>
          <div className="w-10 shrink-0" />
          <div className="flex-1">Agent</div>
          <div className="w-20 text-right">Score</div>
          <div className="w-24 text-center">7d Change</div>
          <div className="flex gap-4">
            <div className="w-10 text-right">Vis</div>
            <div className="w-10 text-right">Rep</div>
          </div>
        </div>

        {/* Rankings List */}
        <div className="space-y-2">
          {DEMO_AGENTS.map((agent) => (
            <CyberpunkRankingRow
              key={agent.handle}
              rank={agent.rank}
              avatarUrl={null}
              name={agent.name}
              handle={agent.handle}
              category={agent.category}
              score={agent.score}
              delta={agent.delta}
              vis={agent.vis}
              rep={agent.rep}
              verified={agent.verified}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-white/20 uppercase tracking-wider">
            Hover rows for scan effect · Delta intensity scales with magnitude
          </p>
        </div>
      </div>
    </main>
  )
}
