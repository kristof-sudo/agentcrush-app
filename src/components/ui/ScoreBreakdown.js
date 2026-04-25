const FONT = "var(--font-mono,'Geist Mono',monospace)"

export const DIMS = [
  { key: 'gh',  label: 'GitHub',    short: 'GH',  col: '#00d4ff' },
  { key: 'pkg', label: 'Packages',  short: 'PKG', col: '#a78bfa' },
  { key: 'dep', label: 'Deps',      short: 'DEP', col: '#e91e80' },
  { key: 'doc', label: 'Docs',      short: 'DOC', col: '#39ff14' },
  { key: 'dis', label: 'Discourse', short: 'DIS', col: '#fbbf24' },
  { key: 'eco', label: 'Ecosystem', short: 'ECO', col: '#fb7185' },
]

// scores: { gh, pkg, dep, doc, dis, eco } — values 0-100, null = no data (shows empty track)
export default function ScoreBreakdown({ scores = {}, compact = false, showThreshold = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      gap: compact ? 10 : 5,
      flexWrap: 'wrap',
    }}>
      {DIMS.map((d) => {
        const val = scores[d.key] ?? null
        const pct = val != null ? Math.min(100, Math.max(0, val)) : 0
        return (
          <div key={d.key} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            flex: compact ? '1 1 30%' : '1 1 auto',
            minWidth: compact ? 90 : 'auto',
          }}>
            <span style={{
              fontFamily: FONT, fontSize: 8, color: 'rgba(255,255,255,0.3)',
              width: 24, letterSpacing: '.05em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              {d.short}
            </span>
            <div style={{ flex: 1, height: 3, borderRadius: 9, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
              {val != null && (
                <div style={{
                  height: 3, borderRadius: 9, background: d.col,
                  width: `${pct}%`,
                  boxShadow: `0 0 6px ${d.col}66`,
                }} />
              )}
              {showThreshold && (
                <div style={{
                  position: 'absolute', left: '70%', top: -2,
                  width: 1, height: 7, background: 'rgba(255,255,255,0.4)',
                }} />
              )}
            </div>
            <span style={{
              fontFamily: FONT, fontSize: 9, color: 'rgba(255,255,255,0.5)',
              width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>
              {val ?? '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
