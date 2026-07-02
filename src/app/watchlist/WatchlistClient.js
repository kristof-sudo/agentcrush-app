'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getWatchlist, feedUrls, WATCHLIST_EVENT } from '@/lib/watchlist-client'
import WatchButton from '@/components/watchlist/WatchButton'

const CHANGE_LABEL = {
  rank_up: { text: '▲ rank up', color: '#22c55e' },
  rank_down: { text: '▼ rank down', color: '#ef4444' },
  tier_promotion: { text: '★ promoted', color: '#39ff14' },
  died: { text: '✝ went ghost', color: '#f97316' },
  resurrected: { text: '↻ resurrected', color: '#00d4ff' },
  new_agent: { text: '+ indexed', color: '#a78bfa' },
}

function timeAgo(iso) {
  if (!iso) return 'no signal recorded'
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export default function WatchlistClient() {
  const [handles, setHandles] = useState(null) // null = not yet hydrated
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const sync = () => setHandles(getWatchlist())
    sync()
    window.addEventListener(WATCHLIST_EVENT, sync)
    return () => window.removeEventListener(WATCHLIST_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!handles || handles.length === 0) {
      setData(null)
      return
    }
    let cancelled = false
    fetch(`/api/watchlist/v1?handles=${handles.map(encodeURIComponent).join(',')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [handles])

  const copy = (label, text) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  const feeds = handles && handles.length ? feedUrls(handles) : null
  const agentsByHandle = Object.fromEntries((data?.agents || []).map((a) => [a.handle, a]))

  return (
    <main className="mx-auto max-w-[720px] px-4 md:px-6 py-14">
      <p className="text-xs font-mono text-white/25 mb-6">
        <Link href="/" className="hover:text-white/50 transition-colors">AgentCrush</Link>
        <span className="mx-2 text-white/15">/</span>
        Watchlist
      </p>

      <p className="text-xs font-semibold uppercase tracking-widest text-[#facc15]/80 mb-2">Watchlist</p>
      <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight mb-2">
        The agents you depend on
      </h1>
      <p className="text-sm text-white/45 mb-8 max-w-[58ch]">
        Your agent stack is a position. Watch it: get alerted when something you rely on goes dark,
        resurrects, or moves in the rankings. No account — your list stays in this browser and the
        feed URL is the subscription.
      </p>

      {/* Empty state */}
      {handles && handles.length === 0 && (
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-8 text-center">
          <p className="text-sm text-white/55 mb-3">Nothing watched yet.</p>
          <p className="text-xs text-white/35 mb-5 max-w-[44ch] mx-auto">
            Tap the ☆ on any agent card to start your list — then come back here for status and alerts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/explore" className="rounded-lg border border-[#facc15]/40 bg-[#facc15]/10 px-4 py-2 font-mono text-xs font-bold text-[#facc15] hover:bg-[#facc15]/20 transition-colors">
              Browse the index →
            </Link>
            <Link href="/rankings" className="rounded-lg border border-white/15 px-4 py-2 font-mono text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors">
              Rankings →
            </Link>
          </div>
        </div>
      )}

      {/* Watched agents */}
      {handles && handles.length > 0 && (
        <>
          <div className="rounded-lg border border-white/[0.07] overflow-hidden mb-6">
            {handles.map((h) => {
              const a = agentsByHandle[h]
              return (
                <div key={h} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
                  <WatchButton handle={h} size={15} />
                  <Link href={`/agent/${encodeURIComponent(h)}`} className="flex-1 min-w-0 no-underline">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-white/85 truncate">{a?.name || h}</span>
                      {a && (
                        <span
                          className="shrink-0 h-2 w-2 rounded-full"
                          title={a.alive ? 'alive' : 'no signal in 30d'}
                          style={{ background: a.alive ? '#22c55e' : '#ef4444' }}
                        />
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-white/30">
                      {a
                        ? `${a.tier === 'evidence_ranked' ? 'evidence-ranked' : a.tier}${a.alive ? ' · alive' : ` · silent (last code/event signal ${timeAgo(a.last_signal_at)})`}`
                        : 'not in the index'}
                    </span>
                  </Link>
                </div>
              )
            })}
          </div>

          {/* What changed */}
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">
            Changes · last 7 days
          </h2>
          {data && data.changes_7d?.length > 0 ? (
            <div className="rounded-lg border border-white/[0.07] overflow-hidden mb-8">
              {data.changes_7d.map((c, i) => {
                const l = CHANGE_LABEL[c.change_type] || { text: c.change_type, color: '#888' }
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="font-mono text-[11px] font-bold shrink-0" style={{ color: l.color }}>{l.text}</span>
                    <Link href={`/agent/${encodeURIComponent(c.handle)}`} className="text-sm text-white/70 truncate hover:text-white transition-colors">
                      {c.display_name || c.handle}
                    </Link>
                    <span className="ml-auto font-mono text-[10px] text-white/25 shrink-0">{timeAgo(c.happened_at)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-white/35 mb-8">
              {data ? 'All quiet — no changes for your watched agents this week.' : 'Loading…'}
            </p>
          )}

          {/* Alert feeds */}
          {feeds && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">Alerts — no account needed</p>
              <p className="text-xs text-white/40 leading-relaxed mb-3">
                The URL carries your list. Add the RSS feed to any reader (or poll the JSON from an
                agent) and you&apos;ll hear about deaths, resurrections, rank moves, and promotions.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => copy('rss', feeds.rss)} className="rounded border border-white/15 px-3 py-1.5 font-mono text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors">
                  {copied === 'rss' ? '✓ copied' : 'Copy RSS feed URL'}
                </button>
                <button onClick={() => copy('json', feeds.json)} className="rounded border border-white/15 px-3 py-1.5 font-mono text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors">
                  {copied === 'json' ? '✓ copied' : 'Copy JSON API URL'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="border-t border-white/[0.06] mt-10 pt-6 flex flex-wrap gap-4 text-xs text-white/35">
        <Link href="/explore" className="hover:text-white/70 transition-colors">Explore →</Link>
        <Link href="/changes" className="hover:text-white/70 transition-colors">All changes →</Link>
        <Link href="/ghost-index" className="hover:text-white/70 transition-colors">Ghost Index →</Link>
      </div>
    </main>
  )
}
