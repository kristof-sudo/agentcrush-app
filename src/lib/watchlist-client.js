'use client'

/**
 * Client-side watchlist store — Phase 1 is accountless by design.
 * The list lives in localStorage; the personalized feed URL IS the
 * subscription (no auth, no server state). Cross-component sync via a
 * custom window event.
 */

const KEY = 'agentcrush:watchlist'
export const WATCHLIST_EVENT = 'agentcrush:watchlist-changed'
export const WATCHLIST_MAX = 50

export function getWatchlist() {
  if (typeof window === 'undefined') return []
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((h) => typeof h === 'string') : []
  } catch {
    return []
  }
}

function save(list) {
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, WATCHLIST_MAX)))
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT))
}

export function isWatched(handle) {
  return getWatchlist().includes(handle)
}

export function toggleWatch(handle) {
  const list = getWatchlist()
  const next = list.includes(handle) ? list.filter((h) => h !== handle) : [...list, handle]
  save(next)
  return next.includes(handle)
}

export function feedUrls(handles) {
  const q = handles.map(encodeURIComponent).join(',')
  return {
    json: `https://agentcrush.xyz/api/watchlist/v1?handles=${q}`,
    rss: `https://agentcrush.xyz/watchlist.xml?handles=${q}`,
  }
}
