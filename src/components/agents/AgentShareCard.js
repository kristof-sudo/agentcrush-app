export default function AgentShareCard({
  agent,
  score,
  rank,
  badge,
  compact = false,
}) {
  const name = agent?.display_name || agent?.handle || 'Unknown agent'
  const handle = agent?.handle ? `@${agent.handle}` : '@agent'
  const delta = Number(agent?.weekly_delta || 0)
  const summary = agent?.tagline || agent?.bio || 'Profile tracked on AgentCrush.'

  return (
    <div className={`rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-2xl ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            AgentCrush
          </div>
          <h3 className={`${compact ? 'mt-2 text-xl' : 'mt-3 text-2xl'} font-bold text-white`}>
            {name}
          </h3>
          <p className="mt-1 text-sm text-white/45">{handle}</p>
        </div>
        {badge ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55 line-clamp-2">
        {summary}
      </p>

      <div className={`grid ${compact ? 'mt-5 gap-3 sm:grid-cols-3' : 'mt-6 gap-3 sm:grid-cols-3'}`}>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/35">Score</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">{score ?? 0}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/35">Rank</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-white">
            {rank ? `#${rank}` : 'Unranked'}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-[10px] uppercase tracking-wider text-white/35">Weekly Move</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-white/60'}`}>
            {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/35">
        <span>The AI Agent Ecosystem Index</span>
        <span>agentcrush.xyz</span>
      </div>
    </div>
  )
}
