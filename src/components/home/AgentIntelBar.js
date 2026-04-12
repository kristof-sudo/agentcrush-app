'use client'

const MOCK_INTEL = [
  {
    id: 1,
    source: 'VentureBeat',
    headline: 'Autonomous agents are taking over enterprise workflows faster than predicted',
    url: null,
    published_at: null,
    time: '4h ago',
    is_featured: true,
  },
  {
    id: 2,
    source: 'TechCrunch',
    headline: 'New wave of agentic startups raises $2.4B in Q1 2026',
    url: null,
    published_at: null,
    time: '6h ago',
  },
  {
    id: 3,
    source: 'The Rundown',
    headline: "OpenAI's agent runtime sees 10x usage spike in 30 days",
    url: null,
    published_at: null,
    time: '9h ago',
  },
  {
    id: 4,
    source: 'AI News',
    headline: 'Agent-to-agent communication protocols emerge as new battleground',
    url: null,
    published_at: null,
    time: '12h ago',
  },
  {
    id: 5,
    source: 'Import AI',
    headline: 'Financial regulators begin monitoring autonomous trading agents',
    url: null,
    published_at: null,
    time: '1d ago',
  },
]

const SOURCE_COLORS = {
  VentureBeat:   { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' },
  HuggingFace:   { bg: 'rgba(250,204,21,0.12)',  text: '#facc15' },
  'The Rundown': { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa' },
  'AI News':     { bg: 'rgba(45,212,191,0.12)',  text: '#2dd4bf' },
  'Import AI':   { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c' },
  TechCrunch:    { bg: 'rgba(255,80,80,0.12)',   text: '#ff5050' },
  'The Information': { bg: 'rgba(0,212,255,0.14)', text: '#00d4ff' },
  Wired:         { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  Reuters:       { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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

// items: real news_items rows from Supabase, or [] to use mock data
// featured: single featured news_items row, or null
// items: non-featured news_items rows, or []
// updatedAt: ISO string of most recent item's created_at, or null
export default function AgentIntelBar({ featured = null, items = [], updatedAt = null }) {
  const useReal = featured !== null || items.length > 0

  const featuredItem = featured || (useReal ? null : MOCK_INTEL[0])
  const headlines = useReal ? items.slice(0, 4) : MOCK_INTEL.slice(1, 5)

  const updatedLabel = updatedAt ? timeAgo(updatedAt) : useReal ? 'just now' : '4h ago'

  return (
    <div className="relative rounded-lg border border-[rgba(0,212,255,0.12)] bg-[#0a0a14] overflow-hidden mb-3">
      <CornerAccent />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,212,255,0.08)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[rgba(0,212,255,0.7)]">⚡</span>
          <span className="font-mono text-xs font-bold text-white tracking-wide">AGENT INTEL</span>
          {useReal && (
            <span className="font-mono text-[9px] text-[rgba(0,212,255,0.5)] ml-1">· live</span>
          )}
        </div>
        <span className="font-mono text-[10px] text-white/25">Updated {updatedLabel}</span>
      </div>

      {/* Body: two columns */}
      <div className="flex flex-col sm:flex-row gap-0">

        {/* LEFT: Featured article (38%) */}
        {(() => {
          const item = featuredItem
          if (!item) return null
          const featuredInner = (
            <>
              <div className="relative rounded overflow-hidden mb-2" style={{ height: 120 }}>
                <div
                  className="absolute inset-0"
                  style={
                    item.image_url
                      ? { backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #3d0066 0%, #0f001a 100%)' }
                  }
                />
                {!item.image_url && (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(232,121,249,0.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                  />
                )}
                <span className="absolute top-2 left-2 font-mono text-[8px] font-bold tracking-widest text-[rgba(0,212,255,0.9)] bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5 rounded border border-[rgba(0,212,255,0.3)]">
                  FEATURED
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <SourceBadge source={item.source} />
              </div>
              <p className="font-mono text-[11px] text-white/80 leading-snug mb-1">{item.headline}</p>
              <span className="font-mono text-[10px] text-white/25">
                {item.published_at ? timeAgo(item.published_at) : item.time || ''}
              </span>
            </>
          )
          return item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:w-[38%] p-2 border-b sm:border-b-0 sm:border-r border-white/[0.05] hover:bg-white/[0.02] transition-colors"
              style={{ display: 'block', cursor: 'pointer', textDecoration: 'none' }}
            >
              {featuredInner}
            </a>
          ) : (
            <div className="sm:w-[38%] p-2 border-b sm:border-b-0 sm:border-r border-white/[0.05]">
              {featuredInner}
            </div>
          )
        })()}

        {/* RIGHT: 4 headlines (62%) */}
        <div className="flex-1 divide-y divide-white/[0.04]">
          {headlines.map((item) => {
            const displayTime = item.published_at ? timeAgo(item.published_at) : item.time || ''
            return (
              <div
                key={item.id}
                className="group flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
                style={{ cursor: item.url ? 'pointer' : 'default' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SourceBadge source={item.source} />
                    <span className="font-mono text-[9px] text-white/20 tabular-nums">{displayTime}</span>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-white/65 leading-snug hover:text-[#e879f9] hover:underline transition-colors"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {item.headline}
                    </a>
                  ) : (
                    <p className="font-mono text-[11px] text-white/65 leading-snug">{item.headline}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] text-white/15 shrink-0 mt-1">›</span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
