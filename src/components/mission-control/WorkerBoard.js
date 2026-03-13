'use client'

import { useEffect, useState } from 'react'

const WORKERS = [
  {
    key: 'mike_anchor',
    name: 'Mike',
    layer: 'Chief / Anchor',
    analogy: 'identity',
    role: 'System narrator and operator persona.',
    purpose:
      'Mike does not execute code. He is the public identity layer representing the combined behavior of the workers.',
    output: 'Narrative identity only',
    runnerMatch: null,
  },
  {
    key: 'x_scanner',
    name: 'X Scanner',
    layer: 'Perception Layer',
    analogy: 'eyes',
    role: 'Collects AI-agent related posts from X.',
    purpose: 'Mike observes the ecosystem.',
    output: 'x_observed_posts',
    runnerMatch: 'x_scanner',
  },
  {
    key: 'x_selector',
    name: 'X Selector',
    layer: 'Judgment Layer',
    analogy: 'judgment',
    role: 'Evaluates discovered posts and decides what deserves interaction.',
    purpose: 'Mike decides what matters.',
    output: 'interaction_jobs',
    runnerMatch: 'x_selector',
  },
  {
    key: 'copydesk',
    name: 'CopyDesk',
    layer: 'Brain / Voice Layer',
    analogy: 'voice',
    role: 'Generates text content using the model.',
    purpose: 'Mike writes posts, replies, quote tweets, and narrative scenes.',
    output: 'copydesk_outputs',
    runnerMatch: 'copydesk',
  },
  {
    key: 'canon_enqueuer',
    name: 'Canon Enqueuer',
    layer: 'Canon Engine',
    analogy: 'imagination',
    role: 'Creates internal AgentCrush narrative prompts.',
    purpose: 'Mike creates original ecosystem observations and internal story scenes.',
    output: 'copydesk_jobs',
    runnerMatch: 'canon_enqueuer',
  },
  {
    key: 'scheduler_prep',
    name: 'Scheduler Prep',
    layer: 'Timing Layer',
    analogy: 'timing',
    role: 'Moves generated content into the posting queue.',
    purpose: 'Mike decides when something appears.',
    output: 'scheduled_posts',
    runnerMatch: 'scheduler',
  },
  {
    key: 'approval_notifier',
    name: 'Approval Notifier',
    layer: 'Operator Layer',
    analogy: 'asks permission',
    role: 'Sends Telegram approval requests.',
    purpose: 'Requests human oversight before publishing.',
    output: 'Telegram approval request',
    runnerMatch: 'approval_notifier',
  },
  {
    key: 'approval_listener',
    name: 'Approval Listener',
    layer: 'Operator Layer',
    analogy: 'receives decision',
    role: 'Receives APPROVE / REJECT commands and updates database state.',
    purpose: 'Applies operator decision to the queue.',
    output: 'scheduled_posts approval state',
    runnerMatch: 'approval_listener',
  },
  {
    key: 'x_publisher',
    name: 'X Publisher',
    layer: 'Action Layer',
    analogy: 'hands',
    role: 'Publishes approved posts to X.',
    purpose: 'Mike speaks on X once all publish conditions are satisfied.',
    output: 'X post published',
    runnerMatch: 'x_publisher',
  },
  {
    key: 'x_output',
    name: 'X',
    layer: 'Output Layer',
    analogy: 'public speech',
    role: 'Final public destination.',
    purpose: 'Mike becomes visible to the outside world.',
    output: 'Published timeline activity',
    runnerMatch: null,
  },
]

function timeAgo(dateString) {
  if (!dateString) return 'No data'
  const then = new Date(dateString).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function getHealth(worker, run) {
  if (!worker.runnerMatch) {
    return {
      label: 'STRUCTURAL',
      tone: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    }
  }

  if (!run) {
    return {
      label: 'NO DATA',
      tone: 'bg-white/5 text-white/60 border-white/10',
    }
  }

  const status = String(run.status || '').toLowerCase()
  const createdAt = run.created_at ? new Date(run.created_at).getTime() : 0
  const ageMin = createdAt ? Math.floor((Date.now() - createdAt) / 60000) : 999999

  if (status === 'error' || status === 'failed') {
    return {
      label: 'ERROR',
      tone: 'bg-red-500/15 text-red-300 border-red-500/20',
    }
  }

  if (ageMin > 180) {
    return {
      label: 'STALE',
      tone: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    }
  }

  return {
    label: 'OK',
    tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  }
}

export default function WorkerBoard() {
  const [runs, setRuns] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/mission-control/workers')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load worker data')
        }
        setRuns(data.runs || [])
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        Failed to load worker data: {error}
      </div>
    )
  }

  const latestRunByWorker = {}
  for (const run of runs) {
    if (!run.runner) continue
    if (!latestRunByWorker[run.runner]) {
      latestRunByWorker[run.runner] = run
    }
  }

  return (
    <div className="space-y-3">
      {WORKERS.map((worker) => {
        const liveRun = worker.runnerMatch ? latestRunByWorker[worker.runnerMatch] : null
        const health = getHealth(worker, liveRun)

        return (
          <div
            key={worker.key}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{worker.name}</div>
                <div className="text-xs text-white/50">
                  {worker.layer} · {worker.analogy}
                </div>
              </div>

              <div
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${health.tone}`}
              >
                {health.label}
              </div>
            </div>

            <div className="space-y-1 text-xs text-white/70">
              <div>
                <span className="text-white/45">Role:</span> {worker.role}
              </div>
              <div>
                <span className="text-white/45">Purpose:</span> {worker.purpose}
              </div>
              <div>
                <span className="text-white/45">Output:</span> {worker.output}
              </div>
              <div>
                <span className="text-white/45">Runner:</span>{' '}
                {worker.runnerMatch || 'No direct code runner'}
              </div>
              <div>
                <span className="text-white/45">Last run:</span>{' '}
                {liveRun?.created_at ? timeAgo(liveRun.created_at) : 'No recent run'}
              </div>
              <div>
                <span className="text-white/45">Last status:</span>{' '}
                {liveRun?.status || '—'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
