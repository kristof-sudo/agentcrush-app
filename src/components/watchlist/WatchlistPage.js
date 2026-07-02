'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWatchlist } from '@/components/agents/WatchlistButton'

const TIER_LABEL = {
  evidence_ranked: 'Evidence-ranked',
  indexed: 'Indexed',
}

const CAT_COLOR = {
  developer: '#818cf8',
  tokenized: '#39ff14',
  service: '#f0a500',
  model_family: '#a78bfa',
  mcp_server: '#f97316',
}

const CHANGE_ICON = {
  rank_up: { glyph: '▲', color: '#4ade80', label: 'Moved up' },
  rank_down: { glyph: '▼', color: '#f87171', label: 'Moved down' },
  tier_promotion: { glyph: '★', color: '#e91e80', label: 'Promoted' },
  died: { glyph: '✝', color: '#94a3b8', label: 'Went ghost' },
  resurrected: { glyph: '↻', color: '#00d4ff', label: 'Resurrected' },
  new_agent: { glyph: '+', color: '#a78bfa', label: 'Indexed' },
}

function changeDetail(row) {
  const d = row.detail || {}
  switch (row.change_type) {
    case 'rank_up': return `#${d.rank_from} → #${d.rank_to}`
    case 'rank_down': return `#${d.rank_from} → #${d.rank_to}`
    case 'tier_promotion': return 'evidence-ranked'
    case 'died': return '30+ days silent'
    case 'resurrected': return 'signal returned'
    case 'new_agent': return (row.primary_category || '').replace('_', ' ') || 'indexed'
    default: return ''
  }
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

function WatchedAgent({ agent, onUnwatch }) {
  const catColor = CAT_COLOR[agent.primary_category] || '#94a3b8'
  const tierLabel = TIER_LABEL[agent.tier] || agent.tier || 'Indexed'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 6,
        background: '#0a0a14',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `2px solid ${catColor}`,
      }}
    >
      <Link
        href={`/agent/${encodeURIComponent(agent.handle)}`}
        style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textDecoration: 'none', flex: 1 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f0f4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.display_name || agent.handle}
          </span>
          {typeof agent.alive === 'boolean' && (
            <span
              title={agent.alive ? 'Alive — activity signal within 30 days' : 'No activity signal in 30+ days'}
              style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: agent.alive ? '#22c55e' : '#ef4444', boxShadow: agent.alive ? '0 0 6px rgba(34,197,94,0.6)' : '0 0 6px rgba(239,68,68,0.6)' }}
            />
          )}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.4)' }}>
          {tierLabel}
          {agent.alive === false && <> · <span style={{ color: '#ef4444' }}>silent 30d+</span></>}
          {agent.global_rank != null && <> · #{agent.global_rank}</>}
          {agent.primary_category && (
            <> · <span style={{ color: catColor }}>{agent.primary_category.replace('_', ' ')}</span></>
          )}
        </span>
      </Link>
      <button
        onClick={() => onUnwatch(agent.handle)}
        title="Remove from watchlist"
        style={{
          flexShrink: 0,
          padding: '3px 8px',
          borderRadius: 4,
          fontSize: 11,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(226,232,240,0.35)',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        ★ Unwatch
      </button>
    </div>
  )
}

function ChangeItem({ row }) {
  const c = CHANGE_ICON[row.change_type] || { glyph: '·', color: '#94a3b8', label: '' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ flexShrink: 0, fontSize: 13, color: c.color, width: 16, textAlign: 'center' }}>{c.glyph}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/agent/${encodeURIComponent(row.handle)}`} style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{row.display_name || row.handle}</span>
        </Link>
        {' '}
        <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.5)' }}>— {changeDetail(row)}</span>
      </div>
      <span style={{ flexShrink: 0, fontSize: 11, color: 'rgba(226,232,240,0.3)', fontFamily: 'monospace' }}>{timeAgo(row.happened_at)}</span>
    </div>
  )
}

export default function WatchlistPage() {
  const { list: watchedHandles, toggle } = useWatchlist()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || watchedHandles.length === 0) {
      setData(null)
      return
    }
    setLoading(true)
    fetch(`/api/watchlist/v1?handles=${watchedHandles.join(',')}&days=7`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [mounted, watchedHandles.join(',')])

  const allChanges = data
    ? Object.values(data.changes || {}).flat().sort((a, b) => new Date(b.happened_at) - new Date(a.happened_at))
    : []

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 12, color: 'rgba(226,232,240,0.35)', textDecoration: 'none', fontFamily: 'monospace' }}>
            ← agentcrush.xyz
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f4ff', margin: '10px 0 4px' }}>
            Your Watchlist
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(226,232,240,0.45)', margin: 0 }}>
            Track AI agents you depend on. No account needed — saved in your browser.
          </p>
        </div>

        {/* Empty state */}
        {watchedHandles.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, background: '#0a0a14' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>☆</div>
            <p style={{ fontSize: 14, color: 'rgba(226,232,240,0.55)', marginBottom: 16 }}>
              Nothing here yet. Watch any agent to see it here.
            </p>
            <Link
              href="/explore"
              style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)', textDecoration: 'none' }}
            >
              Browse agents →
            </Link>
          </div>
        )}

        {/* Watched agents */}
        {watchedHandles.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(226,232,240,0.4)', marginBottom: 12 }}>
              Watching ({watchedHandles.length})
            </h2>

            {loading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'rgba(226,232,240,0.3)', fontSize: 13 }}>Loading…</div>
            )}

            {!loading && data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(data.agents || []).map((agent) => (
                  <WatchedAgent key={agent.handle} agent={agent} onUnwatch={toggle} />
                ))}
                {/* handles we're watching but not yet in the index */}
                {watchedHandles
                  .filter((h) => !(data.agents || []).find((a) => a.handle === h))
                  .map((h) => (
                    <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 6, background: '#0a0a14', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.35)', fontFamily: 'monospace' }}>@{h}</span>
                      <button onClick={() => toggle(h)} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.3)', cursor: 'pointer', fontFamily: 'monospace' }}>
                        ✕ Remove
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {!loading && !data && watchedHandles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {watchedHandles.map((h) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 6, background: '#0a0a14', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.5)', fontFamily: 'monospace' }}>@{h}</span>
                    <button onClick={() => toggle(h)} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.3)', cursor: 'pointer', fontFamily: 'monospace' }}>
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* What changed */}
        {allChanges.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(226,232,240,0.4)', marginBottom: 12 }}>
              What changed (last 7 days)
            </h2>
            <div style={{ background: '#0a0a14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 12px' }}>
              {allChanges.map((row, i) => (
                <ChangeItem key={`${row.handle}-${row.change_type}-${row.happened_at}-${i}`} row={row} />
              ))}
            </div>
          </section>
        )}

        {watchedHandles.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            {allChanges.length === 0 && !loading && (
              <p style={{ fontSize: 13, color: 'rgba(226,232,240,0.35)', textAlign: 'center', padding: '12px 0' }}>
                No changes in the last 7 days for your watched agents.
              </p>
            )}
          </section>
        )}

        {/* Personalized feeds */}
        {watchedHandles.length > 0 && (
          <section style={{ padding: '16px', background: '#0a0a14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, marginBottom: 24 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(226,232,240,0.4)', marginBottom: 12 }}>
              Subscribe — no account needed
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(226,232,240,0.4)', marginBottom: 12 }}>
              Your watchlist is a URL. Save these links in any RSS reader or agent to get alerts.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', marginBottom: 4 }}>RSS / Atom feed</div>
                <a
                  href={`/api/watchlist/feed.xml?handles=${watchedHandles.join(',')}`}
                  style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  /api/watchlist/feed.xml?handles={watchedHandles.join(',')}
                </a>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.35)', marginBottom: 4 }}>JSON API (CORS-open, agent-pollable)</div>
                <a
                  href={`/api/watchlist/v1?handles=${watchedHandles.join(',')}`}
                  style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  /api/watchlist/v1?handles={watchedHandles.join(',')}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* How to watch */}
        <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(226,232,240,0.3)', lineHeight: 1.6 }}>
            Hit <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>☆ Watch</span> on any{' '}
            <Link href="/explore" style={{ color: '#818cf8', textDecoration: 'none' }}>agent page</Link>{' '}
            or{' '}
            <Link href="/rankings" style={{ color: '#818cf8', textDecoration: 'none' }}>ranking</Link>{' '}
            to track it here. Changes update daily. Data stays in your browser — no sync, no account.
          </p>
        </section>

      </div>
    </div>
  )
}
