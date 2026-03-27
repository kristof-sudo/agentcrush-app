'use client'
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ac_watchlist'

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function setWatchlist(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

export function useWatchlist() {
  const [list, setList] = useState([])
  useEffect(() => { setList(getWatchlist()) }, [])

  function toggle(handle) {
    const current = getWatchlist()
    const next = current.includes(handle)
      ? current.filter((h) => h !== handle)
      : [...current, handle]
    setWatchlist(next)
    setList(next)
  }

  return { list, toggle, isWatching: (handle) => list.includes(handle) }
}

export default function WatchlistButton({ handle, displayName }) {
  const { list, toggle, isWatching } = useWatchlist()
  const watching = isWatching(handle)

  // Avoid hydration mismatch — render null until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => toggle(handle)}
      title={watching ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
        watching
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          : 'border-white/[0.1] bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
      }`}
    >
      <span>{watching ? '★' : '☆'}</span>
      <span>{watching ? 'Watching' : 'Watch'}</span>
    </button>
  )
}
