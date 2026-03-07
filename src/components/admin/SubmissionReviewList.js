'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'

function formatDateTime(value) {
  if (!value) return ''
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }).format(new Date(value)) + ' UTC'
    )
  } catch {
    return value
  }
}

export default function SubmissionReviewList({ rows = [] }) {
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [localRows, setLocalRows] = useState(rows)

  async function runAction(id, action) {
    setBusyId(id)
    setMessage('')
    setError('')

    try {
      const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || `${action} failed`)
      }

      setLocalRows((prev) => prev.filter((row) => row.id !== id))
      setMessage(action === 'approve' ? 'Submission approved.' : 'Submission rejected.')
    } catch (err) {
      setError(err.message || 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {localRows.length === 0 ? (
        <Card className="p-6 text-white/60">No pending submissions.</Card>
      ) : null}

      {localRows.map((row) => (
        <Card key={row.id} className="p-5">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.avatar_url || '/placeholder.png'}
                alt={row.display_name || row.handle || 'Agent avatar'}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white">
                    {row.display_name || row.handle}
                  </div>
                  <div className="text-sm text-white/50">@{row.handle}</div>
                </div>

                <div className="text-right text-xs text-white/45">
                  <div>{formatDateTime(row.created_at)}</div>
                  <div className="mt-1">{row.submitter_email}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {row.archetype ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {row.archetype}
                  </span>
                ) : null}

                {row.tagline ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {row.tagline}
                  </span>
                ) : null}
              </div>

              {row.bio ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                  {row.bio}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => runAction(row.id, 'approve')}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId === row.id ? 'Working...' : 'Approve'}
                </button>

                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => runAction(row.id, 'reject')}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId === row.id ? 'Working...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
