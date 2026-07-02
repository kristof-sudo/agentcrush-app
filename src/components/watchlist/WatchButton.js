'use client'

import { useEffect, useState } from 'react'
import { isWatched, toggleWatch, WATCHLIST_EVENT } from '@/lib/watchlist-client'

/**
 * Star toggle for the accountless watchlist. Renders unfilled during SSR
 * (localStorage is client-only), syncs on mount + on watchlist events.
 */
export default function WatchButton({ handle, size = 16, className = '' }) {
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    const sync = () => setWatched(isWatched(handle))
    sync()
    window.addEventListener(WATCHLIST_EVENT, sync)
    return () => window.removeEventListener(WATCHLIST_EVENT, sync)
  }, [handle])

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setWatched(toggleWatch(handle))
      }}
      aria-label={watched ? `Unwatch ${handle}` : `Watch ${handle}`}
      title={watched ? 'On your watchlist — click to remove' : 'Add to watchlist'}
      className={`shrink-0 transition-colors ${watched ? 'text-[#facc15]' : 'text-white/20 hover:text-white/55'} ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.58l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
