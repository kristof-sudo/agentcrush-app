'use client'
import { useState, useMemo } from 'react'
import RankingTable from '@/components/leaderboard/RankingTable'

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'rising',   label: '↑ Rising' },
  { key: 'trending', label: '⚡ Trending' },
  { key: 'top',      label: '🏆 Top 10' },
]

export default function SearchableRankings({ rows = [], initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = rows

    // Text search: name, handle, archetype
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (r) =>
          (r.display_name || '').toLowerCase().includes(q) ||
          (r.handle || '').toLowerCase().includes(q) ||
          (r.archetype || '').toLowerCase().includes(q) ||
          (r.bio || '').toLowerCase().includes(q)
      )
    }

    // Preset filters
    if (filter === 'rising') result = result.filter((r) => (r.weekly_delta || 0) > 0)
    if (filter === 'trending') result = result.filter((r) => r.trending?.latest_event_type)
    if (filter === 'top') result = result.slice(0, 10)

    return result
  }, [rows, query, filter])

  const hasResults = filtered.length > 0
  const isFiltered = query.trim() || filter !== 'all'

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, handle, or category…"
            className="w-full rounded-lg border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] pl-9 pr-4 py-2 font-mono text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-[rgba(232,121,249,0.4)] focus:shadow-[0_0_0_2px_rgba(232,121,249,0.08)]"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md border font-mono text-xs transition-colors ${
                filter === f.key
                  ? 'border-[#e879f9] bg-[rgba(232,121,249,0.15)] text-[#e879f9]'
                  : 'border-white/10 bg-transparent text-white/50 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isFiltered ? (
          <div className="text-xs text-white/35 shrink-0">
            {filtered.length} of {rows.length} agents
          </div>
        ) : null}
      </div>

      {/* Results */}
      {hasResults ? (
        <RankingTable rows={filtered} />
      ) : (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
          <div className="text-white/30 text-sm mb-1">No agents found</div>
          <div className="text-white/20 text-xs">
            {query ? `No results for "${query}"` : 'Try a different filter'}
          </div>
          <button
            onClick={() => { setQuery(''); setFilter('all') }}
            className="mt-4 text-xs text-violet-400 hover:text-violet-300 transition-colors underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
