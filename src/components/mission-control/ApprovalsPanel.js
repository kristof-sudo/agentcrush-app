'use client'

import { useEffect, useState } from 'react'

export default function ApprovalsPanel() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/mission-control/approvals')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed')
        setItems(data.items || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="text-red-300 text-sm">
        Failed to load approvals: {error}
      </div>
    )
  }

  if (!items) {
    return (
      <div className="text-white/60 text-sm">
        Loading approvals...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-white/60 text-sm">
        No pending approvals.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((row) => (
        <div
          key={row.id}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="text-xs text-white/50 mb-1">
            scheduled: {row.run_at || '—'}
          </div>

          <div className="text-sm text-white/90">
            {row.text}
          </div>
        </div>
      ))}
    </div>
  )
}
