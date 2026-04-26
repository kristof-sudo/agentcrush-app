'use client'

import { useState } from 'react'
import RankingTable from '@/components/leaderboard/RankingTable'

const ALL_TAB = 'All'

export default function SectorTabsAndTable({ rows = [], sectors = [] }) {
  const [selected, setSelected] = useState(ALL_TAB)

  const filtered = selected === ALL_TAB
    ? rows
    : rows.filter((r) => r.archetype === selected)

  return (
    <div>
      {/* Sector pills */}
      {sectors.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide" style={{msOverflowStyle:'none', scrollbarWidth:'none'}}>
          <button
            onClick={() => setSelected(ALL_TAB)}
            className={`shrink-0 rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              selected === ALL_TAB
                ? 'border-[rgba(233,30,128,0.6)] bg-[rgba(233,30,128,0.12)] text-[#e91e80]'
                : 'border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60'
            }`}
          >
            All <span className="ml-1 text-[10px] opacity-60 tabular-nums">{rows.length}</span>
          </button>
          {sectors.map(([archetype, count]) => (
            <button
              key={archetype}
              onClick={() => setSelected(archetype)}
              className={`shrink-0 rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                selected === archetype
                  ? 'border-[rgba(233,30,128,0.6)] bg-[rgba(233,30,128,0.12)] text-[#e91e80]'
                  : 'border-white/[0.07] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60'
              }`}
            >
              {archetype} <span className="ml-1 text-[10px] opacity-60 tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{maxHeight: '600px', overflowY: 'auto'}}>
        <RankingTable rows={filtered} />
      </div>
      <div className="mt-2 text-right">
        <a href="/rankings" className="font-mono text-[10px] text-white/30 hover:text-white/55 transition-colors">
          View Full Rankings →
        </a>
      </div>
    </div>
  )
}
