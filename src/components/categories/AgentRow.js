'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AgentRow({ agent, rank }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={`/agent/${encodeURIComponent(agent.handle)}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 2,
          background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
      >
        {/* Rank */}
        <span style={{ fontFamily: 'monospace', fontSize: 11, width: 12, textAlign: 'right', flexShrink: 0, color: 'rgba(255,255,255,0.2)' }}>
          {rank}
        </span>

        {/* Avatar — img if url available, letter fallback */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: agent.avatar_url ? 'rgba(255,255,255,0.04)' : (agent.avatarBg || 'rgba(255,255,255,0.08)'),
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 9, color: '#ffffff' }}>
              {agent.avatarLetter}
            </span>
          )}
        </div>

        {/* Name */}
        <span style={{
          fontFamily: 'monospace',
          fontSize: 12,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)',
          transition: 'color 0.1s',
        }}>
          {agent.name}
        </span>

        {/* Delta */}
        <span style={{
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          color: agent.delta > 0 ? '#4ade80' : agent.delta < 0 ? '#f87171' : 'rgba(255,255,255,0.25)',
          textShadow: agent.delta > 0 ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
        }}>
          {agent.delta > 0 ? `+${agent.delta}` : agent.delta < 0 ? `${agent.delta}` : '—'}
        </span>
      </div>
    </Link>
  )
}
