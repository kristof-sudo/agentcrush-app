'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import WatchButton from '@/components/watchlist/WatchButton'

const AVATAR_COLORS = [
  'bg-violet-500/25 text-violet-300',
  'bg-emerald-500/25 text-emerald-300',
  'bg-sky-500/25 text-sky-300',
  'bg-amber-500/25 text-amber-300',
  'bg-pink-500/25 text-pink-300',
  'bg-cyan-500/25 text-cyan-300',
  'bg-rose-500/25 text-rose-300',
]
function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function TierBadge({ tier }) {
  if (tier === 'evidence_ranked') {
    return (
      <span className="shrink-0 rounded border border-[rgba(57,255,20,0.35)] bg-[rgba(57,255,20,0.08)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: '#39ff14' }}>
        Evidence
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/30">
      Awaiting evidence
    </span>
  )
}

const CHUNK = 60

export default function ExploreSearch({ agents = [] }) {
  const [query, setQuery] = useState('')
  // Default to the evidence-ranked view: the verified list is the product;
  // the full index is one tap away.
  const [showTier, setShowTier] = useState('evidence')
  const [visibleCount, setVisibleCount] = useState(CHUNK)

  const filtered = useMemo(() => {
    let result = agents
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (a) =>
          (a.display_name || '').toLowerCase().includes(q) ||
          (a.handle || '').toLowerCase().includes(q) ||
          (a.archetype || '').toLowerCase().includes(q) ||
          (a.tagline || '').toLowerCase().includes(q)
      )
    }
    if (showTier === 'evidence') result = result.filter((a) => a.tier === 'evidence_ranked')
    if (showTier === 'indexed') result = result.filter((a) => a.tier === 'indexed')
    return result
  }, [agents, query, showTier])

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visible.length

  const setTier = (key) => { setShowTier(key); setVisibleCount(CHUNK) }
  const setSearch = (value) => { setQuery(value); setVisibleCount(CHUNK) }

  const evidenceCount = agents.filter((a) => a.tier === 'evidence_ranked').length
  const indexedCount = agents.filter((a) => a.tier === 'indexed').length

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, or category…"
            className="w-full rounded-lg border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] pl-9 pr-4 py-2 font-mono text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-[rgba(233,30,128,0.4)]"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {query && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">✕</button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { key: 'all', label: `All (${agents.length})` },
            { key: 'evidence', label: `Evidence (${evidenceCount})` },
            { key: 'indexed', label: `Awaiting evidence (${indexedCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTier(f.key)}
              className={`px-2.5 py-1.5 rounded-md border font-mono text-xs transition-colors ${
                showTier === f.key
                  ? 'border-[#e91e80] bg-[rgba(233,30,128,0.15)] text-[#e91e80]'
                  : 'border-white/10 bg-transparent text-white/50 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="font-mono text-[11px] text-white/25 mb-3">
        {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
        {query.trim() ? ` matching "${query.trim()}"` : ''}
      </p>

      {/* Agent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visible.map((agent, idx) => {
          const displayName = agent.display_name || agent.handle || '?'
          return (
            <div
              key={agent.id || agent.handle}
              className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors min-w-0"
            >
            <Link
              href={`/agent/${encodeURIComponent(agent.handle)}`}
              className="flex items-center gap-2.5 flex-1 min-w-0 no-underline"
            >
              {/* Rank / avatar */}
              <div className="shrink-0 flex flex-col items-center gap-0.5 w-8">
                {agent.tier === 'evidence_ranked' && agent.v2_rank ? (
                  <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: '#39ff14' }}>#{agent.v2_rank}</span>
                ) : (
                  <div className={`h-7 w-7 rounded border border-white/[0.07] flex items-center justify-center overflow-hidden ${agent.avatar_url ? 'bg-white/[0.04]' : avatarColor(agent.handle)}`}>
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={displayName} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-mono text-[9px] font-bold">{displayName[0].toUpperCase()}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-white/85 truncate">{displayName}</span>
                  <TierBadge tier={agent.tier} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {agent.archetype && (
                    <span className="font-mono text-[9px] text-white/30 truncate">{agent.archetype}</span>
                  )}
                  {agent.tier === 'evidence_ranked' && agent.v2_score != null && (
                    <span className="font-mono text-[9px] tabular-nums" style={{ color: '#39ff14', opacity: 0.7 }}>
                      {Number(agent.v2_score).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

            </Link>

              <WatchButton handle={agent.handle} size={14} />

              {/* External link — sibling of the card Link, never nested inside an
                  <a> (nested anchors are invalid HTML and caused a hydration
                  mismatch / React #418). */}
              {(agent.website_url || agent.github_url) && (
                <a
                  href={agent.website_url || agent.github_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="shrink-0 text-white/20 hover:text-white/55 transition-colors"
                  aria-label="External link"
                >
                  <svg width="10" height="10" viewBox="0 0 11 11" fill="none">
                    <path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>
          )
        })}
      </div>

      {remaining > 0 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setVisibleCount((c) => c + CHUNK * 4)}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 font-mono text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Show more ({remaining.toLocaleString()} left)
          </button>
          <button
            onClick={() => setVisibleCount(filtered.length)}
            className="font-mono text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
          >
            Show all
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-white/30">No agents match your search.</p>
          <div className="mt-2 flex items-center justify-center gap-4">
            {query && (
              <button onClick={() => setSearch('')} className="font-mono text-xs text-white/40 underline underline-offset-2">
                Clear search
              </button>
            )}
            {query && showTier !== 'all' && (
              <button onClick={() => setTier('all')} className="font-mono text-xs text-white/40 underline underline-offset-2">
                Search all tiers
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
