'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

function tone(severity) {
  if (severity === 'critical') {
    return 'border-red-500/20 bg-red-500/[0.05] text-red-300'
  }
  return 'border-yellow-500/20 bg-yellow-500/[0.05] text-yellow-300'
}

export default function FailureSpikeBanner() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/mission-control/failure-spikes')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load failure spikes')
      }

      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (error) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-4">
        <div className="text-sm text-red-300">
          Failed to load failure spike data: {error}
        </div>
      </Card>
    )
  }

  if (!data || !data.issues || data.issues.length === 0) {
    return null
  }

  return (
    <Card className="border border-red-500/20 bg-red-500/[0.03] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-red-300">
            Failure spikes detected
          </div>
          <div className="mt-1 text-xs text-white/60">
            Some workers or queues are failing more than expected.
          </div>
        </div>

        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
          {data.summary?.total_issues || 0} issues
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {data.issues.map((issue, idx) => (
          <div
            key={`${issue.type}-${idx}`}
            className={`rounded-xl border p-4 ${tone(issue.severity)}`}
          >
            <div className="text-sm font-semibold">{issue.label}</div>
            <div className="mt-2 text-xs text-white/70">{issue.description}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
