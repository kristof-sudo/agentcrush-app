const FONT = "var(--font-mono,'Geist Mono',monospace)"

// Signal chips — ordered by weight (most impactful first)
const SIGNALS = [
  { key: 'github_score',        short: 'GH',    label: 'GitHub activity',                col: '#00d4ff' },
  { key: 'package_usage_score', short: 'PKG',   label: 'Package usage',                  col: '#a78bfa' },
  { key: 'dependency_score',    short: 'DEP',   label: 'Dependency references',           col: '#e91e80' },
  { key: 'ecosystem_score',     short: 'ECO',   label: 'Ecosystem links',                 col: '#fb7185' },
  { key: 'docs_quality_score',  short: 'DOC',   label: 'Documentation quality',           col: '#39ff14' },
  { key: 'hn_score',            short: 'HN',    label: 'Discourse / community mentions',  col: '#fbbf24' },
  { key: 'trust_score',         short: 'TRUST', label: 'Verification / registry context', col: '#94a3b8' },
]

const COVERAGE_META = {
  high:     { label: 'broad coverage',   col: '#4ade80' },
  medium:   { label: 'partial coverage', col: '#fbbf24' },
  low:      { label: 'light coverage',   col: '#94a3b8' },
  very_low: { label: 'minimal signals',  col: '#475569' },
}

export default function RankEvidence({ row }) {
  const active = SIGNALS.filter(s => row[s.key] != null)
  if (active.length === 0) return null

  const meta = COVERAGE_META[row.coverage_tier] || null

  return (
    <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 4px' }}>
      {active.map(s => (
        <span
          key={s.key}
          title={`${s.label}: ${Math.round(row[s.key])}/100`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 5px', borderRadius: 3,
            background: `${s.col}14`,
            border: `1px solid ${s.col}30`,
            fontFamily: FONT, fontSize: 8, fontWeight: 700,
            color: `${s.col}bb`, letterSpacing: '.05em',
            whiteSpace: 'nowrap', lineHeight: 1.6,
          }}
        >
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.col, opacity: 0.8, flexShrink: 0 }} />
          {s.short}
        </span>
      ))}
      {meta && (
        <span style={{
          fontFamily: FONT, fontSize: 8,
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '.03em', whiteSpace: 'nowrap',
        }}>
          · {meta.label}
        </span>
      )}
    </div>
  )
}
