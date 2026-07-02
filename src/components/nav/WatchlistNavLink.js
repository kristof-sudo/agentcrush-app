'use client'

import Link from 'next/link'
import { useWatchlist } from '@/components/agents/WatchlistButton'

export default function WatchlistNavLink() {
  const { list } = useWatchlist()
  if (list.length === 0) return null

  return (
    <Link
      href="/watchlist"
      className="relative font-mono text-[12px] font-semibold text-amber-400/70 transition hover:text-amber-300 group"
    >
      ★ {list.length}
      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-amber-400 transition-all group-hover:w-full" />
    </Link>
  )
}
