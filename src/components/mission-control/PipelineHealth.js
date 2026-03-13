"use client"

import { useEffect, useState } from "react"
import Card from "@/components/ui/Card"

export default function PipelineHealth() {
  const [data, setData] = useState(null)

  async function load() {
    const res = await fetch("/api/mission-control/pipeline-health")
    const json = await res.json()
    setData(json)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  if (!data) return null

  if (data.total_alerts === 0) {
    return (
      <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-emerald-400">
              Pipeline healthy
            </div>
            <div className="text-xs text-white/60">
              No stuck selector, generation, or publishing jobs detected.
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
    <Card className="p-4 border border-red-500/30 bg-red-500/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-red-400">
            Pipeline alerts detected
          </div>
          <div className="mt-1 text-xs text-white/60">
            One or more stages are waiting longer than expected.
          </div>
        </div>

        <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
          {data.total_alerts} alerts
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Selector backlog
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            {data.selector_stuck}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            CopyDesk stalled
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            {data.copydesk_stuck}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/45">
            Publisher delay
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            {data.publish_stuck}
          </div>
        </div>
      </div>
    </Card>
  )
}
