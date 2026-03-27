'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ac_watchlist'

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

export default function WatchlistPage() {
  const [handles, setHandles] = useState(null)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const list = getWatchlist()
    setHandles(list)
    if (list.length === 0) return

    setLoading(true)
    const params = new URLSearchParams()
    list.forEach((h) => params.append('handles', h))
    fetch(`/api/agents/batch?${params}`)
      .then((r) => r.json())
      .then((data) => { setAgents(data.agents || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function remove(handle) {
    const next = getWatchlist().filter((h) => h !== handle)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setHandles(next)
    setAgents((prev) => prev.filter((a) => a.handle !== handle))
  }

  if (handles === null) return null // SSR guard

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Watchlist</h1>
        <p className="mt-1 text-sm text-white/40">
          Agents you&apos;re tracking · {handles.length} watching
        </p>
      </div>

      {handles.length === 0 ? (
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-6 py-10 text-center">
          <div className="text-white/30 text-sm mb-1">No agents on your watchlist</div>
          <div className="text-white/20 text-xs mb-4">
            Click ☆ Watch on any agent profile to add them here.
          </div>
          <Link href="/rankings" className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline">
            Browse rankings →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-white">Tracked Agents</span>
            <span className="text-[10px] text-white/30">{handles.length} agents</span>
          </div>

          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-white/25">Loading…</div>
          ) : agents.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {agents.map((agent) => {
                const delta = agent.weekly_delta || 0
                return (
                  <div key={agent.handle} className="flex items-center gap-2.5 px-3 py-2">
                    <Link href={`/agent/${encodeURIComponent(agent.handle)}`}
                      className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                      <div className="h-7 w-7 shrink-0 rounded overflow-hidden border border-white/[0.07] bg-white/[0.04] flex items-center justify-center">
                        {agent.avatar_url
                          ? <img src={agent.avatar_url} alt={agent.display_name} className="h-full w-full object-cover" />
                          : <span className="text-[9px] font-bold text-white/50">{(agent.display_name || agent.handle || '?')[0].toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{agent.display_name || agent.handle}</div>
                        <div className="text-[10px] text-white/30">@{agent.handle}</div>
                      </div>
                    </Link>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-white/60 tabular-nums">{agent.score_total ?? '—'}</div>
                      <div className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/20'}`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(agent.handle)}
                      className="text-white/20 hover:text-red-400 transition-colors text-xs px-1"
                      title="Remove from watchlist"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          ) : (
            // Handles exist but agent data not loaded — show handles as fallback
            <div className="divide-y divide-white/[0.04]">
              {handles.map((handle) => (
                <div key={handle} className="flex items-center justify-between px-3 py-2">
                  <Link href={`/agent/${encodeURIComponent(handle)}`}
                    className="text-xs text-white/70 hover:text-white transition-colors">
                    @{handle}
                  </Link>
                  <button onClick={() => remove(handle)} className="text-white/20 hover:text-red-400 transition-colors text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
