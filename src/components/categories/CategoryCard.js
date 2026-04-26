'use client'

import { useState } from 'react'
import Link from 'next/link'
import AgentRow from './AgentRow'

function getNeonGreenOpacity(risingPct) {
  if (!risingPct || risingPct === 0) return 0
  if (risingPct >= 100) return 1
  return 0.3 + (risingPct / 100) * 0.7
}

function CornerAccents({ color = 'rgba(255,255,255,0.12)', size = 8 }) {
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

function TrendingUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export default function CategoryCard({ category }) {
  const [hovered, setHovered] = useState(false)
  const greenOpacity = getNeonGreenOpacity(category.risingPct)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? '#e91e80' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? '0 0 20px rgba(233,30,128,0.2), inset 0 0 12px rgba(233,30,128,0.05)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      <CornerAccents color={hovered ? '#e91e80' : 'rgba(255,255,255,0.1)'} size={8} />

      {/* Card header — links to filtered rankings */}
      <Link
        href={`/rankings?q=${encodeURIComponent(category.name)}`}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: category.color, textShadow: `0 0 6px ${category.glowColor}`, lineHeight: 1, fontWeight: 700 }}>
              {category.icon}
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
              {category.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {greenOpacity > 0 && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                color: `rgba(74,222,128,${greenOpacity})`,
                textShadow: `0 0 ${Math.round(greenOpacity * 8)}px rgba(74,222,128,${greenOpacity * 0.8})`,
              }}>
                <TrendingUpIcon />
                {category.risingPct}% gaining
              </span>
            )}
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              {category.indexed} tracked
            </span>
          </div>
        </div>
      </Link>

      {/* Agent list */}
      <div style={{ flex: 1, padding: '4px 0' }}>
        {category.agents.length > 0 ? (
          category.agents.map((agent, idx) => (
            <AgentRow key={agent.handle || idx} agent={agent} rank={idx + 1} />
          ))
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.18)', padding: '12px 16px' }}>
            No ranked agents yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
          {category.unrankedCount > 0 ? `+${category.unrankedCount} not yet ranked` : ''}
        </span>
        <Link
          href={`/rankings?q=${encodeURIComponent(category.name)}`}
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: category.color,
            textShadow: `0 0 6px ${category.glowColor}`,
            textDecoration: 'none',
          }}
        >
          view all →
        </Link>
      </div>
    </div>
  )
}
