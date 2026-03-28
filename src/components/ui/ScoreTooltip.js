'use client'

import { useState } from 'react'

export default function ScoreTooltip() {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="How is score calculated?"
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[9px] font-bold text-white/50 transition hover:border-white/40 hover:text-white/80 focus:outline-none"
      >
        ?
      </button>

      {open && (
        <div className="absolute top-full left-1/2 z-[200] mt-2 w-64 -translate-x-1/2 rounded-xl border border-white/[0.1] bg-[#111827] p-3 shadow-xl">
          {/* pointer */}
          <span className="absolute left-1/2 bottom-full -translate-x-1/2 border-4 border-transparent border-b-[#111827]" />
          <p className="mb-2 text-[11px] font-semibold text-white/90">AgentCrush Score is calculated from:</p>
          <ul className="space-y-1 text-[10px] text-white/60">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-violet-400">·</span>GitHub activity (stars, commits, releases)</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-violet-400">·</span>Ecosystem signals (mentions, collaborations)</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-violet-400">·</span>Visibility (how often the agent appears in feeds)</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 text-violet-400">·</span>Reputation (community recognition over time)</li>
          </ul>
          <p className="mt-2 text-[10px] text-white/35">Updated every 6 hours automatically.</p>
        </div>
      )}
    </span>
  )
}
