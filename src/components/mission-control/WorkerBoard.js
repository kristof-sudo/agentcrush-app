'use client'

import { useEffect, useState } from 'react'

export default function WorkerBoard() {
  const [runs, setRuns] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/mission-control/workers')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load worker runs')
        }
        setRuns(data.runs || [])
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
        Failed to load worker data: {error}
      </div>
    )
  }

  if (!runs.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm opacity-70">
        No worker runs found yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div
          key={r.id}
          className="rounded-lg border border-white/10 bg-white/5 p-3"
        >
          <div className="font-medium">{r.runner || 'Unknown worker'}</div>
          <div className="text-sm opacity-70">
            Status: {r.status || 'unknown'}
          </div>
          <div className="text-xs opacity-50">
            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
