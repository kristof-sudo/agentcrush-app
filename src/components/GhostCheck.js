'use client'

import { useState } from 'react'

// verdict → label + color
const VERDICT_STYLE = {
  trusted:     { label: 'TRUSTED',    color: '#39ff14' },
  caution:     { label: 'CAUTION',    color: '#f0a500' },
  unverified:  { label: 'UNVERIFIED', color: '#94a3b8' },
  avoid:       { label: 'AVOID',      color: '#ef4444' },
}

export default function GhostCheck({ alivePct, totalAgents }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [res, setRes] = useState(null)

  async function run(e) {
    e?.preventDefault()
    const input = q.trim()
    if (!input) return
    setState('loading'); setRes(null)
    try {
      const r = await fetch(`/api/ghost-check?q=${encodeURIComponent(input)}`)
      const data = await r.json()
      setRes(data); setState('done')
    } catch {
      setState('error')
    }
  }

  const alive = res?.liveness === 'alive'
  const v = res?.found ? (VERDICT_STYLE[res.verdict] || VERDICT_STYLE.unverified) : null

  return (
    <div className="rounded-xl border border-[rgba(233,30,128,0.22)] bg-gradient-to-br from-[rgba(233,30,128,0.06)] to-transparent px-4 py-5 md:px-6">
      <div className="mb-1 font-mono text-[15px] md:text-base font-bold text-white">
        Most AI agents are ghosts. <span className="text-[#e91e80]">Check any one.</span>
      </div>
      <p className="mb-4 font-mono text-[11px] text-white/40">
        Paste an agent — handle, GitHub, X, or site. Find out in 1 second if it&apos;s real, trusted, or a ghost.
        {alivePct != null && totalAgents != null && (
          <> {' '}<span className="text-white/55">{Number(totalAgents).toLocaleString()} indexed · {alivePct}% show signs of life.</span></>
        )}
      </p>

      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="crewai · github.com/… · @handle · site.com"
          className="flex-1 rounded-lg border border-white/[0.12] bg-black/30 px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e91e80]/50"
          autoCapitalize="off" autoCorrect="off" spellCheck="false"
        />
        <button
          type="submit"
          disabled={state === 'loading' || !q.trim()}
          className="rounded-lg bg-[#e91e80] px-5 py-2.5 font-mono text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
        >
          {state === 'loading' ? 'Checking…' : 'Check it →'}
        </button>
      </form>

      {state === 'error' && (
        <p className="mt-3 font-mono text-xs text-red-400/80">Something went wrong. Try again.</p>
      )}

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
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="min-w-0">
              <div className="font-mono text-sm font-bold text-white truncate">{res.display_name || res.handle}</div>
              <div className="font-mono text-[11px] text-white/35 truncate">@{res.handle}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded px-2 py-1 font-mono text-[11px] font-bold"
                    style={{ color: alive ? '#39ff14' : '#94a3b8', background: alive ? 'rgba(57,255,20,0.1)' : 'rgba(148,163,184,0.12)' }}>
                {alive ? '● ALIVE' : '👻 GHOST'}
              </span>
              <span className="rounded px-2 py-1 font-mono text-[11px] font-bold" style={{ color: v.color, background: `${v.color}1a` }}>
                {v.label}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
            <Receipt label="Last signal" value={res.days_since_active != null ? `${res.days_since_active}d ago` : '—'} />
            <Receipt label="Signals" value={`${res.signals_present}/${res.signals_total}`} />
            <Receipt label="Pays via" value={res.payment_rails?.length ? res.payment_rails.join(', ') : '—'} />
          </div>
          {res.risk_flags?.length > 0 && (
            <div className="px-4 py-2 border-t border-white/[0.06] font-mono text-[11px] text-amber-300/70">
              ⚠ {res.risk_flags.map((f) => f.flag).join(' · ')}
            </div>
          )}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-white/[0.06] font-mono text-[11px]">
            <a href={res.profile_url || `/agent/${res.handle}`} className="text-[#e91e80]/90 hover:text-[#e91e80] underline">Full report →</a>
            <a href={`/find`} className="text-white/40 hover:text-white/70 underline">Find one that works →</a>
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
