'use client'

import { useEffect, useState } from 'react'

function extractApprovalText(row) {
  const payload = row?.payload || {}

  if (typeof payload === 'string') return payload
  if (payload.text) return payload.text
  if (payload.x_text) return payload.x_text
  if (payload.body) return payload.body
  if (payload.caption) return payload.caption
  if (payload.content) return payload.content

  return 'No preview text found in payload.'
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function timeUntil(dateString) {
  if (!dateString) return '—'

  const now = new Date()
  const target = new Date(dateString)

  const diff = target - now

  if (diff <= 0) return 'publishing now'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `publishes in ${hours}h ${minutes}m`
  }

  return `publishes in ${minutes}m`
}

export default function ApprovalsPanel() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/mission-control/approvals')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load approvals')
        setItems(data.items || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="space-y-4">

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load posts: {error}
        </div>
      )}

      {!items && !error && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
          Loading scheduled posts...
        </div>
      )}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
          No scheduled posts.
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <<div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
  <span className="rounded-full border border-white/10 px-2 py-1">
    {row.status || '—'}
  </span>

  <span>
    requested: {formatDate(row.approval_requested_at)}
  </span>

  <span>
    run at: {formatDate(row.run_at)}
  </span>

  <span className="text-cyan-400">
    {'⏳ '}{timeUntil(row.run_at)}
  </span>
</div>
                  
              <div className="text-sm leading-6 text-white/90">
                {extractApprovalText(row)}
              </div>

              <div className="mt-3 text-[11px] text-white/35">
                token: {row.approval_token || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
