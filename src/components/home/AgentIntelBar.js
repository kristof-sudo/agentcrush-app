'use client'

const SOURCE_COLORS = {
  VentureBeat:       { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' },
  HuggingFace:       { bg: 'rgba(250,204,21,0.12)',  text: '#facc15' },
  'The Rundown':     { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa' },
  'AI News':         { bg: 'rgba(45,212,191,0.12)',  text: '#2dd4bf' },
  'Import AI':       { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c' },
  TechCrunch:        { bg: 'rgba(255,80,80,0.12)',   text: '#ff5050' },
  'The Information': { bg: 'rgba(0,212,255,0.14)',   text: '#00d4ff' },
  Wired:             { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  Reuters:           { bg: 'rgba(232,121,249,0.15)', text: '#e879f9' },
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

// items: news_items rows from Supabase (already filtered + deduped upstream)
// updatedAt: ISO string of most recent item's created_at, or null
export default function AgentIntelBar({ items = [], updatedAt = null }) {
  const hasItems = items.length > 0
  const updatedLabel = updatedAt ? timeAgo(updatedAt) : hasItems ? 'just now' : ''

  if (!hasItems) return null

  return (
    <div className="relative rounded-lg border border-[rgba(0,212,255,0.12)] bg-[#0a0a14] overflow-hidden mb-3">
      <CornerAccent />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(0,212,255,0.08)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[rgba(0,212,255,0.7)]">⚡</span>
          <span className="font-mono text-xs font-bold text-white tracking-wide">AGENT INTEL</span>
          <span className="font-mono text-[9px] text-[rgba(0,212,255,0.5)] ml-1">· live</span>
        </div>
        {updatedLabel && (
          <span className="font-mono text-[10px] text-white/25">Updated {updatedLabel}</span>
        )}
      </div>

      {/* Single-column news list */}
      <div className="divide-y divide-white/[0.04]">
        {items.slice(0, 5).map((item) => {
          const displayTime = item.published_at ? timeAgo(item.published_at) : ''
          const inner = (
            <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <SourceBadge source={item.source} />
                  {displayTime && (
                    <span className="font-mono text-[9px] text-white/20 tabular-nums">{displayTime}</span>
                  )}
                </div>
                <p className="font-mono text-[11px] text-white/65 leading-snug">{item.headline}</p>
              </div>
              <span className="font-mono text-[10px] text-white/15 shrink-0 mt-1">›</span>
            </div>
          )

          return item.url ? (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block hover:text-[#e879f9] transition-colors" style={{ textDecoration: 'none' }}>
              {inner}
            </a>
          ) : (
            <div key={item.id}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
