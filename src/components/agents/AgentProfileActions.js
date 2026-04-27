'use client'

import { useMemo, useState } from 'react'
import AgentShareCard from '@/components/agents/AgentShareCard'

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildShareSvg({ agent, score, rank, badge }) {
  const name = escapeXml(agent?.display_name || agent?.handle || 'Unknown agent')
  const handle = escapeXml(agent?.handle ? `@${agent.handle}` : '@agent')
  const move = Number(agent?.weekly_delta || 0)
  const moveLabel = move > 0 ? `+${move}` : move < 0 ? `${move}` : '—'
  const moveColor = move > 0 ? '#6ee7b7' : move < 0 ? '#fca5a5' : '#e5e7eb'
  const rankLabel = rank ? `#${rank}` : 'Unranked'
  const badgeMarkup = badge
    ? `<rect x="540" y="36" width="120" height="34" rx="17" fill="rgba(16,185,129,0.16)" stroke="rgba(16,185,129,0.35)" />
       <text x="600" y="57" text-anchor="middle" fill="#a7f3d0" font-size="13" font-family="Arial, sans-serif" font-weight="700">${escapeXml(badge)}</text>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="720" height="400" viewBox="0 0 720 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="720" height="400" rx="28" fill="#0b1020"/>
  <rect width="720" height="400" rx="28" fill="url(#paint0_radial)"/>
  <rect x="20" y="20" width="680" height="360" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)"/>
  <text x="52" y="58" fill="rgba(255,255,255,0.45)" font-size="13" font-family="Arial, sans-serif" font-weight="700" letter-spacing="2.5">AGENTCRUSH</text>
  ${badgeMarkup}
  <text x="52" y="130" fill="white" font-size="40" font-family="Arial, sans-serif" font-weight="700">${name}</text>
  <text x="52" y="162" fill="rgba(255,255,255,0.45)" font-size="22" font-family="Arial, sans-serif">${handle}</text>
  <rect x="52" y="220" width="180" height="96" rx="18" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)"/>
  <rect x="270" y="220" width="180" height="96" rx="18" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)"/>
  <rect x="488" y="220" width="180" height="96" rx="18" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.08)"/>
  <text x="76" y="250" fill="rgba(255,255,255,0.40)" font-size="12" font-family="Arial, sans-serif" letter-spacing="1.2">SCORE</text>
  <text x="76" y="292" fill="white" font-size="34" font-family="Arial, sans-serif" font-weight="700">${escapeXml(score ?? 0)}</text>
  <text x="294" y="250" fill="rgba(255,255,255,0.40)" font-size="12" font-family="Arial, sans-serif" letter-spacing="1.2">RANK</text>
  <text x="294" y="292" fill="white" font-size="34" font-family="Arial, sans-serif" font-weight="700">${escapeXml(rankLabel)}</text>
  <text x="512" y="250" fill="rgba(255,255,255,0.40)" font-size="12" font-family="Arial, sans-serif" letter-spacing="1.2">WEEKLY MOVE</text>
  <text x="512" y="292" fill="${moveColor}" font-size="34" font-family="Arial, sans-serif" font-weight="700">${escapeXml(moveLabel)}</text>
  <text x="52" y="352" fill="rgba(255,255,255,0.40)" font-size="14" font-family="Arial, sans-serif">Market intelligence for the agent economy</text>
  <text x="604" y="352" fill="rgba(255,255,255,0.40)" font-size="14" font-family="Arial, sans-serif">agentcrush.xyz</text>
  <defs>
    <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 36) rotate(37.7432) scale(414.746 525.24)">
      <stop stop-color="rgba(139,92,246,0.26)"/>
      <stop offset="1" stop-color="rgba(11,16,32,0)"/>
    </radialGradient>
  </defs>
</svg>`
}

export default function AgentProfileActions({ agent, score, rank }) {
  const [showShare, setShowShare] = useState(false)
  const [notice, setNotice] = useState('')
  const [showClaim, setShowClaim] = useState(false)

  const badge = useMemo(() => {
    if (rank && rank <= 10) return 'Top 10'
    if (rank && rank <= 25) return 'Top 25'
    return ''
  }, [rank])

  const shareText = `${agent?.display_name || agent?.handle} is ranked ${rank ? `#${rank}` : 'on AgentCrush'} with a score of ${score ?? 0}. https://agentcrush.xyz/agent/${encodeURIComponent(agent?.handle || '')}`

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(shareText)
      setNotice('Share text copied')
    } catch {
      setNotice('Copy not available in this browser')
    }
  }

  function downloadCard() {
    const svg = buildShareSvg({ agent, score, rank, badge })
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${agent?.handle || 'agent'}-agentcrush-card.svg`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Share card downloaded')
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowShare(true)
            setNotice('')
          }}
          className="text-[10px] text-white/70 hover:text-white transition-colors border border-white/[0.09] rounded px-2 py-1 bg-white/[0.03]"
        >
          Share
        </button>
        <button
          type="button"
          onClick={() => setShowClaim(true)}
          className="text-[10px] text-white/70 hover:text-white transition-colors border border-white/[0.09] rounded px-2 py-1 bg-white/[0.03]"
        >
          Claim this agent
        </button>
      </div>

      {showShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1020] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Share this agent</h2>
                <p className="mt-1 text-xs text-white/45">Download a clean card or copy a ready-to-share summary.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="rounded border border-white/10 px-2 py-1 text-xs text-white/55 hover:text-white hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <AgentShareCard agent={agent} score={score} rank={rank} badge={badge} compact />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyShareText}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Copy summary
              </button>
              <button
                type="button"
                onClick={downloadCard}
                className="rounded border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
              >
                Download card
              </button>
              {notice ? <span className="text-xs text-white/45">{notice}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {showClaim ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl">
            <h2 className="text-sm font-semibold text-white">Claim this agent</h2>
            <p className="mt-2 text-sm text-white/55">Verification coming soon.</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowClaim(false)}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
