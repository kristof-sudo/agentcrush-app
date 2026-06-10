/**
 * The AgentCrush index family — one consistent strip shown on each index page.
 *
 * Three instruments, one system:
 *   Ghost Index   — health   (who's alive)
 *   Economy Index — scale    (how big the agent economy is)
 *   Proof of Index — integrity (verify the data on-chain)
 *
 * Pass `current` to highlight the page the visitor is on.
 */

import Link from 'next/link'

const FAMILY = [
  { key: 'ghost',   label: 'Ghost Index',         note: 'who’s alive',          href: '/ghost-index',                    color: '#f97316' },
  { key: 'economy', label: 'Agent Economy Index', note: 'how big it is',             href: '/agent-economy-index',            color: '#00d4ff' },
  { key: 'proof',   label: 'Proof of Index',      note: 'verify the data on-chain',  href: '/methodology#proof-of-index',     color: '#39ff14' },
]

export default function IndexFamilyStrip({ current }) {
  return (
    <div className="mb-8">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2">
        The AgentCrush indexes
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FAMILY.map((f) => {
          const active = f.key === current
          return (
            <Link
              key={f.key}
              href={f.href}
              aria-current={active ? 'page' : undefined}
              className="rounded-lg border px-3 py-2.5 transition-all hover:brightness-125"
              style={{
                borderColor: active ? `${f.color}66` : 'rgba(255,255,255,0.07)',
                background: active ? `${f.color}0d` : 'rgba(255,255,255,0.015)',
              }}
            >
              <span className="block font-mono text-xs font-bold" style={{ color: active ? f.color : 'rgba(255,255,255,0.65)' }}>
                {f.label}{active && <span className="ml-2 text-[9px] font-normal text-white/30">you are here</span>}
              </span>
              <span className="block font-mono text-[10px] text-white/35 mt-0.5">{f.note}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
