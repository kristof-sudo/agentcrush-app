'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

function timeAgo(dateString) {
  if (!dateString) return 'No data'

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

function statusTone(status, createdAt) {
  if (!createdAt) {
    return 'border-white/10 bg-white/[0.03] text-white/60'
  }

  const ageMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'error' || normalized === 'failed') {
    return 'border-red-500/20 bg-red-500/[0.06] text-red-300'
  }

  if (ageMin > 180) {
    return 'border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-300'
  }

  return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300'
}

function statusLabel(status, createdAt) {
  if (!createdAt) return 'NO DATA'

  const ageMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'error' || normalized === 'failed') return 'ERROR'
  if (ageMin > 180) return 'STALE'
  return 'ACTIVE'
}

export default function LastWorkerActivity() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch('/api/mission-control/worker-activity')
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load worker activity')
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
    const timer = setInterval(load, 15000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  if (error) {
    return (
      <Card className="p-4 border border-red-500/20 bg-red-500/10">
        <div className="text-sm text-red-300">
          Failed to load worker activity: {error}
        </div>
      </Card>
    )
  }

  if (!items) return null

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Last Worker Activity</h2>
        <p className="text-xs text-white/60">
          Fast view of whether key pipeline workers ran recently.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.runner}
            className={`rounded-xl border p-3 ${statusTone(item.status, item.created_at)}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="text-[11px] font-medium">
                {statusLabel(item.status, item.created_at)}
              </div>
            </div>

            <div className="mt-2 text-xs text-white/55">
              runner: {item.runner}
            </div>

            <div className="mt-1 text-xs text-white/75">
              last run: {timeAgo(item.created_at)}
            </div>

            <div className="mt-1 text-xs text-white/55">
              status: {item.status || '—'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
