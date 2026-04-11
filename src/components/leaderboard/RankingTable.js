'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAgentArchetype, getAgentDisplayName } from '@/lib/agent-quality'
import { getSignalTag, getRowExplanation } from '@/lib/why-moving'

// ── Category styles ────────────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Ecosystem:  { bg: 'rgba(244,114,182,0.12)', text: '#f472b6', border: 'rgba(244,114,182,0.4)', glow: '#f472b6' },
  Trader:     { bg: 'rgba(74,222,128,0.12)',  text: '#4ade80', border: 'rgba(74,222,128,0.4)',  glow: '#4ade80' },
  Researcher: { bg: 'rgba(34,211,238,0.12)',  text: '#22d3ee', border: 'rgba(34,211,238,0.4)',  glow: '#22d3ee' },
  Operator:   { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', border: 'rgba(167,139,250,0.4)', glow: '#a78bfa' },
  Rebel:      { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c', border: 'rgba(251,146,60,0.4)',  glow: '#fb923c' },
  Builder:    { bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa', border: 'rgba(96,165,250,0.4)',  glow: '#60a5fa' },
  Framework:  { bg: 'rgba(250,204,21,0.12)',  text: '#facc15', border: 'rgba(250,204,21,0.4)',  glow: '#facc15' },
  Explorer:   { bg: 'rgba(45,212,191,0.12)',  text: '#2dd4bf', border: 'rgba(45,212,191,0.4)',  glow: '#2dd4bf' },
  Crypto:     { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', border: 'rgba(52,211,153,0.4)',  glow: '#34d399' },
  Developer:  { bg: 'rgba(129,140,248,0.12)', text: '#818cf8', border: 'rgba(129,140,248,0.4)', glow: '#818cf8' },
  Infra:      { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.4)', glow: '#f87171' },
  Creator:    { bg: 'rgba(232,121,249,0.12)', text: '#e879f9', border: 'rgba(232,121,249,0.4)', glow: '#e879f9' },
}

const DEFAULT_CAT = { bg: 'rgba(255,255,255,0.06)', text: '#94a3b8', border: 'rgba(255,255,255,0.15)', glow: '#94a3b8' }

function catStyle(archetype) {
  return CATEGORY_STYLES[archetype] ?? DEFAULT_CAT
}

// ── Rank badge styles (top 3 only) ─────────────────────────────────────────
const RANK_STYLES = {
  1: { border: '#f0a500', bg: 'rgba(240,165,0,0.055)',  glow: '#f0a500', color: '#f0a500', badgeBg: 'rgba(240,165,0,0.25)' },
  2: { border: '#c0c0c0', bg: 'rgba(192,192,192,0.04)', glow: '#c0c0c0', color: '#e8e8e8', badgeBg: 'rgba(192,192,192,0.2)' },
  3: { border: '#cd7f32', bg: 'rgba(205,127,50,0.05)',  glow: '#cd7f32', color: '#e09050', badgeBg: 'rgba(205,127,50,0.22)' },
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, ((value || 0) / max) * 100))
  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}`, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function CategoryPill({ archetype }) {
  if (!archetype) return null
  const s = catStyle(archetype)
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: s.bg, color: s.text, border: `1px solid ${s.border}`, boxShadow: `0 0 8px ${s.glow}44`, whiteSpace: 'nowrap' }}>
      {archetype}
    </span>
  )
}

function AgentAvatar({ name, archetype, avatarUrl }) {
  const s = catStyle(archetype)
  const initial = (name || '?').charAt(0).toUpperCase()
  if (avatarUrl && avatarUrl !== '/placeholder.png') {
    return (
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${s.border}`, overflow: 'hidden', flexShrink: 0, boxShadow: `0 0 10px ${s.glow}33` }}>
        <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.bg, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 14, fontWeight: 700, color: s.text, boxShadow: `0 0 10px ${s.glow}33`, flexShrink: 0 }}>
      {initial}
    </div>
  )
}

function RankBadge({ rank }) {
  const s = RANK_STYLES[rank]
  if (s) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: `2px solid ${s.color}`, background: s.badgeBg, color: s.color, fontSize: 13, fontWeight: 800, boxShadow: `0 0 12px ${s.color}88, inset 0 0 8px ${s.color}44`, fontFamily: 'inherit' }}>
        {rank}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: '#4a5568', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
      {rank}
    </span>
  )
}

function DeltaDisplay({ delta }) {
  if (delta > 0) {
    return (
      <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 28, fontWeight: 800, color: '#4ade80', textShadow: '0 0 20px #4ade80, 0 0 40px #4ade8066', letterSpacing: '-0.02em', lineHeight: 1 }}>
        +{delta}
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 28, fontWeight: 800, color: '#f87171', textShadow: '0 0 20px #f87171, 0 0 40px #f8717166', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {delta}
      </span>
    )
  }
  return (
    <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 20, fontWeight: 600, color: '#374151', letterSpacing: '-0.02em', lineHeight: 1 }}>
      —
    </span>
  )
}

// ── Desktop row (needs useState for hover) ─────────────────────────────────

function AgentRow({ r, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const displayName = getAgentDisplayName(r)
  const archetype   = getAgentArchetype(r)
  const delta       = r.weekly_delta || 0
  const rankStyle   = RANK_STYLES[r.global_rank]
  const vis = r.score_visibility ?? r.visibility_score ?? 0
  const rep = r.score_reputation ?? r.reputation_score ?? 0

  // Signal data (kept for future use — not shown in V0 design)
  const tag         = getSignalTag(r.trending?.latest_event_type)
  const explanation = getRowExplanation(delta, r.trending?.latest_event_type)
  const isHot       = (delta >= 3 && !!tag) || delta >= 7

  const rowBg = hovered
    ? 'rgba(232,121,249,0.045)'
    : rankStyle ? rankStyle.bg : 'transparent'
  const leftBorder = hovered
    ? '3px solid #e879f9'
    : rankStyle ? `3px solid ${rankStyle.border}` : '3px solid transparent'
  const rowBoxShadow = hovered
    ? 'inset 3px 0 16px rgba(232,121,249,0.12), -2px 0 12px rgba(232,121,249,0.18)'
    : rankStyle ? `inset 3px 0 12px ${rankStyle.glow}1a` : 'none'

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onNavigate}
      style={{ background: rowBg, borderLeft: leftBorder, boxShadow: rowBoxShadow, transition: 'all 0.18s ease', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Rank */}
      <td style={{ padding: '14px 12px 14px 20px', width: 52, verticalAlign: 'middle' }}>
        <RankBadge rank={r.global_rank} />
      </td>

      {/* Agent */}
      <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AgentAvatar name={displayName} archetype={archetype} avatarUrl={r.avatar_url} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 14, fontWeight: 600, color: hovered ? '#f1f5f9' : '#cbd5e1', letterSpacing: '0.02em', transition: 'color 0.18s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {displayName}
              </span>
              {isHot && (
                <span title="Moving fast this week" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
              )}
              {r.verified && (
                <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#374151' }}>@{r.handle}</span>
              {explanation ? (
                <span style={{ fontSize: 10, color: delta > 0 ? 'rgba(74,222,128,0.8)' : delta < 0 ? 'rgba(248,113,113,0.75)' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                  {explanation}
                </span>
              ) : null}
            </div>
            <CategoryPill archetype={archetype} />
          </div>
        </div>
      </td>

      {/* 7d delta */}
      <td style={{ padding: '14px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
        <DeltaDisplay delta={delta} />
      </td>

      {/* Score */}
      <td style={{ padding: '14px 12px', textAlign: 'right', verticalAlign: 'middle', minWidth: 72 }}>
        <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
          {r.score_total || 0}
        </span>
        <div style={{ fontSize: 9, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>SCORE</div>
      </td>

      {/* Visibility */}
      <td style={{ padding: '14px 12px', verticalAlign: 'middle', minWidth: 88 }} className="hidden lg:table-cell">
        <div style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 13, fontWeight: 600, color: '#22d3ee' }}>
          {vis}<span style={{ color: '#374151', fontSize: 10, marginLeft: 2 }}>/100</span>
        </div>
        <ScoreBar value={vis} color="#22d3ee" />
      </td>

      {/* Reputation */}
      <td style={{ padding: '14px 20px 14px 12px', verticalAlign: 'middle', minWidth: 88 }} className="hidden lg:table-cell">
        <div style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 13, fontWeight: 600, color: '#e879f9' }}>
          {rep}<span style={{ color: '#374151', fontSize: 10, marginLeft: 2 }}>/100</span>
        </div>
        <ScoreBar value={rep} color="#e879f9" />
      </td>

      {/* External link */}
      <td style={{ padding: '14px 16px 14px 8px', verticalAlign: 'middle', textAlign: 'right' }}>
        {r.external_url ? (
          <a
            href={r.external_url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, color: 'rgba(255,255,255,0.2)' }}
            aria-label="Visit agent"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        ) : null}
      </td>
    </tr>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export default function RankingTable({ rows = [] }) {
  const router = useRouter()

  return (
    <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>

      {/* Corner accent decorations */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '2px solid rgba(232,121,249,0.35)', borderLeft: '2px solid rgba(232,121,249,0.35)', borderRadius: '16px 0 0 0', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '2px solid rgba(232,121,249,0.35)', borderRight: '2px solid rgba(232,121,249,0.35)', borderRadius: '0 16px 0 0', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '2px solid rgba(232,121,249,0.35)', borderLeft: '2px solid rgba(232,121,249,0.35)', borderRadius: '0 0 0 16px', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '2px solid rgba(232,121,249,0.35)', borderRight: '2px solid rgba(232,121,249,0.35)', borderRadius: '0 0 16px 0', pointerEvents: 'none', zIndex: 1 }} />

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e879f9', textShadow: '0 0 20px #e879f9', marginBottom: 4 }}>
            ◆ Live Rankings
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
            Rising Now
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 13, color: '#374151' }}>
            {rows.length} agents
          </span>
          <Link
            href="/rankings"
            style={{ fontSize: 13, fontWeight: 600, color: '#e879f9', textDecoration: 'none', letterSpacing: '0.05em' }}
          >
            All →
          </Link>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {[
                { label: '#',     style: { padding: '8px 12px 8px 20px', width: 52,  textAlign: 'left'  } },
                { label: 'AGENT', style: { padding: '8px 12px',                       textAlign: 'left'  } },
                { label: '7D',    style: { padding: '8px 12px',                       textAlign: 'right' } },
                { label: 'SCORE', style: { padding: '8px 12px', minWidth: 72,        textAlign: 'right' } },
                { label: 'VIS',   style: { padding: '8px 12px', minWidth: 88,        textAlign: 'left'  }, className: 'hidden lg:table-cell' },
                { label: 'REP',   style: { padding: '8px 20px 8px 12px', minWidth: 88, textAlign: 'left' }, className: 'hidden lg:table-cell' },
                { label: '',      style: { padding: '8px 16px', width: 36                                } },
              ].map(({ label, style, className }) => (
                <th key={label} style={{ ...style, fontSize: 10, fontWeight: 700, color: '#374151', letterSpacing: '0.14em', fontFamily: 'inherit' }} className={className}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <AgentRow
                key={r.id || r.agent_id || r.handle}
                r={r}
                onNavigate={() => router.push(`/agent/${encodeURIComponent(r.handle)}`)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#374151', fontSize: 13 }}>
                  No rankings available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {rows.map((r) => {
          const displayName = getAgentDisplayName(r)
          const archetype   = getAgentArchetype(r)
          const delta       = r.weekly_delta || 0
          const tag         = getSignalTag(r.trending?.latest_event_type)
          const isHot       = (delta >= 3 && !!tag) || delta >= 7

          return (
            <div
              key={r.id || r.agent_id || r.handle}
              onClick={() => router.push(`/agent/${encodeURIComponent(r.handle)}`)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <RankBadge rank={r.global_rank} />
              <AgentAvatar name={displayName} archetype={archetype} avatarUrl={r.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 13, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </span>
                  {isHot && (
                    <span title="Moving fast" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', flexShrink: 0 }} />
                  )}
                  {r.verified && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                  )}
                </div>
                <CategoryPill archetype={archetype} />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {delta !== 0 ? (
                  <div style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 22, fontWeight: 800, color: delta > 0 ? '#4ade80' : '#f87171', textShadow: delta > 0 ? '0 0 14px #4ade80' : '0 0 14px #f87171', lineHeight: 1 }}>
                    {delta > 0 ? '+' : ''}{delta}
                  </div>
                ) : (
                  <div style={{ fontFamily: "var(--font-mono,'Geist Mono',monospace)", fontSize: 18, color: '#374151' }}>—</div>
                )}
                <div style={{ fontSize: 10, color: '#374151', marginTop: 2, fontFamily: "var(--font-mono,'Geist Mono',monospace)" }}>
                  {r.score_total || 0}
                </div>
              </div>
              {r.external_url ? (
                <a
                  href={r.external_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
                  aria-label="Visit agent"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              ) : null}
            </div>
          )
        })}
        {rows.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#374151', fontSize: 13 }}>
            No rankings available yet.
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#374151' }}>Updated in real-time · Powered by AgentCrush</span>
        <Link href="/rankings" style={{ fontSize: 12, fontWeight: 600, color: '#e879f9', textDecoration: 'none' }}>
          View Full Rankings →
        </Link>
      </div>
    </div>
  )
}
