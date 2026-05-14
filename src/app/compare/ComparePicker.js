'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function AgentSearchInput({ label, value, onSelect, otherHandle, color }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) {
      const t = setTimeout(() => {
        setQuery('')
        setResults([])
        setOpen(false)
      }, 0)
      return () => clearTimeout(t)
    }
  }, [value])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      // Clear results when query is too short (use a microtask to satisfy lint rule)
      const t0 = setTimeout(() => setResults([]), 0)
      return () => clearTimeout(t0)
    }
    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled) return
      setLoading(true)
      const { data } = await supabase
        .from('agents')
        .select('id, handle, display_name, archetype, avatar_url, tier')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
        .order('tier', { ascending: true })
        .limit(8)
      if (cancelled) return
      const filtered = (data || []).filter((a) => a.handle !== otherHandle)
      setResults(filtered)
      setLoading(false)
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, otherHandle])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <label className={`block text-[10px] font-mono uppercase tracking-widest mb-2 ${color.label}`}>
        {label}
      </label>

      {value ? (
        <div className={`flex items-center gap-3 rounded-lg border ${color.border} ${color.bg} px-3 py-2.5`}>
          {value.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.avatar_url} alt="" className="w-8 h-8 rounded-full bg-white/[0.05] shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0 text-xs text-white/40">
              {(value.display_name || value.handle)[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{value.display_name || value.handle}</div>
            <div className="text-[11px] text-white/40 truncate">@{value.handle}{value.archetype ? ` · ${value.archetype}` : ''}</div>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-white/40 hover:text-white/80 transition-colors px-2 shrink-0"
            aria-label="Change agent"
          >
            change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Type an agent name or handle…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/40 transition-colors"
          />

          {open && query.length >= 2 && (
            <div className="absolute left-0 right-0 mt-1 rounded-lg border border-white/[0.1] bg-[#0a0a14] shadow-xl z-20 max-h-64 overflow-y-auto">
              {loading && (
                <div className="px-3 py-3 text-xs text-white/35">Searching…</div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-3 py-3 text-xs text-white/35">No matches</div>
              )}
              {!loading && results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { onSelect(r); setOpen(false) }}
                  className="block w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full bg-white/[0.05] shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0 text-[10px] text-white/40">
                        {(r.display_name || r.handle)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white truncate">{r.display_name || r.handle}</span>
                        {r.tier === 'evidence_ranked' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">★</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">@{r.handle}{r.archetype ? ` · ${r.archetype}` : ''}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ComparePicker() {
  const router = useRouter()
  const [agentA, setAgentA] = useState(null)
  const [agentB, setAgentB] = useState(null)

  const canCompare = agentA && agentB

  function handleCompare() {
    if (!canCompare) return
    router.push(`/compare?a=${encodeURIComponent(agentA.handle)}&b=${encodeURIComponent(agentB.handle)}`)
  }

  function swap() {
    const a = agentA, b = agentB
    setAgentA(b)
    setAgentB(a)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:px-6 text-white">
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Compare Agents</h1>
        <p className="mt-2 text-sm text-white/45">Pick two agents to see a side-by-side score, movement, and signal breakdown.</p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <AgentSearchInput
            label="Agent A"
            value={agentA}
            onSelect={setAgentA}
            otherHandle={agentB?.handle}
            color={{
              label: 'text-emerald-400',
              border: 'border-emerald-400/30',
              bg: 'bg-emerald-400/[0.04]',
            }}
          />

          <div className="hidden md:flex flex-col items-center justify-center pb-2">
            <button
              onClick={swap}
              disabled={!agentA || !agentB}
              className="text-xs text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
              aria-label="Swap A and B"
              title="Swap"
            >
              ⇄
            </button>
          </div>

          <AgentSearchInput
            label="Agent B"
            value={agentB}
            onSelect={setAgentB}
            otherHandle={agentA?.handle}
            color={{
              label: 'text-violet-400',
              border: 'border-violet-400/30',
              bg: 'bg-violet-400/[0.04]',
            }}
          />
        </div>

        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className="mt-5 w-full rounded-lg border px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed
            border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20
            disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-white/25"
        >
          {canCompare ? 'Compare →' : 'Pick two agents'}
        </button>

        {/* Mobile swap */}
        {agentA && agentB && (
          <button
            onClick={swap}
            className="md:hidden mt-3 w-full text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            ⇄ Swap A and B
          </button>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/40">
        <span>Try popular comparisons:</span>
        <button onClick={() => router.push('/compare?a=crewai&b=langgraph')} className="text-violet-400/70 hover:text-violet-300 underline">crewai vs langgraph</button>
        <button onClick={() => router.push('/compare?a=devin&b=cursor')} className="text-violet-400/70 hover:text-violet-300 underline">devin vs cursor</button>
        <button onClick={() => router.push('/compare?a=autogpt&b=babyagi')} className="text-violet-400/70 hover:text-violet-300 underline">autogpt vs babyagi</button>
      </div>
    </main>
  )
}
