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

const BUD_TZ = 'Europe/Budapest'

function formatBudapestTime(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: BUD_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: BUD_TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  const todayStr = dayFmt.format(now)
  const targetStr = dayFmt.format(date)
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = dayFmt.format(tomorrowDate)
  const prefix = targetStr === todayStr ? 'Today' : targetStr === tomorrowStr ? 'Tomorrow' : targetStr
  return `${prefix} ${timeFmt.format(date)}`
}

function extractPostType(row) {
  const p = row?.payload || {}
  if (typeof p !== 'object') return 'ORIGINAL'
  const t = (p.type || p.post_type || p.action_type || '').toLowerCase()
  if (t === 'x_repost' || t === 'repost' || t === 'retweet') return 'REPOST'
  if (t === 'x_quote' || t === 'quote' || t === 'quote_tweet') return 'QUOTE'
  if (t === 'x_reply' || t === 'reply') return 'REPLY'
  return 'ORIGINAL'
}

function PostTypeBadge({ type }) {
  const colors = {
    ORIGINAL: 'border-violet-500/30 text-violet-300/80',
    REPOST: 'border-sky-500/30 text-sky-300/80',
    QUOTE: 'border-amber-500/30 text-amber-300/80',
    REPLY: 'border-emerald-500/30 text-emerald-300/80',
  }
  return (
    <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold tracking-wide ${colors[type] || colors.ORIGINAL}`}>
      {type}
    </span>
  )
}

function extractPostText(row) {
  const p = row?.payload || {}
  if (typeof p === 'string') return p
  // Reposts: show the target tweet text rather than "(no preview)"
  if (p.target_text) return p.target_text
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

  const { mikeStatus, lastPostAt, postsToday, approvalQueueCount, agentCount } = status || {}

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

      <div className="h-3 w-px bg-white/10 hidden sm:block" />

      {/* Agent count */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/40">Agents indexed</span>
        <span className="text-xs font-bold text-white">{agentCount ?? '—'}</span>
      </div>
    </div>
  )
}

// ─── Publishing Schedule ──────────────────────────────────────────────────

function PublishingSchedule({ onQueueChange }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pendingIds, setPendingIds] = useState(new Set())
  const [tick, setTick] = useState(0)

  const load = useCallback(() => {
    fetch('/api/mission-control/schedule')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed')
        setData(d)
        if (onQueueChange) onQueueChange(d.awaiting?.length || 0)
      })
      .catch((e) => setError(e.message))
  }, [onQueueChange])

  useEffect(() => {
    load()
    const dataTimer = setInterval(load, 15_000)
    const clockTimer = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => { clearInterval(dataTimer); clearInterval(clockTimer) }
  }, [load])

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
      setData((prev) => {
        if (!prev) return prev
        const awaiting = (prev.awaiting || []).filter((i) => i.id !== id)
        if (onQueueChange) onQueueChange(awaiting.length)
        return { ...prev, awaiting }
      })
    } catch (e) {
      alert(e.message)
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(`${id}:${action}`); return n })
    }
  }

  const scheduled = data?.scheduled || []
  const awaiting = data?.awaiting || []
  const nextPost = scheduled[0]

  // tick is used to force re-render so relative times update every 30s
  void tick

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Publishing Schedule</span>
        <button
          onClick={load}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}

      {data && (
        <>
          {/* Summary line */}
          <div className="px-3 py-2 border-b border-white/[0.05] bg-white/[0.015]">
            <p className="text-[11px] text-white/50">
              {'Next 24h: '}
              <span className="text-white/80 font-medium">{scheduled.length} scheduled</span>
              {' · '}
              <span className={awaiting.length > 0 ? 'text-amber-300 font-medium' : 'text-white/80 font-medium'}>
                {awaiting.length} awaiting approval
              </span>
              {nextPost && (
                <>
                  {' · '}
                  <span className="text-emerald-400">Next publish {timeUntil(nextPost.run_at)}</span>
                </>
              )}
            </p>
          </div>

          {/* ── SCHEDULED ─────────────────────────────── */}
          <div>
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">
                Scheduled
              </span>
            </div>
            {scheduled.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/30">No posts scheduled in the next 24h.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {scheduled.map((row) => {
                  const text = extractPostText(row)
                  return (
                    <div key={row.id} className="flex gap-3 px-3 py-2.5 border-l-2 border-emerald-500/40">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <PostTypeBadge type={extractPostType(row)} />
                          <span className="text-[11px] text-white/70 truncate">
                            {text.length > 100 ? text.slice(0, 100) + '…' : text}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/35">
                          {formatBudapestTime(row.run_at)}{' '}
                          <span className="text-emerald-400/70">({timeUntil(row.run_at)})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── AWAITING APPROVAL ─────────────────────── */}
          <div className="border-t border-white/[0.06]">
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${awaiting.length > 0 ? 'text-amber-400/70' : 'text-white/30'}`}>
                Awaiting Approval
              </span>
            </div>
            {awaiting.length === 0 ? (
              <div className="px-3 py-3 text-xs text-emerald-400/70">Queue is clear ✓</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {awaiting.map((row) => {
                  const approvePending = pendingIds.has(`${row.id}:approve_tweet`)
                  const rejectPending = pendingIds.has(`${row.id}:reject_tweet`)
                  const busy = approvePending || rejectPending
                  return (
                    <div key={row.id} className="px-3 py-2.5 space-y-2 border-l-2 border-amber-500/40">
                      <div className="flex items-start gap-2">
                        <PostTypeBadge type={extractPostType(row)} />
                        <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap flex-1">
                          {extractPostText(row)}
                        </p>
                      </div>
                      {row.run_at && (
                        <div className="text-[10px] text-white/35">
                          {formatBudapestTime(row.run_at)}{' '}
                          <span className="text-white/50">({timeUntil(row.run_at)})</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-0.5">
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
        </>
      )}
    </div>
  )
}

// ─── Mike's X Activity ────────────────────────────────────────────────────

function MikeActivity() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetch('/api/mission-control/activity')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); setItems(d.items || []) })
      .catch((e) => setError(e.message))
    const clockTimer = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(clockTimer)
  }, [])

  void tick

  const byType = (items || []).reduce((acc, row) => {
    const t = extractPostType(row)
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Mike&apos;s Recent Activity</span>
        {items && (
          <span className="text-[10px] text-white/30">
            {items.length} recent ·{' '}
            {Object.entries(byType).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(' · ')}
          </span>
        )}
      </div>

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!items && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}
      {items && items.length === 0 && (
        <div className="px-3 py-4 text-xs text-white/30">No published posts yet.</div>
      )}

      {items && items.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {items.map((row) => {
            const type = extractPostType(row)
            const text = extractPostText(row)
            const isRepost = type === 'REPOST'
            return (
              <div key={row.id} className="flex gap-2.5 px-3 py-2.5">
                <PostTypeBadge type={type} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className={`text-[11px] leading-relaxed truncate ${isRepost ? 'text-white/45 italic' : 'text-white/70'}`}>
                    {isRepost ? `RT: ${text}` : text}
                  </p>
                  <p className="text-[10px] text-white/25">{timeAgo(row.sent_at)}</p>
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

// ─── Scout/Judge Trigger ──────────────────────────────────────────────────

function ScoutJudgeTrigger() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  async function run() {
    setRunning(true)
    setResult(null)
    try {
      const r = await fetch('/api/mission-control/run-scout-judge', { method: 'POST' })
      const d = await r.json()
      setResult(d)
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Orchestration</span>
        <span className="text-[10px] text-white/25">manual triggers</span>
      </div>

      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={run}
            disabled={running}
            className="px-3 py-1.5 rounded border border-violet-500/40 bg-violet-500/10 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
          >
            {running ? 'Running…' : 'Run Scout/Judge Test'}
          </button>
          <span className="text-[9px] text-white/25 uppercase tracking-wide">SYNTHETIC_TEST · fixed candidate pool</span>
          {running && (
            <span className="text-[10px] text-white/30">executing runner…</span>
          )}
        </div>

        {result && (
          <div className={`rounded border px-3 py-2 space-y-1 ${result.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.ok ? '✓ Success' : '✗ Failed'}
              </span>
              {result.workflow_id && (
                <span className="text-[10px] font-mono text-white/50">{result.workflow_id}</span>
              )}
            </div>
            {!result.ok && result.error && (
              <p className="text-[10px] text-red-400/80 break-all">{result.error}</p>
            )}
            {result.ok && result.stdout && (
              <pre className="text-[9px] text-white/30 whitespace-pre-wrap break-all max-h-32 overflow-y-auto leading-relaxed">
                {result.stdout}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Workflow Traces ──────────────────────────────────────────────────────

const STATUS_STYLE = {
  completed:        'text-emerald-400',
  approved:         'text-emerald-400',
  in_progress:      'text-sky-400',
  review_required:  'text-amber-400',
  created:          'text-white/50',
  rejected:         'text-red-400',
  failed:           'text-red-400',
}

function statusStyle(s) {
  return STATUS_STYLE[s] || 'text-white/40'
}

const DATA_REALITY_STYLE = {
  REAL_RUNTIME:      'border-sky-500/30 text-sky-400/80',
  REAL_PRODUCT_STATE:'border-emerald-500/30 text-emerald-400/80',
  SYNTHETIC_TEST:    'border-white/15 text-white/30',
  MIXED:             'border-amber-500/30 text-amber-400/80',
  UNKNOWN:           'border-white/10 text-white/20',
}

function DataRealityBadge({ reality }) {
  if (!reality) return null
  const style = DATA_REALITY_STYLE[reality] || DATA_REALITY_STYLE.UNKNOWN
  const label = reality === 'REAL_RUNTIME' ? 'runtime' : reality === 'REAL_PRODUCT_STATE' ? 'product' : reality === 'SYNTHETIC_TEST' ? 'synthetic' : reality === 'MIXED' ? 'mixed' : '?'
  return (
    <span className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold tracking-wide uppercase ${style}`}>
      {label}
    </span>
  )
}

function WorkflowTraces() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetch('/api/mission-control/workflow-traces')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed')
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const workflows = data?.workflows || []
  const eventsByWorkflow = (data?.events || []).reduce((acc, ev) => {
    if (!acc[ev.workflow_id]) acc[ev.workflow_id] = []
    acc[ev.workflow_id].push(ev)
    return acc
  }, {})

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Workflow Traces</span>
        <button onClick={load} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}

      {data && workflows.length === 0 && (
        <div className="px-3 py-4 text-xs text-white/30">No workflow traces yet.</div>
      )}

      {data && workflows.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {workflows.map((wf) => {
            const events = eventsByWorkflow[wf.workflow_id] || []
            return (
              <div key={wf.workflow_id} className="px-3 py-2.5 space-y-1.5">
                {/* Workflow row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <DataRealityBadge reality={wf.data_reality} />
                  <span className="text-[11px] font-mono text-white/70 truncate">{wf.workflow_id}</span>
                  <span className={`text-[10px] font-semibold shrink-0 ${statusStyle(wf.status)}`}>{wf.status}</span>
                  <span className="text-[10px] text-white/25 ml-auto shrink-0">{timeAgo(wf.created_at)}</span>
                </div>

                {/* Status note: runtime ran but VPS did not update workflow status */}
                {wf.events_all_done && wf.data_reality === 'REAL_RUNTIME' && (
                  <div className="ml-0 text-[9px] text-amber-400/50 leading-tight">
                    runtime events done · workflow status not updated by VPS
                  </div>
                )}

                {/* Events */}
                {events.length > 0 && (
                  <div className="ml-3 space-y-1 border-l border-white/[0.06] pl-3">
                    {events.map((ev, i) => (
                      <div key={i} className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-white/35">{ev.trace_id}</span>
                        <span className="text-[10px] text-white/50">{ev.role}</span>
                        <span className="text-[10px] text-white/35">{ev.task_type}</span>
                        <span className={`text-[10px] font-medium ${statusStyle(ev.status)}`}>{ev.status}</span>
                        <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(ev.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Reviews & Outcomes ───────────────────────────────────────────────────

function ReviewsAndOutcomes() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetch('/api/mission-control/reviews-outcomes')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed')
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const reviews = data?.reviews || []
  const outcomes = data?.outcomes || []
  const allSynthetic = data?.all_synthetic ?? false

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Reviews &amp; Outcomes</span>
        <button onClick={load} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Panel-level data reality warning */}
      {data && allSynthetic && (
        <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.01]">
          <span className="text-[9px] text-white/30 uppercase tracking-wide">All entries are </span>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wide">SYNTHETIC_TEST</span>
          <span className="text-[9px] text-white/30"> — validation runs and gate tests only. No real build reviews exist yet.</span>
        </div>
      )}

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}

      {data && (
        <>
          {/* Reviews */}
          <div className="border-b border-white/[0.06]">
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Reviews</span>
            </div>
            {reviews.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/30">No reviews yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {reviews.map((r) => (
                  <div key={r.review_id} className="flex items-center gap-2 px-3 py-2 flex-wrap">
                    <DataRealityBadge reality={r.data_reality} />
                    <span className={`text-[10px] font-bold shrink-0 ${r.review_status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.review_status === 'approved' ? '✓' : '✗'} {r.review_status}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 truncate">{r.workflow_id}</span>
                    <span className="text-[10px] font-mono text-white/30 shrink-0">{r.trace_id}</span>
                    <span className="text-[10px] text-white/25 shrink-0">{r.reviewer_role}</span>
                    <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outcomes */}
          <div>
            <div className="px-3 py-1.5 border-b border-white/[0.04]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Outcomes</span>
            </div>
            {outcomes.length === 0 ? (
              <div className="px-3 py-3 text-xs text-white/30">No outcomes yet.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {outcomes.map((o, i) => (
                  <div key={i} className="px-3 py-2 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <DataRealityBadge reality={o.data_reality} />
                      <span className="text-[10px] font-mono text-white/40 truncate">{o.workflow_id}</span>
                      <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(o.created_at)}</span>
                    </div>
                    <div className="text-[10px] text-white/50 font-mono break-all">
                      {JSON.stringify(o.outcome)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Exception Queue ──────────────────────────────────────────────────────

function ExceptionQueue() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetch('/api/mission-control/exception-queue')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); setData(d) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const items = data?.items || []

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Exception Queue</span>
          {data && items.length > 0 && (
            <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400 leading-none">
              {items.length}
            </span>
          )}
        </div>
        <button onClick={load} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">↻ Refresh</button>
      </div>

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}
      {data && items.length === 0 && (
        <div className="px-3 py-3 flex items-center gap-2">
          <span className="text-xs text-emerald-400/70">No exceptions ✓</span>
          <span className="text-[9px] text-white/20 uppercase tracking-wide ml-auto">REAL_PRODUCT_STATE</span>
        </div>
      )}

      {data && items.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 flex-wrap border-l-2 border-red-500/30">
              <span className="text-[10px] rounded border border-white/10 bg-white/5 px-1 py-0.5 text-white/40 leading-none shrink-0">
                {item.type}
              </span>
              <span className="text-[10px] font-mono text-white/55 truncate">{item.workflow_id}</span>
              {item.trace_id && (
                <span className="text-[10px] font-mono text-white/30 shrink-0">{item.trace_id}</span>
              )}
              <span className="text-[10px] font-bold text-red-400 shrink-0">{item.status}</span>
              <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Approvals Visibility ─────────────────────────────────────────────────

const APPROVAL_STATUS_STYLE = {
  pending:  'text-amber-400',
  approved: 'text-emerald-400',
  merged:   'text-emerald-400',
  shipped:  'text-emerald-400',
  failed:   'text-red-400',
  rejected: 'text-red-400',
}

function BuildApprovals() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetch('/api/mission-control/build-approvals')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); setData(d) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const approvals = data?.approvals || []

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white">Build Approvals</span>
        <button onClick={load} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">↻ Refresh</button>
      </div>

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}
      {data && approvals.length === 0 && <div className="px-3 py-3 text-xs text-white/30">No build approvals yet.</div>}
      {data && approvals.length > 0 && (
        <div className="px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
          <span className="text-[9px] text-white/25">REAL_PRODUCT_STATE · last activity {approvals[0] ? timeAgo(approvals[0].created_at) : '—'} — no new approvals since Phase 4 deploy</span>
        </div>
      )}

      {data && approvals.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {approvals.map((row) => {
            const workflowId = `wf_ba_${row.id}`
            const style = APPROVAL_STATUS_STYLE[row.status] || 'text-white/40'
            return (
              <div key={row.id} className="px-3 py-2 space-y-0.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-[10px] font-bold shrink-0 ${style}`}>{row.status}</span>
                  <span className="text-[10px] text-white/50 truncate">{row.repo}{row.branch ? ` · ${row.branch}` : ''}</span>
                  <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(row.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-mono text-white/25">{workflowId}</span>
                  {row.commit_sha && (
                    <span className="text-[10px] font-mono text-white/20">{row.commit_sha.slice(0, 7)}</span>
                  )}
                  {row.approved_by && (
                    <span className="text-[10px] text-white/30">by {row.approved_by}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Claim Requests ───────────────────────────────────────────────────────

function ClaimRequests() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    fetch('/api/mission-control/claim-requests')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Failed'); setData(d) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const requests = data?.requests || []
  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Claim Requests</span>
          {data && pending.length > 0 && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 leading-none">
              {pending.length} pending
            </span>
          )}
        </div>
        <button onClick={load} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">↻ Refresh</button>
      </div>

      {data?.migration_pending && (
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <span className="text-[10px] text-amber-400/60">Migration pending — apply 20260408_1000_claim_requests.sql to activate</span>
        </div>
      )}

      {error && <div className="px-3 py-3 text-xs text-red-400">{error}</div>}
      {!data && !error && <div className="px-3 py-4 text-xs text-white/30">Loading…</div>}
      {data && requests.length === 0 && !data.migration_pending && (
        <div className="px-3 py-3 text-xs text-white/30">No claim requests yet.</div>
      )}

      {data && requests.length > 0 && (
        <div className="divide-y divide-white/[0.04]">
          {requests.map((req) => (
            <div key={req.id} className="px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-bold shrink-0 ${req.status === 'pending' ? 'text-amber-400' : req.status === 'approved' ? 'text-emerald-400' : 'text-white/30'}`}>
                  {req.status}
                </span>
                <span className="text-[10px] font-mono text-white/60">{req.agent_handle}</span>
                <span className="text-[10px] text-white/50 truncate">{req.contact}</span>
                <span className="text-[10px] text-white/20 ml-auto shrink-0">{timeAgo(req.created_at)}</span>
              </div>
              {req.note && (
                <div className="text-[10px] text-white/35 pl-0 truncate">{req.note}</div>
              )}
            </div>
          ))}
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

      {/* Section 2 — Publishing schedule */}
      <PublishingSchedule onQueueChange={handleQueueChange} />

      {/* Section 3 — Mike's X Activity */}
      <MikeActivity />

      {/* Section 4 — Pipeline health */}
      <PipelineHealthSection runs={runs} />

      {/* Section 5 — Cost tracker */}
      <CostTracker status={status} />

      {/* Section 6 — Worker activity */}
      <WorkerActivity runs={runs} loading={runsLoading} />

      {/* Section 7 — Orchestration trigger */}
      <ScoutJudgeTrigger />

      {/* Section 8 — Workflow traces */}
      <WorkflowTraces />

      {/* Section 9 — Reviews & Outcomes */}
      <ReviewsAndOutcomes />

      {/* Section 10 — Exception Queue */}
      <ExceptionQueue />

      {/* Section 11 — Build Approvals */}
      <BuildApprovals />

      {/* Section 12 — Claim Requests */}
      <ClaimRequests />
    </div>
  )
}
