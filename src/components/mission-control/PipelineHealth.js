'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

function toneForSeverity(severity) {
  if (severity === 'critical') {
    return 'border-red-500/20 bg-red-500/[0.05] text-red-300'
  }

  return 'border-yellow-500/20 bg-yellow-500/[0.05] text-yellow-300'
}

export default function PipelineHealth() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/mission-control/pipeline-health')
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load pipeline health')
      }

      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  if (error) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-4">
        <div className="text-sm text-red-300">
          Failed to load pipeline health: {error}
        </div>
      </Card>
    )
  }

  if (!data) return null

  const summary = data.summary || {}
  const alerts = data.alerts || []

  if (alerts.length === 0) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-emerald-400">
              Pipeline healthy
            </div>
            <div className="text-xs text-white/60">
              No overdue selector, generation, approval, or publishing jobs detected.
            </div>
          </div>

          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            0 alerts
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border border-red-500/20 bg-red-500/[0.03] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-red-300">
            Pipeline attention needed
          </div>
          <div className="mt-1 text-xs text-white/60">
            Some stages are waiting longer than expected and may need operator intervention.
          </div>
        </div>

        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
          {summary.total_alerts || 0} alerts
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {alerts.map((alert) => (
          <div
            key={alert.key}
            className={`rounded-xl border p-4 ${toneForSeverity(alert.severity)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                {alert.label}
              </div>
              <div className="rounded-full border border-current/20 px-2 py-1 text-[11px] font-medium">
                {alert.count}
              </div>
            </div>

            <div className="mt-2 text-xs text-white/70">
              {alert.description}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
