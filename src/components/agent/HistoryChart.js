'use client'

/**
 * HistoryChart — the CMC-style time dimension on every agent profile (K17).
 *
 * Full recorded life of the agent from agent_snapshots: rank (inverted axis,
 * lower = better) or score, with a liveness strip underneath. Data arrives
 * server-embedded from the profile page — the raw JSON time series remains a
 * paid endpoint (/api/agent/:handle/history); this renders our own data on
 * our own page. Dependency-free SVG.
 */

import { useMemo, useState } from 'react'

const RANGES = [
  { key: '30', label: '30D', days: 30 },
  { key: '90', label: '90D', days: 90 },
  { key: 'all', label: 'ALL', days: Infinity },
]

const METRICS = [
  { key: 'rank', label: 'Rank', color: '#00d4ff' },
  { key: 'score', label: 'Score', color: '#a78bfa' },
]

function fmtDate(d) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HistoryChart({ series = [], handle }) {
  const [metric, setMetric] = useState('rank')
  const [range, setRange] = useState('all')
  const [hover, setHover] = useState(null)

  const view = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? Infinity
    const rows = series.filter((p) => p[metric] != null)
    return days === Infinity ? rows : rows.slice(-days)
  }, [series, metric, range])

  if (series.length < 2) return null

  const W = 640
  const H = 180
  const PAD = { t: 10, r: 8, b: 22, l: 8 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b

  const vals = view.map((p) => p[metric])
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (lo === hi) { lo -= 1; hi += 1 }
  const inverted = metric === 'rank' // rank: lower is better → up on screen

  const x = (i) => PAD.l + (i / Math.max(view.length - 1, 1)) * iw
  const y = (v) => {
    const t = (v - lo) / (hi - lo)
    return PAD.t + (inverted ? t : 1 - t) * ih
  }

  const path = view.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[metric]).toFixed(1)}`).join(' ')
  const color = METRICS.find((m) => m.key === metric).color
  const first = view[0]
  const last = view[view.length - 1]
  const delta = metric === 'rank' ? (first[metric] - last[metric]) : (last[metric] - first[metric])
  const deltaGood = delta > 0

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / iw) * (view.length - 1))
    if (i >= 0 && i < view.length) setHover(i)
  }

  return (
    <section className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white/70">History</h2>
          <span className="font-mono text-[10px] text-white/30">
            {series.length} daily snapshots · since {fmtDate(series[0].d)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {METRICS.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] border transition-colors ${metric === m.key ? 'border-white/30 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {m.label}
            </button>
          ))}
          <span className="w-px h-4 bg-white/10 mx-1" />
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-2 py-0.5 rounded font-mono text-[10px] border transition-colors ${range === r.key ? 'border-white/30 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-lg font-bold" style={{ color }}>
          {metric === 'rank' ? `#${last.rank}` : last.score?.toLocaleString?.() ?? last.score}
        </span>
        {view.length > 1 && delta !== 0 && (
          <span className={`font-mono text-[11px] font-bold ${deltaGood ? 'text-emerald-400' : 'text-red-400'}`}>
            {deltaGood ? '▲' : '▼'} {Math.abs(delta).toLocaleString()} {metric === 'rank' ? 'places' : 'pts'} over {range === 'all' ? 'recorded life' : `${range}d`}
          </span>
        )}
        {hover != null && view[hover] && (
          <span className="ml-auto font-mono text-[11px] text-white/50">
            {fmtDate(view[hover].d)} · {metric === 'rank' ? `#${view[hover].rank}` : view[hover].score?.toLocaleString?.()} · {view[hover].alive ? '🟢 alive' : '🔴 no signal'}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        <path d={`${path} L${x(view.length - 1).toFixed(1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`} fill={color} opacity="0.07" />
        {hover != null && view[hover] && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(view[hover][metric])} r="3.5" fill={color} />
          </>
        )}
        {/* liveness strip */}
        {view.map((p, i) => (
          <rect key={i} x={x(i) - iw / view.length / 2} y={H - PAD.b + 6} width={Math.max(iw / view.length, 1.5)} height="5"
            fill={p.alive ? '#22c55e' : '#ef4444'} opacity={p.alive ? 0.55 : 0.75} />
        ))}
        <text x={PAD.l} y={H - 2} fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace">{fmtDate(view[0].d)}</text>
        <text x={W - PAD.r} y={H - 2} fontSize="9" fill="rgba(255,255,255,0.3)" fontFamily="monospace" textAnchor="end">{fmtDate(last.d)}</text>
      </svg>

      <p className="mt-2 font-mono text-[10px] text-white/30">
        ⚓ Every daily point is Merkle-anchored on Base —{' '}
        <a href={`/api/verify`} className="text-[#00d4ff]/60 hover:text-[#00d4ff] underline underline-offset-2">verify the record</a>
      </p>
    </section>
  )
}
