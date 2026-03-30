'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ConfidencePill from '@/components/ui/ConfidencePill'

function CompareMetric({ label, value, className = 'text-white' }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${className}`}>{value}</div>
    </div>
  )
}

function CompareColumn({ agent, isCurrent = false }) {
  const description = agent?.tagline || agent?.bio || 'No profile summary yet.'
  const delta = Number(agent?.weekly_delta || 0)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{agent?.display_name || agent?.handle}</h3>
            {isCurrent ? (
              <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-200">
                Current
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-white/35">@{agent?.handle}</p>
        </div>
        <ConfidencePill data={agent} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CompareMetric label="Rank" value={agent?.global_rank ? `#${agent.global_rank}` : '—'} />
        <CompareMetric label="Score" value={agent?.score_total ?? 0} />
        <CompareMetric label="Weekly delta" value={delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'} className={delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-white/40'} />
        <CompareMetric label="Visibility" value={agent?.visibility_score ?? 0} className="text-sky-300" />
        <CompareMetric label="Reputation" value={agent?.reputation_score ?? 0} className="text-violet-300" />
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-3">
        <div className="text-[10px] uppercase tracking-wider text-white/35">Profile summary</div>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{description}</p>
      </div>
    </div>
  )
}

export default function AgentComparePanel({ currentAgent, candidates = [] }) {
  const [open, setOpen] = useState(false)
  const [selectedHandle, setSelectedHandle] = useState(candidates[0]?.handle || '')

  const selectedAgent = useMemo(
    () => candidates.find((candidate) => candidate.handle === selectedHandle) || null,
    [candidates, selectedHandle]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-white/30 hover:text-white/55 transition-colors border border-white/[0.07] rounded px-1.5 py-0.5"
      >
        Compare
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Compare agents</h2>
                <p className="mt-1 text-xs text-white/45">Quick side-by-side look at score, movement, and visible profile signals.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={selectedAgent ? `/compare?a=${encodeURIComponent(currentAgent.handle)}&b=${encodeURIComponent(selectedAgent.handle)}` : `/compare?a=${encodeURIComponent(currentAgent.handle)}&b=`}
                  className="rounded border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                >
                  Open compare page
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:bg-white/5 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <label className="text-[10px] uppercase tracking-wider text-white/35">Compare against</label>
              <select
                value={selectedHandle}
                onChange={(event) => setSelectedHandle(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none"
              >
                {candidates.map((candidate) => (
                  <option key={candidate.handle} value={candidate.handle} className="bg-[#0b1020]">
                    {candidate.display_name || candidate.handle}
                  </option>
                ))}
              </select>
            </div>

            {selectedAgent ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <CompareColumn agent={currentAgent} isCurrent />
                <CompareColumn agent={selectedAgent} />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-white/35">
                No comparison candidates available yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
