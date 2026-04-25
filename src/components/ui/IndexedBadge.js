const FONT = "var(--font-mono,'Geist Mono',monospace)"

export default function IndexedBadge({ size = 'md' }) {
  const s = size === 'sm'
    ? { font: 8, pad: '2px 7px' }
    : { font: 9, pad: '3px 9px' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: s.pad, borderRadius: 3,
      border: '1px dashed rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.02)',
      fontFamily: FONT, fontSize: s.font, fontWeight: 600,
      color: 'rgba(255,255,255,0.45)', letterSpacing: '.06em',
      textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
      Indexed · Awaiting Evidence
    </span>
  )
}
