'use client'

import { useState } from 'react'
import WatchlistButton from '@/components/agents/WatchlistButton'

const CAT_COLORS = {
  ECOSYSTEM:  { bg: 'rgba(0,229,255,0.12)',    text: '#00e5ff', glow: '#00e5ff' },
  TRADER:     { bg: 'rgba(255,64,200,0.12)',   text: '#ff40c8', glow: '#ff40c8' },
  RESEARCHER: { bg: 'rgba(147,51,234,0.18)',   text: '#c084fc', glow: '#c084fc' },
  REBEL:      { bg: 'rgba(255,100,50,0.12)',   text: '#ff6432', glow: '#ff6432' },
  OPERATOR:   { bg: 'rgba(250,204,21,0.12)',   text: '#facc15', glow: '#facc15' },
  BUILDER:    { bg: 'rgba(52,211,153,0.12)',   text: '#34d399', glow: '#34d399' },
  FRAMEWORK:  { bg: 'rgba(99,102,241,0.14)',   text: '#818cf8', glow: '#818cf8' },
  AGENT:      { bg: 'rgba(0,229,255,0.09)',    text: '#67e8f9', glow: '#67e8f9' },
  CREATOR:    { bg: 'rgba(233,30,128,0.12)',  text: '#e91e80', glow: '#e91e80' },
  FINANCE:    { bg: 'rgba(250,204,21,0.12)',   text: '#facc15', glow: '#facc15' },
  CRYPTO:     { bg: 'rgba(52,211,153,0.12)',   text: '#34d399', glow: '#34d399' },
  DEVELOPER:  { bg: 'rgba(129,140,248,0.14)',  text: '#818cf8', glow: '#818cf8' },
  INFRA:      { bg: 'rgba(248,113,113,0.12)',  text: '#f87171', glow: '#f87171' },
  SOCIALITE:  { bg: 'rgba(244,114,182,0.12)',  text: '#f472b6', glow: '#f472b6' },
  CORPORATE:  { bg: 'rgba(148,163,184,0.12)',  text: '#94a3b8', glow: '#94a3b8' },
  EXPLORER:   { bg: 'rgba(45,212,191,0.12)',   text: '#2dd4bf', glow: '#2dd4bf' },
  MYSTIC:     { bg: 'rgba(129,140,248,0.14)',  text: '#818cf8', glow: '#818cf8' },
  FITNESS:    { bg: 'rgba(34,211,238,0.12)',   text: '#22d3ee', glow: '#22d3ee' },
}

function CornerAccents({ color }) {
  const s = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none', opacity: 0.7 }
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, top: 0, right: 0, borderTop: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottom: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}` }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}` }} />
    </>
  )
}

function CategoryPill({ label }) {
  const c = CAT_COLORS[label?.toUpperCase()] || { bg: 'rgba(255,255,255,0.08)', text: '#aaa', glow: '#aaa' }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: c.bg, color: c.text, boxShadow: `0 0 8px ${c.glow}44` }}>
      {label}
    </span>
  )
}

// props: displayName, handle, imageUrl, tagline, archetype, delta7d,
//        trustState, claimHandle, externalUrl, tags
export default function AgentHeader({ displayName, handle, imageUrl, tagline, archetype, delta7d, trustState, claimHandle, externalUrl, tags }) {
  // watched state kept for non-JS fallback rendering; real persistence via WatchlistButton
  const [_watched, _setWatched] = useState(false)
  const catKey = archetype?.toUpperCase() || 'AGENT'
  const catColor = CAT_COLORS[catKey] || { bg: 'rgba(0,229,255,0.09)', text: '#67e8f9', glow: '#67e8f9' }
  const isUnclaimed = trustState === 'unclaimed'
  const delta = Number(delta7d || 0)

  return (
    <div style={{ position: 'relative', borderRadius: 2, padding: 12, background: '#0a0a14', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8, borderLeft: `2px solid ${catColor.glow}` }}>
      <CornerAccents color={catColor.glow} />

      {/* Top row: avatar + name + action buttons */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, background: catColor.bg, border: `2px solid ${catColor.glow}`, boxShadow: `0 0 14px ${catColor.glow}66, inset 0 0 10px ${catColor.glow}22`, color: catColor.text, overflow: 'hidden' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={displayName} style={{ width: 56, height: 56, objectFit: 'cover' }} />
            ) : (
              (displayName || handle || '?')[0].toUpperCase()
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f4ff', textShadow: `0 0 12px ${catColor.glow}66` }}>
                {displayName}
              </span>
              {delta !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: delta > 0 ? 'rgba(74,222,128,0.13)' : 'rgba(248,113,113,0.13)', color: delta > 0 ? '#4ade80' : '#f87171', boxShadow: delta > 0 ? '0 0 8px rgba(74,222,128,0.4)' : '0 0 8px rgba(248,113,113,0.4)' }}>
                  {delta > 0 ? `+${delta}` : delta} this week
                </span>
              )}
              {isUnclaimed && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  Unclaimed
                </span>
              )}
              {trustState === 'verified' && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, marginTop: 2, color: 'rgba(226,232,240,0.4)' }}>@{handle}</div>
          </div>
        </div>

        {/* Right action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {isUnclaimed ? (
            <a
              href={`/claim/${encodeURIComponent(claimHandle)}`}
              style={{ padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', background: 'linear-gradient(90deg, #d600a8, #ff40c8)', color: '#fff', boxShadow: '0 0 16px rgba(214,0,168,0.5)', textDecoration: 'none', display: 'inline-block', fontFamily: 'monospace' }}
            >
              Claim this profile →
            </a>
          ) : externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              style={{ padding: '6px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', background: 'rgba(99,102,241,0.15)', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)', textDecoration: 'none', display: 'inline-block', fontFamily: 'monospace' }}
            >
              Try this agent ↗
            </a>
          ) : null}
          <div style={{ display: 'flex', gap: 6 }}>
            <WatchlistButton handle={handle} displayName={displayName} />
            <a
              href={`https://x.com/${handle}`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(226,232,240,0.5)', textDecoration: 'none', fontFamily: 'monospace' }}
            >
              X →
            </a>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(226,232,240,0.55)', margin: 0 }}>{tagline}</p>

      {/* Category pills + tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {archetype && <CategoryPill label={archetype} />}
        {(tags || []).map((t) => (
          <span key={t} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
