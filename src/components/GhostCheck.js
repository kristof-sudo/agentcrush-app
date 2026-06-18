'use client'

import { useState } from 'react'

const LIVENESS = {
  alive:   { label: '● ALIVE',   color: '#39ff14', bg: 'rgba(57,255,20,0.1)' },
  dormant: { label: '◐ DORMANT', color: '#f0a500', bg: 'rgba(240,165,0,0.1)' },
  ghost:   { label: '👻 GHOST',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  unknown: { label: '· UNKNOWN', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}
const TRUST = {
  trusted:    { label: 'TRUSTED',    color: '#39ff14' },
  unverified: { label: 'UNVERIFIED', color: '#94a3b8' },
  caution:    { label: 'CAUTION',    color: '#f0a500' },
  ghost:      { label: 'INACTIVE',   color: '#94a3b8' },
}

function fmtStars(n) {
  if (n == null) return null
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}
function ago(days) {
  if (days == null) return 'unknown'
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 60) return `${days}d ago`
  return `${Math.round(days / 30)}mo ago`
}
function rankLabel(res) {
  if (res.rank) return `#${res.rank}`
  if (res.tier === 'evidence_ranked') return 'Ranked'
  if (res.tier === 'indexed') return 'Indexed'
  return '—'
}

export default function GhostCheck({ alivePct, totalAgents }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState('idle')
  const [res, setRes] = useState(null)

  async function run(e) {
    e?.preventDefault()
    const input = q.trim()
    if (!input) return
    setState('loading'); setRes(null)
    try {
      const r = await fetch(`/api/ghost-check?q=${encodeURIComponent(input)}`)
      setRes(await r.json()); setState('done')
    } catch { setState('error') }
  }

  const L = res?.found ? (LIVENESS[res.liveness] || LIVENESS.unknown) : null
  const T = res?.found ? (TRUST[res.trust] || TRUST.unverified) : null
  const stars = res?.found ? fmtStars(res.stars) : null

  return (
    <div className="rounded-xl border border-[rgba(233,30,128,0.22)] bg-gradient-to-br from-[rgba(233,30,128,0.06)] to-transparent px-4 py-5 md:px-6">
      <div className="mb-1 font-mono text-[15px] md:text-base font-bold text-white">
        Most AI agents are ghosts. <span className="text-[#e91e80]">Check any one.</span>
      </div>
      <p className="mb-4 font-mono text-[11px] text-white/40">
        Paste an agent — handle, GitHub, X, or site. Find out in 1 second if it&apos;s alive and worth trusting.
        {alivePct != null && totalAgents != null && (
          <> {' '}<span className="text-white/55">{Number(totalAgents).toLocaleString()} indexed · {alivePct}% show signs of life.</span></>
        )}
      </p>

      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="crewai · github.com/… · @handle · site.com"
          className="flex-1 rounded-lg border border-white/[0.12] bg-black/30 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e91e80]/50"
          autoCapitalize="off" autoCorrect="off" spellCheck="false"
        />
        <button type="submit" disabled={state === 'loading' || !q.trim()}
          className="rounded-lg bg-[#e91e80] px-5 py-2.5 font-mono text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40">
          {state === 'loading' ? 'Checking…' : 'Check it →'}
        </button>
      </form>

      {state === 'error' && <p className="mt-3 font-mono text-xs text-red-400/80">Something went wrong. Try again.</p>}

      {state === 'done' && res && !res.found && (
        <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <div className="font-mono text-sm text-white/70">Not in the AgentCrush index yet.</div>
          <div className="font-mono text-[11px] text-white/35 mt-1">
            We track {totalAgents != null ? Number(totalAgents).toLocaleString() : 'thousands of'} agents — this one isn&apos;t one of them.{' '}
            <a href="/submit" className="text-[#e91e80]/80 underline">Submit it →</a>
          </div>
        </div>
      )}

      {state === 'done' && res && res.found && (
        <div className="mt-4 rounded-xl border border-white/[0.1] bg-black/20 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="min-w-0">
              <div className="font-mono text-sm font-bold text-white truncate">{res.display_name || res.handle}</div>
              <div className="font-mono text-[11px] text-white/35 truncate">@{res.handle}{res.category ? ` · ${res.category.replace(/_/g, ' ')}` : ''}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded px-2 py-1 font-mono text-[11px] font-bold" style={{ color: L.color, background: L.bg }}>{L.label}</span>
              <span className="rounded px-2 py-1 font-mono text-[11px] font-bold" style={{ color: T.color, background: `${T.color}1a` }}>{T.label}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
            <Receipt label={res.liveness_source !== 'none' ? 'Last commit' : 'Last signal'} value={ago(res.days_since_active)} />
            <Receipt label="GitHub stars" value={stars ?? '—'} />
            <Receipt label="AgentCrush" value={rankLabel(res)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-white/[0.06] font-mono text-[11px]">
            <a href={res.profile_url || `/agent/${res.handle}`} className="text-[#e91e80]/90 hover:text-[#e91e80] underline">Full report →</a>
            <a href="/find" className="text-white/40 hover:text-white/70 underline">Find one that works →</a>
            {res.liveness === 'ghost' && <span className="text-white/30 ml-auto">No code activity in 90+ days.</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function Receipt({ label, value }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="font-mono text-sm font-bold text-white tabular-nums truncate">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-white/30 mt-0.5">{label}</div>
    </div>
  )
}
