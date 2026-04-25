const FONT = "var(--font-mono,'Geist Mono',monospace)"

const SIZES = {
  sm: { font: 8,  pad: '2px 7px',  icon: 8,  gap: 4, radius: 999 },
  md: { font: 9,  pad: '3px 9px',  icon: 10, gap: 5, radius: 999 },
  lg: { font: 11, pad: '5px 12px', icon: 12, gap: 6, radius: 999 },
}

export default function EvidenceBadge({ size = 'md', muted = false }) {
  const s = SIZES[size] ?? SIZES.md
  const col    = muted ? 'rgba(255,255,255,0.5)'  : '#00d4ff'
  const bg     = muted ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.1)'
  const border = muted ? 'rgba(255,255,255,0.1)'  : 'rgba(0,212,255,0.35)'
  const glow   = muted ? 'none'                   : '0 0 10px rgba(0,212,255,0.25)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.pad, borderRadius: s.radius,
      border: `1px solid ${border}`, background: bg,
      fontFamily: FONT, fontSize: s.font, fontWeight: 700,
      color: col, letterSpacing: '.08em', textTransform: 'uppercase',
      boxShadow: glow, whiteSpace: 'nowrap', lineHeight: 1,
    }}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4.2" stroke={col} strokeWidth="0.8" fill={muted ? 'transparent' : 'rgba(0,212,255,0.15)'} />
        <path d="M3 5.2L4.4 6.5L7.2 3.6" stroke={col} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Evidence Ranked
    </span>
  )
}
