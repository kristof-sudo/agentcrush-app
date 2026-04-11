'use client'

// TODO: replace mock data with real news_items Supabase query when Phase 3 RSS backend is built
const MOCK_INTEL = [
  {
    id: 1,
    source: 'VentureBeat',
    headline: 'Autonomous agents are taking over enterprise workflows faster than predicted',
    time: '4h ago',
    featured: true,
  },
  {
    id: 2,
    source: 'TechCrunch',
    headline: 'New wave of agentic startups raises $2.4B in Q1 2026',
    time: '6h ago',
  },
  {
    id: 3,
    source: 'The Information',
    headline: 'OpenAI's agent runtime sees 10x usage spike in 30 days',
    time: '9h ago',
  },
  {
    id: 4,
    source: 'Wired',
    headline: 'Agent-to-agent communication protocols emerge as new battleground',
    time: '12h ago',
  },
  {
    id: 5,
    source: 'Reuters',
    headline: 'Financial regulators begin monitoring autonomous trading agents',
    time: '1d ago',
  },
]

const SOURCE_COLORS = {
  VentureBeat: { bg: 'rgba(167,139,250,0.18)', text: '#a78bfa' },
  TechCrunch:  { bg: 'rgba(251,146,60,0.18)',  text: '#fb923c' },
  'The Information': { bg: 'rgba(0,212,255,0.14)', text: '#00d4ff' },
  Wired:       { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  Reuters:     { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
}

function SourceBadge({ source }) {
  const style = SOURCE_COLORS[source] || { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' }
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide shrink-0"
      style={{ background: style.bg, color: style.text }}
    >
      {source}
    </span>
  )
}

function CornerAccent() {
  return (
    <>
      <span className="pointer-events-none absolute top-0 left-0 w-3 h-3 border-t border-l border-[rgba(0,212,255,0.3)]" />
      <span className="pointer-events-none absolute top-0 right-0 w-3 h-3 border-t border-r border-[rgba(0,212,255,0.3)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[rgba(0,212,255,0.3)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[rgba(0,212,255,0.3)]" />
    </>
  )
}

export default function AgentIntelBar() {
  const featured = MOCK_INTEL[0]
  const headlines = MOCK_INTEL.slice(1, 5)

  return (
    <div className="relative rounded-lg border border-[rgba(0,212,255,0.12)] bg-[#0a0a14] overflow-hidden mb-3">
      <CornerAccent />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,212,255,0.08)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[rgba(0,212,255,0.7)]">⚡</span>
          <span className="font-mono text-xs font-bold text-white tracking-wide">AGENT INTEL</span>
        </div>
        <span className="font-mono text-[10px] text-white/25">Updated 4h ago</span>
      </div>

      {/* Body: two columns */}
      <div className="flex flex-col sm:flex-row gap-0">

        {/* LEFT: Featured article (38%) */}
        <div className="sm:w-[38%] p-2 border-b sm:border-b-0 sm:border-r border-white/[0.05]">
          <div className="relative rounded overflow-hidden mb-2" style={{height: 120}}>
            {/* Gradient placeholder image */}
            <div
              className="absolute inset-0"
              style={{background: 'linear-gradient(135deg, #3d0066 0%, #0f001a 100%)'}}
            />
            {/* Grid overlay for cyberpunk texture */}
            <div
              className="absolute inset-0 opacity-20"
              style={{backgroundImage: 'radial-gradient(circle, rgba(232,121,249,0.4) 1px, transparent 1px)', backgroundSize: '16px 16px'}}
            />
            {/* FEATURED badge */}
            <span className="absolute top-2 left-2 font-mono text-[8px] font-bold tracking-widest text-[rgba(0,212,255,0.9)] bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5 rounded border border-[rgba(0,212,255,0.3)]">
              FEATURED
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <SourceBadge source={featured.source} />
          </div>
          <p className="font-mono text-[11px] text-white/80 leading-snug mb-1">{featured.headline}</p>
          <span className="font-mono text-[10px] text-white/25">{featured.time}</span>
        </div>

        {/* RIGHT: 4 headlines (62%) */}
        <div className="flex-1 divide-y divide-white/[0.04]">
          {headlines.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors cursor-default"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <SourceBadge source={item.source} />
                  <span className="font-mono text-[9px] text-white/20 tabular-nums">{item.time}</span>
                </div>
                <p className="font-mono text-[11px] text-white/65 leading-snug group-hover:text-[#e879f9] transition-colors">
                  {item.headline}
                </p>
              </div>
              <span className="font-mono text-[10px] text-white/15 shrink-0 mt-1">›</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
