'use client'

import { useState } from 'react'
import Link from 'next/link'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function CornerAccents({ color = 'rgba(255,255,255,0.2)', size = 7 }) {
  const base = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }
  return (
    <>
      <span style={{ ...base, top: 0, left: 0,    borderTop:    `1px solid ${color}`, borderLeft:   `1px solid ${color}` }} />
      <span style={{ ...base, top: 0, right: 0,   borderTop:    `1px solid ${color}`, borderRight:  `1px solid ${color}` }} />
      <span style={{ ...base, bottom: 0, left: 0,  borderBottom: `1px solid ${color}`, borderLeft:  `1px solid ${color}` }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
    </>
  )
}

export default function TrendingCard({ category, isActive = false }) {
  const [hovered, setHovered] = useState(false)
  const active = isActive || hovered

  return (
    <Link href={`/rankings?q=${encodeURIComponent(category.name)}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          padding: 16,
          height: '100%',
          boxSizing: 'border-box',
          background: active ? `rgba(${hexToRgb(category.color)}, 0.08)` : 'rgba(255,255,255,0.02)',
          border: `1px solid ${active ? category.color : 'rgba(255,255,255,0.06)'}`,
          boxShadow: active ? `0 0 18px ${category.glowColor}, inset 0 0 12px ${category.glowColor}` : 'none',
          transition: 'all 0.2s',
        }}
      >
        <CornerAccents color={active ? category.color : 'rgba(255,255,255,0.15)'} size={7} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: category.color, textShadow: `0 0 8px ${category.glowColor}`, lineHeight: 1 }}>
              {category.icon}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
              {category.name}
            </span>
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.7)', flexShrink: 0, marginLeft: 8 }}>
            {category.risingPct > 0 ? `+${category.risingPct}%` : '—'}
          </span>
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {category.agentCount} agents
        </div>
      </div>
    </Link>
  )
}
