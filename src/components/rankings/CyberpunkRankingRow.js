'use client'

import Link from 'next/link'
import { useMemo } from 'react'

const AVATAR_COLORS = [
  'bg-fuchsia-500/20 text-fuchsia-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-cyan-500/20 text-cyan-300',
  'bg-amber-500/20 text-amber-300',
  'bg-pink-500/20 text-pink-300',
  'bg-violet-500/20 text-violet-300',
]

function avatarColor(handle) {
  if (!handle) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function getRankBadgeClass(rank) {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return 'bg-white/[0.06] text-white/50'
}

function getDeltaIntensity(delta) {
  const abs = Math.abs(delta)
  if (abs >= 30) return 'extreme'
  if (abs >= 20) return 'high'
  if (abs >= 10) return 'medium'
  return 'low'
}

export default function CyberpunkRankingRow({
  rank,
  avatarUrl,
  name,
  handle,
  category,
  score,
  delta,
  vis,
  rep,
  verified = false,
}) {
  const intensity = useMemo(() => getDeltaIntensity(delta), [delta])
  const isPositive = delta > 0
  const isNegative = delta < 0

  const deltaStyles = useMemo(() => {
    const base = {
      low: {
        fontSize: '18px',
        className: isPositive ? 'neon-text-green' : 'neon-text-red',
      },
      medium: {
        fontSize: '22px',
        className: isPositive ? 'neon-text-green' : 'neon-text-red',
      },
      high: {
        fontSize: '26px',
        className: isPositive ? 'neon-text-green-intense' : 'neon-text-red',
      },
      extreme: {
        fontSize: '32px',
        className: isPositive ? 'neon-text-green-intense' : 'neon-text-red',
      },
    }
    return base[intensity]
  }, [intensity, isPositive])

  return (
    <Link
      href={`/agent/${encodeURIComponent(handle || '')}`}
      className="cyber-row group relative flex items-center gap-4 px-4 py-3 rounded-lg 
                 bg-[#0d0d16] border border-white/[0.06] 
                 hover:bg-[#12121c] hover:border-white/[0.12]
                 transition-all duration-300 ease-out"
    >
      {/* Magenta left glow on hover */}
      <div className="cyber-glow-left absolute inset-0 rounded-lg pointer-events-none" />

      {/* Scanline effect */}
      <div className="cyber-scanline absolute inset-0 rounded-lg pointer-events-none" />

      {/* Rank Badge */}
      <div
        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center 
                    font-bold text-sm tabular-nums ${getRankBadgeClass(rank)}`}
      >
        #{rank}
      </div>

      {/* Avatar */}
      <div
        className={`shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center 
                    border border-white/[0.1] ${!avatarUrl ? avatarColor(handle) : 'bg-[#12121c]'}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold">{name?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>

      {/* Name + Category */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
            {name}
          </span>
          {verified && (
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded border border-[#4ade80]/30 bg-[#4ade80]/10 text-[#4ade80]">
              ✓
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e879f9]/10 text-[#e879f9]/80 border border-[#e879f9]/20">
            {category}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <div className="text-lg font-bold tabular-nums text-white/80">
          {score?.toLocaleString() || '—'}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/30">Score</div>
      </div>

      {/* 7-Day Delta - HERO ELEMENT */}
      <div className="shrink-0 w-28 text-center relative">
        {delta !== 0 ? (
          <>
            {/* Background glow for intense deltas */}
            {intensity === 'extreme' && isPositive && (
              <div 
                className="absolute inset-0 -inset-x-4 rounded-lg opacity-20 blur-xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, #4ade80 0%, transparent 70%)' }}
              />
            )}
            {intensity === 'high' && isPositive && (
              <div 
                className="absolute inset-0 -inset-x-2 rounded-lg opacity-15 blur-lg pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, #4ade80 0%, transparent 70%)' }}
              />
            )}
            <div
              className={`relative font-black tabular-nums leading-none ${deltaStyles.className}`}
              style={{ fontSize: deltaStyles.fontSize }}
            >
              {isPositive ? '+' : ''}{delta}
            </div>
          </>
        ) : (
          <div className="text-lg text-white/20 font-medium">—</div>
        )}
        <div className="mt-1 text-[8px] uppercase tracking-widest text-white/25">7d Δ</div>
      </div>

      {/* VIS + REP */}
      <div className="shrink-0 flex gap-4 text-right">
        <div>
          <div className="text-xs font-medium tabular-nums text-white/50">{vis ?? '—'}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/20">VIS</div>
        </div>
        <div>
          <div className="text-xs font-medium tabular-nums text-white/50">{rep ?? '—'}</div>
          <div className="text-[8px] uppercase tracking-wider text-white/20">REP</div>
        </div>
      </div>
    </Link>
  )
}
