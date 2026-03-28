'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Worker definitions ────────────────────────────────────────────────────

const WORKERS = [
  {
    key: 'x_scanner',
    name: 'Iris',
    role: 'Scans X for ecosystem signals',
    runner: 'x_scanner',
    staleCmd: 'systemctl restart x-scanner.timer',
    errorMsg: 'check X API keys in .env',
  },
  {
    key: 'x_selector',
    name: 'Caspian',
    role: 'Selects posts worth acting on',
    runner: 'x_selector',
    staleCmd: 'systemctl restart x-selector.timer',
    errorMsg: 'check selector logic or DB connection',
  },
  {
    key: 'copydesk',
    name: 'Zhao',
    role: 'Generates post copy via LLM',
    runner: 'copydesk',
    staleCmd: 'systemctl restart copydesk.timer',
    errorMsg: 'check OpenAI API key in .env',
  },
  {
    key: 'canon_enqueuer',
    name: 'Demis',
    role: 'Builds original ecosystem roundups',
    runner: 'canon_enqueuer',
    staleCmd: 'systemctl restart canon-enqueuer.timer',
    errorMsg: 'check canon enqueuer logs',
  },
  {
    key: 'scheduler',
    name: 'Lucia',
    role: 'Moves content into posting queue',
    runner: 'scheduler',
    staleCmd: 'systemctl restart scheduler-prep.timer',
    errorMsg: 'check scheduler logs',
  },
  {
    key: 'approval_notifier',
    name: 'Ines',
    role: 'Sends Telegram approval requests',
    runner: 'approval_notifier',
    staleCmd: 'systemctl restart approval-notifier.timer',
    errorMsg: 'check Telegram bot token in .env',
  },
  {
    key: 'approval_listener',
    name: 'Rafi',
    role: 'Applies approve/reject from Telegram',
    runner: 'approval_listener',
    staleCmd: 'systemctl restart approval-listener.timer',
    errorMsg: 'check approval listener logs',
  },
  {
    key: 'x_publisher',
    name: 'Mateo',
    role: 'Publishes approved posts to X',
    runner: 'x_publisher',
    staleCmd: 'systemctl restart x-publisher.timer',
    errorMsg: 'check X API keys in .env',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateString) {
  if (!dateString) return null
  const diff = Date.now() - new Date(dateString).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function timeUntil(dateString) {
  if (!dateString) return '—'
  const diff = new Date(dateString).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const min = Math.floor(diff / 60000)
  if (min < 60) return `in ${min}m`
  const hr = Math.floor(min / 60)
  return `in ${hr}h ${min % 60}m`
}

function extractPostText(row) {
  const p = row?.payload || {}
  if (typeof p === 'string') return p
  return p.text || p.x_text || p.body || p.caption || p.content || '(no preview)'
}

function workerHealth(worker, latestRun) {
  if (!latestRun) return { status: 'NO DATA', color: 'text-white/40', dot: 'bg-white/20' }
  const s = String(latestRun.status || '').toLowerCase()
  if (s === 'error' || s === 'failed') return { status: 'ERROR', color: 'text-red-400', dot: 'bg-red-500' }
  const ageMin = (Date.now() - new Date(latestRun.created_at).getTime()) / 60000
  if (ageMin > 180) return { status: 'STALE', color: 'text-yellow-400', dot: 'bg-yellow-400' }
  return { status: 'OK', color: 'text-emerald-400', dot: 'bg-emerald-500' }
}

// ─── Status Bar ───────────────────────────────────────────────────────────

function StatusBar({ status, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-6 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <span className="text-xs text-white/30">Loading status…</span>
      </div>
    )
  }

  const { mikeStatus, lastPostAt, postsToday, approvalQueueCount } = status || {}

  const mikeDot = mikeStatus === 'POSTING'
    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
    : mikeStatus === 'STUCK'
    ? 'bg-red-500'
    : 'bg-yellow-400'

  const mikeColor = mikeStatus === 'POSTING'
    ? 'text-emerald-400'
    : mikeStatus === 'STUCK'
    ? 'text-red-400'
    : 'text-yellow-300'

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3">
      {/* Mike status */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full shrink-0 ${mikeDot}`} />
        <span className="text-xs text-white/50">Mike</span>
        <span className={`text-xs font-bold ${mikeColor}`}>{mikeStatus || '—'}</span>
      </div>

      <div className="h-3 w-px bg-white/10 hidden sm:block" />

      {/* Last post */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/40">Last post</span>
        <span className="text-xs font-medium text-white/80">
          {lastPostAt ? timeAgo(lastPostAt) : 'never'}
        </span>
      </div>

      <div className="h-3 w-px bg-white/10 hidden sm:block" />

      {/* Posts today */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/40">Today</span>
        <span className="text-xs font-bold text-white">{postsToday ?? '—'}</span>
        <span className="text-xs text-white/30">posts</span>
      </div>

      <div className="h-3 w-px bg-white/10 hidden sm:block" />

      {/* Approval queue */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/40">Approval queue</span>
        <span className={`text-xs font-bold ${approvalQueueCount > 0 ? 'text-amber-300' : 'text-white/50'}`}>
          {approvalQueueCount ?? '—'}
        </span>
        {approvalQueueCount > 0 && (
          <span className="text-xs text-amber-300/60">waiting</span>
        )}
      </div>
    </div>
  )
}

// ─── Approval Queue ───────────────────────────────────────────────────────

function ApprovalQueue({ onQueueChange }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [pendingIds, setPendingIds] = useState(new Set())

  const load = useCallback(() => {
    fetch('/api/mission-control/approvals')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed')
        setItems(d.items || [])
        if (onQueueChange) onQueueChange(d.items?.length || 0)
      })
      .catch((e) => setError(e.message))
  }, [onQueueChange])

  useEffect(() => { load() }, [load])

  async function act(id, action) {
    setPendingIds((s) => new Set([...s, `${id}:${action}`]))
    try {
      const r = await fetch('/api/mission-control/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId: id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Action failed')
      // Remove from local list immediately
      setItems((prev) => (prev || []).filter((i) => i.id !== id))
      if (onQueueChange) onQueueChange(Math.max(0, (items?.length || 1) - 1))
    } catch (e) {
      alert(e.message)
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(`${id}:${action}`); return n })
    }
  }

  const sectionHeader = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
      <span className="text-xs font-semibold text-white">Approval Queue</span>
      {items != null && (
        <span className={`text-xs ${items.length > 0 ? 'text-amber-300 font-semibold' : 'text-emerald-400'}`}>
          {items.length > 0 ? `${items.length} waiting` : 'Queue is clear'}
        </span>
      )}
    </div>
  )

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {sectionHeader}

      {error && (
        <div className="px-3 py-3 text-xs text-red-400">{error}</div>
      )}

      {!items && !error && (
        <div className="px-3 py-4 text-xs text-white/30">Loading…</div>
      )}

      {items && items.length === 0 && (
        <div className="px-3 py-4 text-xs text-emerald-400/70">No posts waiting for approval.</div>
      )}

      {items && items.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {items.map((row) => {
            const approvePending = pendingIds.has(`${row.id}:approve_tweet`)
            const rejectPending = pendingIds.has(`${row.id}:reject_tweet`)
            const busy = approvePending || rejectPending

            return (
              <div key={row.id} className="px-3 py-3 space-y-2">
                {/* Post text */}
                <p className="text-sm leading-6 text-white/90 whitespace-pre-wrap">
                  {extractPostText(row)}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/35">
                  <span>Scheduled: <span className="text-white/55">{timeUntil(row.run_at)}</span></span>
                  {row.approval_token && (
                    <span>Token: <span className="font-mono text-white/40">{row.approval_token}</span></span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    disabled={busy}
                    onClick={() => act(row.id, 'approve_tweet')}
                    className="px-3 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                  >
                    {approvePending ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act(row.id, 'reject_tweet')}
                    className="px-3 py-1 rounded border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                  >
                    {rejectPending ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Pipeline Health ──────────────────────────────────────────────────────

function PipelineHealthSection({ runs }) {
  const latestByRunner = {}
  for (const run of runs || []) {
    if (run.runner && !latestByRunner[run.runner]) latestByRunner[run.runner] = run
  }

  const rows = WORKERS.map((w) => {
    const run = latestByRunner[w.runner] || null
    const health = workerHealth(w, run)
    let action = null
    if (health.status === 'STALE') action = `run: ${w.staleCmd}`
    if (health.status === 'ERROR') action = w.errorMsg
    return { ...w, run, health, action }
  })

  const problems = rows.filter((r) => r.health.status === 'STALE' || r.health.status === 'ERROR')
  const ok = rows.filter((r) => r.health.status === 'OK' || r.health.status === 'NO DATA')

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Pipeline Health</span>
        <span className={`text-xs font-semibold ${problems.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {problems.length > 0 ? `${problems.length} need attention` : 'All clear'}
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {/* Problems first */}
        {problems.map((w) => (
          <div key={w.key} className="flex items-start gap-3 px-3 py-2">
            <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${w.health.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{w.name}</span>
                <span className={`text-[10px] font-bold ${w.health.color}`}>{w.health.status}</span>
                <span className="text-[10px] text-white/30">{w.run ? timeAgo(w.run.created_at) : 'no data'}</span>
              </div>
              {w.action && (
                <div className="mt-0.5 text-[11px] text-amber-300/80">
                  → {w.action}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* OK workers in compact form */}
        {ok.map((w) => (
          <div key={w.key} className="flex items-center gap-3 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${w.health.dot}`} />
            <span className="text-xs text-white/60 w-16 shrink-0">{w.name}</span>
            <span className="text-[10px] text-white/30 flex-1">{w.role}</span>
            <span className={`text-[10px] font-medium ${w.health.color}`}>{w.health.status}</span>
            <span className="text-[10px] text-white/25 w-16 text-right">
              {w.run ? timeAgo(w.run.created_at) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cost Tracker ─────────────────────────────────────────────────────────

function CostTracker({ status }) {
  const openaiToday = status?.openaiCostToday
  const openaiMonth = status?.openaiCostMonth

  const fmt = (v) => (v != null ? `$${v.toFixed(2)}` : '—')

  const lines = [
    { label: 'X API', today: '—', month: 'tracking', note: '$1–2/day budget' },
    { label: 'OpenAI', today: fmt(openaiToday), month: fmt(openaiMonth), note: 'from copydesk_outputs' },
    { label: 'VPS', today: '—', month: '$6.00', note: 'static' },
    { label: 'Vercel', today: '—', month: '$0.00', note: 'free tier' },
  ]

  const monthTotal = (openaiMonth || 0) + 6
  const estimatedMonth = `~$${monthTotal.toFixed(2)}/mo`

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Cost Tracker</span>
        <span className="text-xs text-white/40">{estimatedMonth} est.</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center gap-3 px-3 py-1.5">
            <span className="text-xs text-white/60 w-20 shrink-0">{l.label}</span>
            <div className="flex-1 flex items-center gap-4">
              <span className="text-[11px] text-white/40">Today: <span className="text-white/70">{l.today}</span></span>
              <span className="text-[11px] text-white/40">Month: <span className="text-white/70">{l.month}</span></span>
            </div>
            <span className="text-[10px] text-white/20 hidden sm:block">{l.note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Worker Activity ──────────────────────────────────────────────────────

function WorkerActivity({ runs, loading }) {
  const latestByRunner = {}
  for (const run of runs || []) {
    if (run.runner && !latestByRunner[run.runner]) latestByRunner[run.runner] = run
  }

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Worker Activity</span>
      </div>

      {loading && (
        <div className="px-3 py-3 text-xs text-white/30">Loading…</div>
      )}

      {!loading && (
        <div className="divide-y divide-white/[0.04]">
          {WORKERS.map((w) => {
            const run = latestByRunner[w.runner] || null
            const health = workerHealth(w, run)
            return (
              <div key={w.key} className="flex items-center gap-3 px-3 py-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${health.dot}`} />
                <span className="text-xs font-medium text-white/80 w-16 shrink-0">{w.name}</span>
                <span className="text-[11px] text-white/40 flex-1 truncate">{w.role}</span>
                <span className={`text-[10px] font-semibold shrink-0 ${health.color}`}>{health.status}</span>
                <span className="text-[10px] text-white/25 w-16 text-right shrink-0">
                  {run ? timeAgo(run.created_at) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function MissionControl() {
  const [status, setStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [runs, setRuns] = useState([])
  const [runsLoading, setRunsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mission-control/status')
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {})
      .finally(() => setStatusLoading(false))

    fetch('/api/mission-control/workers')
      .then((r) => r.json())
      .then((d) => setRuns(d.runs || []))
      .catch(() => {})
      .finally(() => setRunsLoading(false))
  }, [])

  // When approval queue resolves, refresh status bar count
  const handleQueueChange = useCallback((count) => {
    setStatus((prev) => prev ? { ...prev, approvalQueueCount: count } : prev)
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Mission Control</h1>
        <span className="text-[11px] text-white/25">Mike pipeline ops</span>
      </div>

      {/* Section 1 — Status bar */}
      <StatusBar status={status} loading={statusLoading} />

      {/* Section 2 — Approval queue */}
      <ApprovalQueue onQueueChange={handleQueueChange} />

      {/* Section 3 — Pipeline health */}
      <PipelineHealthSection runs={runs} />

      {/* Section 4 — Cost tracker */}
      <CostTracker status={status} />

      {/* Section 5 — Worker activity */}
      <WorkerActivity runs={runs} loading={runsLoading} />
    </div>
  )
}
