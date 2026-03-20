import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

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
const TG_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const REPO_DIR = '/root/agentcrush-app'

function normalizeToken(token) {
  return String(token || '').trim().toUpperCase()
}

function clip(text, max = 3500) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max - 20) + '\n...[truncated]'
}

async function readOffset() {
  try {
    const raw = await fs.readFile(OFFSET_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Number(parsed.offset || 0)
  } catch {
    return 0
  }
}

async function writeOffset(offset) {
  const dir = path.dirname(OFFSET_FILE)
  await fs.mkdir(dir, { recursive: true })
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

if (/^OPS SUMMARY$/i.test(trimmed)) {
  return { kind: 'operator', action: 'SUMMARY' }
}

if (/^OPS HEALTH$/i.test(trimmed)) {
  return { kind: 'operator', action: 'HEALTH' }
}

if (/^OPS QUEUE$/i.test(trimmed)) {
  return { kind: 'operator', action: 'QUEUE' }
}

if (/^OPS ALERTS$/i.test(trimmed)) {
  return { kind: 'operator', action: 'ALERTS' }
}

if (/^OPS CANCEL_STALE$/i.test(trimmed)) {
  return { kind: 'operator', action: 'CANCEL_STALE' }
}

match = trimmed.match(/^OPS RESOLVE_ALERT\s+([A-Za-z0-9-]+)$/i)
  if (match) {
    return {
      kind: 'operator',
      action: 'RESOLVE_ALERT',
      alertId: match[1],
    }
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

  return null
}

async function runRepoCommand(file, args = [], extraEnv = {}) {
  const { stdout, stderr } = await execFileAsync(file, args, {
    cwd: REPO_DIR,
    env: { ...process.env, ...extraEnv },
    maxBuffer: 1024 * 1024,
  })
  return (stdout || stderr || '').trim()
}

function formatAlertsSummary(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return raw
  }

  const alerts = parsed?.result?.open_alerts || []
  if (!alerts.length) return 'Open alerts: 0'

  const lines = [`Open alerts: ${alerts.length}`]
  for (const a of alerts.slice(0, 5)) {
    lines.push(`- ${a.code} | ${a.severity} | ${a.created_at}`)
  }
  if (alerts.length > 5) {
    lines.push(`- ...and ${alerts.length - 5} more`)
  }
  return lines.join('\n')
}

function formatQueueSummary(queueRaw, interactionRaw = null) {
  let queueParsed
  let interactionParsed

  try {
    queueParsed = JSON.parse(queueRaw)
  } catch {
    return queueRaw
  }

  try {
    interactionParsed = interactionRaw ? JSON.parse(interactionRaw) : null
  } catch {
    interactionParsed = null
  }

  const rows = queueParsed?.result?.recent_rows || []
  const queued = rows.filter(r => r.status === 'queued').length
  const waitingApproval = rows.filter(r => r.approved === false && r.status !== 'cancelled').length
  const sent = rows.filter(r => r.status === 'sent').length
  const cancelled = rows.filter(r => r.status === 'cancelled').length

  const interactionRows = interactionParsed?.result?.recent_rows || []
  const replyCount = interactionRows.filter(r => r.action_type === 'x_reply').length
  const quoteCount = interactionRows.filter(r => r.action_type === 'x_quote').length
  const repostCount = interactionRows.filter(r => r.action_type === 'x_repost').length
  const roundupCount = interactionRows.filter(r => r.action_type === 'roundup_candidate').length

  const lines = [
    'Queue snapshot',
    `- queued: ${queued}`,
    `- waiting approval: ${waitingApproval}`,
    `- sent in window: ${sent}`,
    `- cancelled in window: ${cancelled}`,
    '',
    'Recent interaction mix',
    `- replies: ${replyCount}`,
    `- quotes: ${quoteCount}`,
    `- reposts: ${repostCount}`,
    `- roundups: ${roundupCount}`,
  ]

  return lines.join('\n')
}

async function handleOperatorCommand(command) {
  switch (command.action) {
    case 'SUMMARY':
      return runRepoCommand('bash', ['ops/founder-summary.sh'])

    case 'HEALTH':
      return runRepoCommand('bash', ['ops/health-check.sh'])

case 'QUEUE': {
  const queueRaw = await runRepoCommand('python3', ['tools/agentcrush-supabase.py', 'scheduled_posts_summary'])
  const interactionRaw = await runRepoCommand('python3', ['tools/agentcrush-supabase.py', 'interaction_jobs_summary'])
  return `[OPS QUEUE]\n${formatQueueSummary(queueRaw, interactionRaw)}`
}

case 'ALERTS': {
  const raw = await runRepoCommand('python3', ['tools/agentcrush-supabase.py', 'alerts_open'])
  return formatAlertsSummary(raw)
}

    case 'CANCEL_STALE':
      return runRepoCommand('python3', ['tools/agentcrush-supabase.py', 'cancel_stale_queued_posts'])

    case 'RESOLVE_ALERT':
      return runRepoCommand(
        'python3',
        ['tools/agentcrush-supabase.py', 'resolve_alert_by_id'],
        { AC_SUPABASE_ALERT_ID: command.alertId }
      )

    case 'RESCHEDULE':
      return runRepoCommand(
        'python3',
        ['tools/agentcrush-supabase.py', 'reschedule_post_by_id'],
        {
          AC_SUPABASE_POST_ID: command.postId,
          AC_SUPABASE_NEW_TIME: command.newTime,
        }
      )

    default:
      return 'Unsupported operator command.'
  }
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

async function handleApprovalCommand(command, rawText) {
  const { action, token } = command

  const row = await findScheduledPostByToken(token)

  if (!row) {
    await logRun({
      job: 'lookup',
      status: 'error',
      meta: { token, action, rawText },
      error: 'No scheduled_posts row found for token',
    })

    await emitAlert({
      severity: 'warning',
      code: 'approval_listener_token_not_found',
      message: 'Telegram approval token did not match any scheduled_posts row',
      meta: { token, action, rawText },
    })

    return `No queued post found for token ${token}.`
  }

  if (action === 'APPROVE') {
    if (row.approved === true && row.publish_ready === true) {
      return `Token ${token} was already approved.`
    }
    return approvePost(row, token)
  }

  if (action === 'REJECT') {
    if (row.status === 'cancelled') {
      return `Token ${token} was already rejected/cancelled.`
    }
    return rejectPost(row, token)
  }

  return `Unsupported command for token ${token}.`
}

async function handleAnyCommand(command, rawText) {
  if (command.kind === 'operator') {
    const reply = await handleOperatorCommand(command)

    await logRun({
      job: 'operator_command',
      status: 'ok',
      meta: {
        action: command.action,
        rawText,
      },
    })

    // HARD RETURN: no narrative, no Mike, no wrapping
    return reply || '[OPS] OK'
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

  let nextOffset = startOffset

  for (const update of updates) {
    nextOffset = Math.max(nextOffset, Number(update.update_id) + 1)

    const message = update.message || update.edited_message
    const chatId = String(message?.chat?.id || '')
    const text = String(message?.text || '').trim()

    if (!text) continue

    if (TELEGRAM_CHAT_ID && chatId !== String(TELEGRAM_CHAT_ID)) {
      continue
    }

    const command = parseCommand(text)
    if (!command) continue

    try {
      const reply = await handleAnyCommand(command, text)
      await sendTelegramMessage(reply)
    } catch (err) {
      const errorMessage = err.message || 'Unknown approval-listener failure'

      await logRun({
        job: 'handle_command',
        status: 'error',
        meta: {
          text,
          command,
        },
        error: errorMessage,
      })

      await emitAlert({
        severity: 'error',
        code: 'approval_listener_update_failed',
        message: 'Approval listener failed to execute Telegram command',
        meta: {
          text,
          command,
          error: errorMessage,
        },
      })

      try {
        await sendTelegramMessage(
          `Approval listener error:\n${errorMessage}`
        )
      } catch (sendErr) {
        console.error('Telegram error reply failed:', sendErr.message)
      }
    }
  }

  await writeOffset(nextOffset)

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
