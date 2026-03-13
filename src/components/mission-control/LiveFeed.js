'use client'

import { useEffect, useState } from 'react'

function timeAgo(dateString) {
  if (!dateString) return '—'

  const then = new Date(dateString).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function toneForType(type) {
  if (type === 'published') {
    return 'border-emerald-500/20 bg-emerald-500/[0.04]'
  }

  if (type === 'observed') {
    return 'border-cyan-500/20 bg-cyan-500/[0.04]'
  }

  return 'border-white/10 bg-white/[0.03]'
}

function badgeForType(type) {
  if (type === 'published') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
  }

  if (type === 'observed') {
    return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20'
  }

  return 'bg-white/5 text-white/60 border-white/10'
}

export default function LiveFeed() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch('/api/mission-control/live')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load live feed')
        }

        if (mounted) {
          setItems(data.items || [])
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
        }
      }
    }

    load()
    const timer = setInterval(load, 30000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        Failed to load live feed: {error}
      </div>
    )
  }

  if (!items) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        Loading live feed...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        No recent activity.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-xl border p-4 ${toneForType(item.type)}`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
            <span className={`rounded-full border px-2 py-1 ${badgeForType(item.type)}`}>
              {item.type}
            </span>
            <span>{item.title}</span>
            <span>{timeAgo(item.created_at)}</span>
          </div>

          <div className="text-sm leading-6 text-white/90">
            {item.text}
          </div>
        </div>
      ))}
    </div>
  )
}
