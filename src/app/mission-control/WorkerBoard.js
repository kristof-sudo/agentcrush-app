'use client'

import { useEffect, useState } from 'react'

export default function WorkerBoard() {
  const [runs, setRuns] = useState([])

  useEffect(() => {
    fetch('/api/mission-control/workers')
      .then(res => res.json())
      .then(data => setRuns(data.runs || []))
  }, [])

  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div
          key={r.id}
          className="p-3 bg-white/5 rounded-lg border border-white/10"
        >
          <div className="font-medium">{r.runner}</div>
          <div className="text-sm opacity-70">
            Status: {r.status}
          </div>
        </div>
      ))}
    </div>
  )
}
