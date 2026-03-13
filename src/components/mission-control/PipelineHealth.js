"use client"

import { useEffect, useState } from "react"
import Card from "@/components/ui/Card"

export default function PipelineHealth() {

  const [data,setData] = useState(null)

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
        <div className="text-sm text-emerald-400">
          Pipeline healthy — no stuck jobs
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border border-red-500/30 bg-red-500/5">
      <div className="text-sm text-red-400 mb-2">
        Pipeline alerts detected
      </div>

      {data.selector_stuck > 0 && (
        <div className="text-xs text-white/70">
          Selector backlog: {data.selector_stuck}
        </div>
      )}

      {data.copydesk_stuck > 0 && (
        <div className="text-xs text-white/70">
          CopyDesk stalled jobs: {data.copydesk_stuck}
        </div>
      )}

      {data.publish_stuck > 0 && (
        <div className="text-xs text-white/70">
          Publisher delay: {data.publish_stuck}
        </div>
      )}
    </Card>
  )
}
