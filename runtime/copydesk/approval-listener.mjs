import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getCapSummary } from '../state/x-api-cost.mjs'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const OFFSET_FILE = '/opt/agentcrush/copydesk/approval_listener_offset.json'
const STATE_FILE = '/opt/agentcrush/state/last_telegram_update_id.json'
const REMINDER_STATE_FILE = '/opt/agentcrush/state/approval_reminders.json'
const STATUS_COOLDOWN_FILE = '/opt/agentcrush/state/status_cooldown.json'
const STATUS_COOLDOWN_MS = 5 * 60 * 1000
const TG_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const EXEC_QUEUE_DIR = '/root/agentcrush-app/ops/exec-queue'

// ── Budapest active-hours helpers ─────────────────────────────────────────
function getBudapestHour() {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Budapest',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date()).find(p => p.type === 'hour')?.value ?? '0',
    10
  )
}

function isActiveBudapestHours() {
  const h = getBudapestHour()
  return h >= 8 && h < 22
}
// ──────────────────────────────────────────────────────────────────────────

function normalizeToken(token) {
  return String(token || '').trim().toUpperCase()
}

function clip(text, max = 3500) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max - 20) + '\n...[truncated]'
}

async function readOffset() {
  let stateOffset = 0
  let legacyOffset = 0

  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8')
    stateOffset = Number(JSON.parse(raw).last_update_id || 0)
  } catch { /* file missing on first run */ }

  try {
    const raw = await fs.readFile(OFFSET_FILE, 'utf8')
    legacyOffset = Number(JSON.parse(raw).offset || 0)
  } catch { /* ignore */ }

  return Math.max(stateOffset, legacyOffset)
}

async function writeOffset(offset) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true })
  await fs.writeFile(STATE_FILE, JSON.stringify({ last_update_id: offset }, null, 2), 'utf8')
  // keep legacy file in sync so nothing that reads it goes stale
  await fs.mkdir(path.dirname(OFFSET_FILE), { recursive: true })
  await fs.writeFile(OFFSET_FILE, JSON.stringify({ offset }, null, 2), 'utf8')
}

async function sendTelegramMessage(text) {
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text: clip(text),
  }

  const res = await fetch(`${TG_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(json)}`)
  }
}

async function getUpdates(offset) {
  const url = new URL(`${TG_BASE}/getUpdates`)
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('limit', '50')
  url.searchParams.set('timeout', '0')

  const res = await fetch(url)
  const json = await res.json()

  if (!res.ok || !json.ok) {
    throw new Error(`Telegram getUpdates failed: ${JSON.stringify(json)}`)
  }

  return json.result || []
}

async function logRun({ job, status, meta = null, error = null }) {
  try {
    const { error: insertError } = await supabase
      .from('runs')
      .insert({
        runner: 'approval_listener',
        job,
        status,
        meta,
        error,
      })

    if (insertError) {
      console.error('runs insert failed:', JSON.stringify(insertError, null, 2))
    }
  } catch (err) {
    console.error('runs insert exception:', err)
  }
}

async function emitAlert({ severity = 'warning', code, message, meta = null }) {
  try {
    await supabase.from('alerts').insert({
      severity,
      code,
      message,
      meta,
    })

    const text = [
      'ALERT',
      `severity: ${severity}`,
      `code: ${code}`,
      `message: ${message}`,
      meta ? `meta: ${JSON.stringify(meta).slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await sendTelegramMessage(text)
  } catch (err) {
    console.error('alerts insert failed:', err.message)
  }
}

function parseCommand(text) {
  const trimmed = String(text || '').trim()

  let match = trimmed.match(/^(APPROVE|REJECT)\s+([A-Za-z0-9_-]+)$/i)
  if (match) {
    return {
      kind: 'approval',
      action: match[1].toUpperCase(),
      token: normalizeToken(match[2]),
    }
  }

  if (/^OPS SUMMARY$/i.test(trimmed)) return { kind: 'operator', action: 'SUMMARY' }
  if (/^OPS ALERTS$/i.test(trimmed)) return { kind: 'operator', action: 'ALERTS' }
  if (/^OPS QUEUE$/i.test(trimmed)) return { kind: 'operator', action: 'QUEUE' }
  if (/^OPS CANCEL_STALE$/i.test(trimmed)) return { kind: 'operator', action: 'CANCEL_STALE' }

  match = trimmed.match(/^OPS RESOLVE_ALERT\s+([A-Za-z0-9-]+)$/i)
  if (match) {
    return { kind: 'operator', action: 'RESOLVE_ALERT', alertId: match[1] }
  }

  match = trimmed.match(/^OPS RESCHEDULE\s+([A-Za-z0-9-]+)\s+(.+)$/i)
  if (match) {
    return {
      kind: 'operator',
      action: 'RESCHEDULE',
      postId: match[1],
      newTime: match[2].trim(),
    }
  }

  // Mobile shortcuts — no token needed
  if (/^APPROVE ALL$/i.test(trimmed)) return { kind: 'shortcut', action: 'APPROVE_ALL' }
  if (/^REJECT LAST$/i.test(trimmed)) return { kind: 'shortcut', action: 'REJECT_LAST' }
  if (/^STATUS$/i.test(trimmed)) return { kind: 'shortcut', action: 'STATUS' }

  return null
}

async function runExecCommand(command, payload = {}) {
  const requestId = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const requestPath = path.join(EXEC_QUEUE_DIR, `request_${requestId}.json`)
  const resultPath = path.join(EXEC_QUEUE_DIR, `result_${requestId}.json`)

  await fs.mkdir(EXEC_QUEUE_DIR, { recursive: true })
  await fs.writeFile(
    requestPath,
    JSON.stringify({ command, ...payload }, null, 2),
    'utf8'
  )

  for (let i = 0; i < 20; i++) {
    try {
      const raw = await fs.readFile(resultPath, 'utf8')
      const parsed = JSON.parse(raw)
      await fs.rm(resultPath, { force: true })
      return String(parsed.output || '').trim() || '[OPS] OK'
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  throw new Error(`Exec command timed out: ${command}`)
}

async function findScheduledPostByToken(token) {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select(`
      id,
      approval_token,
      status,
      approved,
      publish_ready,
      approval_requested_at,
      run_at
    `)
    .eq('approval_token', token)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function findBuildApprovalById(id) {
  const { data, error } = await supabase
    .from('build_approvals')
    .select(`
      id,
      status,
      repo,
      branch,
      commit_sha,
      approved_by,
      approved_at
    `)
    .eq('id', id)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

async function approvePost(row, token) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('scheduled_posts')
    .update({
      approved: true,
      publish_ready: true,
      approved_at: now,
      approved_by: 'telegram',
    })
    .eq('id', row.id)

  if (error) throw error

  await logRun({
    job: 'approve',
    status: 'ok',
    meta: {
      scheduled_post_id: row.id,
      token,
      run_at: row.run_at,
    },
  })

  return `Approval recorded.\nToken: ${token}\nPost ID: ${row.id}\nRun at: ${row.run_at || '—'}`
}

async function rejectPost(row, token) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('scheduled_posts')
    .update({
      approved: false,
      publish_ready: false,
      approved_at: now,
      approved_by: 'telegram',
      status: 'cancelled',
    })
    .eq('id', row.id)

  if (error) throw error

  await logRun({
    job: 'reject',
    status: 'ok',
    meta: {
      scheduled_post_id: row.id,
      token,
    },
  })

  return `Rejection recorded.\nToken: ${token}\nPost ID: ${row.id}\nStatus: cancelled`
}

async function approveBuild(build, token) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('build_approvals')
    .update({
      approved_at: now,
      approved_by: 'telegram',
      status: 'approved',
    })
    .eq('id', build.id)

  if (error) throw error

  await logRun({
    job: 'approve_build',
    status: 'ok',
    meta: {
      build_approval_id: build.id,
      token,
      branch: build.branch,
      commit_sha: build.commit_sha,
    },
  })

  return `Build approval recorded.\nID: ${build.id}\nBranch: ${build.branch}`
}

async function rejectBuild(build, token) {
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('build_approvals')
    .update({
      approved_at: now,
      approved_by: 'telegram',
      status: 'rejected',
    })
    .eq('id', build.id)

  if (error) throw error

  await logRun({
    job: 'reject_build',
    status: 'ok',
    meta: {
      build_approval_id: build.id,
      token,
      branch: build.branch,
      commit_sha: build.commit_sha,
    },
  })

  return `Build rejection recorded.\nID: ${build.id}\nBranch: ${build.branch}`
}

async function approveAll() {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, approval_token, run_at, payload')
    .eq('channel', 'x')
    .eq('status', 'queued')
    .eq('approved', false)
    .not('approval_token', 'is', null)

  if (error) throw error
  if (!data?.length) return 'No pending posts to approve.'

  for (const row of data) {
    const { error: uErr } = await supabase
      .from('scheduled_posts')
      .update({
        approved: true,
        publish_ready: true,
        approved_at: now,
        approved_by: 'telegram',
      })
      .eq('id', row.id)
    if (uErr) throw uErr
  }

  await logRun({ job: 'approve_all', status: 'ok', meta: { count: data.length } })

  const lines = [`Approved ${data.length} post${data.length === 1 ? '' : 's'}:`]
  for (const p of data) {
    const type = p.payload?.type || 'post'
    const handle = p.payload?.target_author_handle || p.payload?.target_text?.slice(0, 30) || '?'
    lines.push(`• ${type} @${handle} [${p.approval_token}]`)
  }
  return lines.join('\n')
}

async function rejectLast() {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('id, approval_token, run_at, approval_requested_at')
    .eq('channel', 'x')
    .eq('status', 'queued')
    .not('approval_requested_at', 'is', null)
    .order('approval_requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return 'No pending posts to reject.'

  const { error: uErr } = await supabase
    .from('scheduled_posts')
    .update({
      approved: false,
      publish_ready: false,
      approved_at: now,
      approved_by: 'telegram',
      status: 'cancelled',
    })
    .eq('id', data.id)
  if (uErr) throw uErr

  await logRun({ job: 'reject_last', status: 'ok', meta: { post_id: data.id, token: data.approval_token } })
  return `Rejected last approval request.\nToken: ${data.approval_token}\nPost ID: ${data.id}`
}

async function readReminderState() {
  try {
    const raw = await fs.readFile(REMINDER_STATE_FILE, 'utf8')
    const data = JSON.parse(raw)
    return typeof data.reminders === 'object' ? data.reminders : {}
  } catch {
    return {}
  }
}

async function writeReminderState(reminders) {
  await fs.mkdir(path.dirname(REMINDER_STATE_FILE), { recursive: true })
  await fs.writeFile(REMINDER_STATE_FILE, JSON.stringify({ reminders }, null, 2), 'utf8')
}

async function isStatusOnCooldown() {
  try {
    const raw = await fs.readFile(STATUS_COOLDOWN_FILE, 'utf8')
    const { last_sent } = JSON.parse(raw)
    return Date.now() - new Date(last_sent).getTime() < STATUS_COOLDOWN_MS
  } catch {
    return false
  }
}

async function markStatusSent() {
  await fs.mkdir(path.dirname(STATUS_COOLDOWN_FILE), { recursive: true })
  await fs.writeFile(STATUS_COOLDOWN_FILE, JSON.stringify({ last_sent: new Date().toISOString() }), 'utf8')
}

async function checkUrgentApprovals() {
  // Never send messages during night hours (22:00–08:00 Budapest)
  if (!isActiveBudapestHours()) return

  const now = new Date()
  const nowMs = now.getTime()
  const AUTO_APPROVE_AFTER_MS = 45 * 60 * 1000 // 45 min
  const REMIND_AFTER_MS = 30 * 60 * 1000        // 30 min

  // Fetch posts pending approval for at least 30 min
  const cutoff30Min = new Date(nowMs - REMIND_AFTER_MS).toISOString()
  const { data: pendingPosts } = await supabase
    .from('scheduled_posts')
    .select('id, run_at, approval_token, payload, approval_requested_at')
    .eq('channel', 'x')
    .eq('status', 'queued')
    .eq('approved', false)
    .not('approval_requested_at', 'is', null)
    .lte('approval_requested_at', cutoff30Min)
    .order('approval_requested_at', { ascending: true })
    .limit(10)

  if (!pendingPosts?.length) return

  const reminders = await readReminderState()

  // Prune reminder records older than 24 h
  const cutoff24h = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
  for (const [id, ts] of Object.entries(reminders)) {
    if (ts < cutoff24h) delete reminders[id]
  }

  const toRemind = []
  let autoApproved = 0

  for (const p of pendingPosts) {
    const pendingMs = nowMs - new Date(p.approval_requested_at).getTime()

    // Auto-approve at 45 min — no notification spam
    if (pendingMs >= AUTO_APPROVE_AFTER_MS) {
      try {
        await supabase
          .from('scheduled_posts')
          .update({
            approved: true,
            publish_ready: true,
            approved_at: now.toISOString(),
            approved_by: 'mission_control',
          })
          .eq('id', p.id)
        delete reminders[p.id]
        autoApproved++
        await logRun({ job: 'auto_approve', status: 'ok', meta: { post_id: p.id } })
      } catch (err) {
        console.error('auto-approve failed:', p.id, err.message)
      }
      continue
    }

    // Send ONE reminder per post at the 30–44 min mark
    if (!reminders[p.id]) {
      toRemind.push(p)
      reminders[p.id] = now.toISOString()
    }
  }

  if (toRemind.length > 0) {
    const lines = ['⏰ Reminder — auto-approves in ~15 min if no response:']
    for (const p of toRemind) {
      const type = p.payload?.type || 'x_post'
      const min = Math.round((nowMs - new Date(p.approval_requested_at).getTime()) / 60000)
      lines.push(`  • ${type} pending ${min}m — APPROVE ${p.approval_token || p.id}`)
    }
    await sendTelegramMessage(lines.join('\n'))
  }

  await writeReminderState(reminders)

  await logRun({
    job: 'urgent_approval_check',
    status: 'ok',
    meta: { reminded: toRemind.length, auto_approved: autoApproved },
  })
}

async function handleStatusCommand() {
  if (await isStatusOnCooldown()) return null

  const now = new Date()
  const todayUtc = new Date(now)
  todayUtc.setUTCHours(0, 0, 0, 0)
  // Scheduler slots start at 07:00 UTC — use 06:00 as floor to exclude midnight bulk posts
  const todayPostingFloor = new Date(todayUtc.getTime() + 6 * 3600 * 1000)
  const tomorrowStart = new Date(todayUtc.getTime() + 24 * 3600 * 1000)
  const monthStart = new Date(todayUtc)
  monthStart.setUTCDate(1)

  // All sent+queued posts since today's posting floor, with payload for type breakdown
  const { data: todayPosts } = await supabase
    .from('scheduled_posts')
    .select('id, status, payload')
    .in('status', ['sent', 'queued'])
    .eq('channel', 'x')
    .gte('run_at', todayPostingFloor.toISOString())
    .lt('run_at', tomorrowStart.toISOString())

  // Action-mix counters — sent only (published), and queued (in-flight today)
  const mixSent   = { reply: 0, quote: 0, repost: 0, original: 0 }
  const mixQueued = { reply: 0, quote: 0, repost: 0, original: 0 }
  let sentCount = 0

  for (const p of (todayPosts || [])) {
    const t = p.payload?.type || 'x_post'
    const bucket =
      t === 'x_reply'  ? 'reply'    :
      t === 'x_quote'  ? 'quote'    :
      t === 'x_repost' ? 'repost'   : 'original'

    if (p.status === 'sent') {
      mixSent[bucket] += 1
      sentCount += 1
    } else {
      mixQueued[bucket] += 1
    }
  }

  // Activity level
  const activityLevel = sentCount >= 6 ? 'HIGH' : sentCount >= 3 ? 'NORMAL' : 'QUIET'

  // Next upcoming post (run_at in the future)
  const { data: nextPosts } = await supabase
    .from('scheduled_posts')
    .select('id, run_at, publish_ready')
    .in('status', ['queued'])
    .eq('approved', true)
    .gte('run_at', now.toISOString())
    .order('run_at', { ascending: true })
    .limit(1)
  const nextPost = nextPosts?.[0]

  // Overdue: queued + publish_ready but run_at already passed
  const { data: overduePosts } = await supabase
    .from('scheduled_posts')
    .select('id, run_at')
    .eq('status', 'queued')
    .eq('publish_ready', true)
    .lt('run_at', now.toISOString())

  // Posts pending approval (queued, not yet approved)
  const { data: pendingApproval } = await supabase
    .from('scheduled_posts')
    .select('id')
    .eq('status', 'queued')
    .eq('approved', false)
    .not('approval_token', 'is', null)
  const pendingCount = pendingApproval?.length ?? 0

  // Monthly spend from copydesk_outputs
  const { data: monthOutputs } = await supabase
    .from('copydesk_outputs')
    .select('tokens_in, tokens_out')
    .gte('created_at', monthStart.toISOString())
  let monthlySpend = '—'
  if (monthOutputs?.length) {
    let inp = 0, out = 0
    for (const o of monthOutputs) { inp += o.tokens_in || 0; out += o.tokens_out || 0 }
    const cost = (inp / 1e6) * 2.50 + (out / 1e6) * 10
    monthlySpend = `~$${cost.toFixed(2)}`
  }

  // Worker health (last 24h errors)
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentErrors } = await supabase
    .from('runs')
    .select('runner, error')
    .eq('status', 'error')
    .gte('created_at', cutoff24h)
  const errorsByRunner = {}
  for (const e of (recentErrors || [])) {
    errorsByRunner[e.runner] = (errorsByRunner[e.runner] || 0) + 1
  }

  // Format next post time in Budapest
  let nextLine = 'None queued'
  if (nextPost) {
    const budTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Budapest',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(nextPost.run_at))
    nextLine = `${budTime} BUD`
  }

  const healthLines = Object.keys(errorsByRunner).length === 0
    ? ['Workers: OK']
    : Object.entries(errorsByRunner).map(([r, n]) => `FAIL ${r} ×${n}`)

  const budNow = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Budapest',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  // Action mix display: sent + (queued today in parens)
  function mixLine(label, sentN, queuedN) {
    const q = queuedN > 0 ? ` (+${queuedN} queued)` : ''
    return `  ${label}: ${sentN}${q}`
  }

  const xCap = getCapSummary()
  const xApiLine = xCap.scanner_paused
    ? `X API: $${xCap.scanner_spend_usd.toFixed(3)} scanned / $${xCap.output_reserved_usd.toFixed(2)} reserved [cap hit]`
    : `X API: $${xCap.scanner_spend_usd.toFixed(3)} scanned / $${xCap.scanner_remaining_usd.toFixed(3)} scan left / $${xCap.output_reserved_usd.toFixed(2)} reserved`

  const lines = [
    `STATUS — ${budNow} BUD`,
    '',
    `Activity: ${activityLevel}`,
    `Sent today: ${sentCount}`,
    mixLine('replies', mixSent.reply, mixQueued.reply),
    mixLine('quotes', mixSent.quote, mixQueued.quote),
    mixLine('reposts', mixSent.repost, mixQueued.repost),
    mixLine('originals', mixSent.original, mixQueued.original),
    `Next post: ${nextLine}`,
    xApiLine,
    `Monthly spend: ${monthlySpend}`,
    '',
    ...healthLines,
  ]

  if (pendingCount > 0) {
    lines.push(`Pending approval: ${pendingCount}`)
  }

  const overdueCount = overduePosts?.length ?? 0
  if (overdueCount > 0) {
    lines.push(`Overdue posts: ${overdueCount}`)
  }

  const reply = lines.join('\n')
  await markStatusSent()
  return reply
}

async function handleShortcutCommand(command) {
  switch (command.action) {
    case 'APPROVE_ALL': return approveAll()
    case 'REJECT_LAST': return rejectLast()
    case 'STATUS':      return handleStatusCommand()
    default:            return 'Unknown shortcut.'
  }
}

async function handleApprovalCommand(command, rawText) {
  const { action, token } = command

  const row = await findScheduledPostByToken(token)
  const build = !row ? await findBuildApprovalById(token) : null

  if (!row && !build) {
    await logRun({
      job: 'lookup',
      status: 'error',
      meta: { token, action, rawText },
      error: 'No scheduled_posts or build_approvals row found',
    })

    await emitAlert({
      severity: 'warning',
      code: 'approval_listener_token_not_found',
      message: 'Telegram approval token did not match any row',
      meta: { token, action, rawText },
    })

    return `No approval found for ${token}.`
  }

  if (action === 'APPROVE') {
    if (row) {
      if (row.approved === true && row.publish_ready === true) {
        return null
      }
      return approvePost(row, token)
    }

    if (build) {
      if (build.status === 'approved') {
       return null
      }
      return approveBuild(build, token)
    }
  }

  if (action === 'REJECT') {
    if (row) {
      if (row.status === 'cancelled') {
        return null
      }
      return rejectPost(row, token)
    }

    if (build) {
      if (build.status === 'rejected') {
       return null
      }
      return rejectBuild(build, token)
    }
  }

  return `Unsupported command for token ${token}.`
}

async function handleOperatorCommand(command) {
  switch (command.action) {
    case 'SUMMARY':
      return `[OPS SUMMARY]\n${await runExecCommand('founder_summary')}`
    case 'ALERTS':
      return `[OPS ALERTS]\n${await runExecCommand('alerts_summary')}`
    case 'QUEUE':
      return `[OPS QUEUE]\n${await runExecCommand('queue_summary')}`
    case 'CANCEL_STALE':
      return `[OPS CANCEL_STALE]\n${await runExecCommand('cancel_stale_queued_posts')}`
    case 'RESOLVE_ALERT':
      return `[OPS RESOLVE_ALERT]\n${await runExecCommand('resolve_alert_by_id', { alert_id: command.alertId })}`
    case 'RESCHEDULE':
      return `[OPS RESCHEDULE]\n${await runExecCommand('reschedule_post_by_id', {
        post_id: command.postId,
        new_time: command.newTime,
      })}`
    default:
      return '[OPS] Unsupported operator command.'
  }
}

async function handleAnyCommand(command, rawText) {
  if (command.kind === 'operator') {
    const reply = await handleOperatorCommand(command)

    await logRun({
      job: 'operator_command',
      status: 'ok',
      meta: { action: command.action, rawText },
    })

    return reply || '[OPS] OK'
  }

  if (command.kind === 'shortcut') {
    const reply = await handleShortcutCommand(command)

    await logRun({
      job: 'shortcut_command',
      status: 'ok',
      meta: { action: command.action, rawText },
    })

    return reply
  }

  if (command.kind === 'approval') {
    return handleApprovalCommand(command, rawText)
  }

  return 'Unsupported command.'
}

async function main() {
  await logRun({
    job: 'poll',
    status: 'ok',
    meta: { phase: 'started' },
  })

  // Proactive check: alert only when action is genuinely needed
  await checkUrgentApprovals()

  const startOffset = await readOffset()
  const updates = await getUpdates(startOffset)

  if (!updates.length) {
    await logRun({
      job: 'poll',
      status: 'ok',
      meta: { updates: 0 },
    })
    return
  }

  // Initialize to 0, not startOffset — so a corrupted high stored value can never
  // trap Math.max() and prevent the offset from advancing past actual update IDs.
  let nextOffset = 0

  for (const update of updates) {
    nextOffset = Math.max(nextOffset, Number(update.update_id) + 1)

    // Advance offset immediately — before any processing — so concurrent cron
    // instances never replay this update even if the handler is slow.
    await writeOffset(nextOffset)

    const message = update.message || update.edited_message
    const chatId = String(message?.chat?.id || '')
    const text = String(message?.text || '').trim()

    try {
      if (!text) continue
      if (TELEGRAM_CHAT_ID && chatId !== String(TELEGRAM_CHAT_ID)) continue

      const command = parseCommand(text)
      if (!command) continue

      const reply = await handleAnyCommand(command, text)
      if (reply) {
        await sendTelegramMessage(reply)
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown approval-listener failure'

      await logRun({
        job: 'handle_command',
        status: 'error',
        meta: {
          text,
          update_id: update.update_id,
        },
        error: errorMessage,
      })

      await emitAlert({
        severity: 'error',
        code: 'approval_listener_update_failed',
        message: 'Approval listener failed to execute Telegram command',
        meta: {
          text,
          update_id: update.update_id,
          error: errorMessage,
        },
      })

      try {
        await sendTelegramMessage(`Approval listener error:\n${errorMessage}`)
      } catch (sendErr) {
        console.error('Telegram error reply failed:', sendErr.message)
      }
    }
  }

  await logRun({
    job: 'poll',
    status: 'ok',
    meta: {
      updates: updates.length,
      nextOffset,
    },
  })
}

main().catch(async (err) => {
  console.error(err)

  await logRun({
    job: 'main',
    status: 'error',
    error: err.message || String(err),
  })

  await emitAlert({
    severity: 'error',
    code: 'approval_listener_crash',
    message: 'Approval listener crashed',
    meta: {
      error: err.message || String(err),
    },
  })

  process.exit(1)
})
