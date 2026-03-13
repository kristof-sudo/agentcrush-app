'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'

export default function OperatorActionsPanel() {
  const [scheduledPostId, setScheduledPostId] = useState('')
  const [copydeskJobId, setCopydeskJobId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runAction(action, targetId) {
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch('/api/mission-control/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, targetId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Action failed')
      }

      setMessage(data.message || 'Action completed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-lg font-semibold">Operator Actions</h2>
      <p className="mb-4 text-xs text-white/60">
        Manual intervention tools for publishing and generation.
      </p>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-semibold text-white">
            Cancel scheduled post
          </div>
          <p className="mb-3 text-xs text-white/60">
            Enter a scheduled_posts.id to cancel a queued item.
          </p>

          <input
            value={scheduledPostId}
            onChange={(e) => setScheduledPostId(e.target.value)}
            placeholder="scheduled_posts.id"
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />

          <button
            onClick={() => runAction('cancel_scheduled_post', scheduledPostId)}
            disabled={loading || !scheduledPostId}
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
          >
            Cancel scheduled post
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-semibold text-white">
            Retry CopyDesk job
          </div>
          <p className="mb-3 text-xs text-white/60">
            Enter a copydesk_jobs.id to re-queue a failed or stuck writing job.
          </p>

          <input
            value={copydeskJobId}
            onChange={(e) => setCopydeskJobId(e.target.value)}
            placeholder="copydesk_jobs.id"
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />

          <button
            onClick={() => runAction('retry_copydesk_job', copydeskJobId)}
            disabled={loading || !copydeskJobId}
            className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 disabled:opacity-50"
          >
            Retry CopyDesk job
          </button>
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </Card>
  )
}
