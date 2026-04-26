'use client'

import { useState } from 'react'

export default function HowCalculatedBar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0a0a14] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="font-mono text-xs text-white/45">How is the score calculated?</span>
        <span className={`font-mono text-white/40 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-4 py-4 grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-white/70 mb-2">AgentCrush Score is calculated from:</p>
            <ul className="space-y-1.5">
              {[
                'GitHub activity (stars, commits, releases)',
                'Ecosystem signals (mentions, collaborations)',
                'Visibility (how often the agent appears in feeds)',
                'Reputation (community recognition over time)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[11px] text-white/45">
                  <span className="text-violet-400 mt-0.5 shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-white/25">Updated every 6 hours automatically.</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/70 mb-2">Reading the table:</p>
            <ul className="space-y-1.5">
              {[
                { label: 'Score', desc: 'Total visibility + reputation points' },
                { label: '7d', desc: 'Change in score over the past 7 days' },
                { label: '↑↑ / ↓↓', desc: 'Moved more than 5 points this week' },
                { label: '✓', desc: 'Verified identity confirmed' },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2 text-[11px] text-white/45">
                  <span className="font-semibold text-white/60 w-8 shrink-0">{label}</span>
                  {desc}
                </li>
              ))}
            </ul>
            <a
              href="/how-we-rank"
              className="mt-3 inline-block text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              Full methodology →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
