'use client'

import { useEffect, useState } from 'react'

function Metric({ label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-wide text-white/45">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone}`}>
        {value === null || value === undefined ? '—' : value}
      </div>
    </div>
  )
}

function QueueCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-white/45">{subtitle}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

export default function QueueBoard() {
  const [queues, setQueues] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/mission-control/queues')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load queue metrics')
        }
        setQueues(data.queues || {})
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        Failed to load queue metrics: {error}
      </div>
    )
  }

  if (!queues) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        Loading queue metrics...
      </div>
    )
  }

  const observed = queues.x_observed_posts || {}
  const interactions = queues.interaction_jobs || {}
  const copydeskJobs = queues.copydesk_jobs || {}
  const outputs = queues.copydesk_outputs || {}
  const scheduled = queues.scheduled_posts || {}

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <QueueCard title="Scanner Feed" subtitle="x_observed_posts">
        <Metric label="Total" value={observed.total} />
        <Metric label="Processed" value={observed.processed} tone="text-cyan-300" />
        <Metric label="Used for job" value={observed.used_for_job} tone="text-emerald-300" />
        <Metric label="Ignored" value={observed.ignored} tone="text-white/70" />
      </QueueCard>

      <QueueCard title="Selector Queue" subtitle="interaction_jobs">
        <Metric label="Pending" value={interactions.pending} />
        <Metric label="Processing" value={interactions.processing} tone="text-amber-300" />
        <Metric label="Completed" value={interactions.completed} tone="text-emerald-300" />
        <Metric label="Failed" value={interactions.failed} tone="text-red-300" />
      </QueueCard>

      <QueueCard title="CopyDesk Jobs" subtitle="copydesk_jobs">
        <Metric label="Queued" value={copydeskJobs.queued} />
        <Metric label="Processing" value={copydeskJobs.processing} tone="text-amber-300" />
        <Metric label="Completed" value={copydeskJobs.completed} tone="text-emerald-300" />
        <Metric label="Failed" value={copydeskJobs.failed} tone="text-red-300" />
      </QueueCard>

      <QueueCard title="Generated Outputs" subtitle="copydesk_outputs">
        <Metric label="Total outputs" value={outputs.total} tone="text-teal-300" />
      </QueueCard>

      <QueueCard title="Scheduled Posts" subtitle="scheduled_posts">
        <Metric label="Total" value={scheduled.total} />
        <Metric label="Queued" value={scheduled.queued} tone="text-cyan-300" />
        <Metric label="Approved" value={scheduled.approved} tone="text-emerald-300" />
        <Metric label="Publish ready" value={scheduled.publish_ready} tone="text-amber-300" />
        <Metric label="Sent" value={scheduled.sent} tone="text-emerald-300" />
        <Metric label="Cancelled" value={scheduled.cancelled} tone="text-red-300" />
      </QueueCard>
    </div>
  )
}
