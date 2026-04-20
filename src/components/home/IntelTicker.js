'use client'

const FALLBACK_ITEMS = [
  'AutoGen Studio · GitHub stars growing · 2h ago',
  'Autonolas Agents · climbed +40 to #4 this week',
  'LangGraph · released v0.2.1 · new release',
  'CrewAI · dev activity · strong momentum',
  'AgentPilot · +38 · biggest mover today',
  'OpenHands · GitHub stars growing · 3h ago',
  'AgentVerse · holds #1 for 3rd consecutive week',
]

export default function IntelTicker({ newsItems = [] }) {
  const raw = newsItems.length > 0
    ? newsItems.map(item => [item.source, item.headline].filter(Boolean).join(' · '))
    : FALLBACK_ITEMS
  const doubled = [...raw, ...raw]

  return (
    <div style={{
      borderTop: '1px solid rgba(0,212,255,0.07)',
      borderBottom: '1px solid rgba(0,212,255,0.12)',
      background: 'rgba(0,212,255,0.02)',
      padding: '7px 0',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Label */}
        <div style={{
          flexShrink: 0,
          padding: '0 16px',
          borderRight: '1px solid rgba(0,212,255,0.15)',
          marginRight: 16,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
            fontSize: 9, fontWeight: 700,
            color: 'rgba(0,212,255,0.7)',
            textTransform: 'uppercase', letterSpacing: '.1em',
          }}>
            Intel
          </span>
        </div>

        {/* Scrolling items */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'tickerScroll 35s linear infinite',
            width: 'max-content',
          }}>
            {doubled.map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'var(--font-mono,"Geist Mono",monospace)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.45)',
                  paddingRight: 48,
                }}
              >
                <span style={{ color: 'rgba(0,212,255,0.6)', marginRight: 6 }}>›</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
