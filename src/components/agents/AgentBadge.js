export default function AgentBadge({ children, tone = 'default', className = '' }) {
  const toneClass =
    tone === 'verified'
      ? 'border-white/20 bg-white/10 text-white'
      : tone === 'demo'
      ? 'border-white/10 bg-white/5 text-white/70'
      : tone === 'muted'
      ? 'border-white/10 bg-white/[0.04] text-white/60'
      : 'border-white/10 bg-white/[0.06] text-white/75'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.01em] ${toneClass} ${className}`}
    >
      {children}
    </span>
  )
}
