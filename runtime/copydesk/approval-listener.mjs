import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

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

function normalizeToken(token) {
  return String(token || '').trim().toUpperCase()
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
    text,
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
  } catch (err) {
    console.error('alerts insert failed:', err.message)
  }
}

function parseCommand(text) {
  const trimmed = String(text || '').trim()
  const match = trimmed.match(/^(APPROVE|REJECT)\s+([A-Za-z0-9_-]+)$/i)
  if (!match) return null

  return {
    action: match[1].toUpperCase(),
    token: normalizeToken(match[2]),
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

async function handleCommand(command, rawText) {
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
      const reply = await handleCommand(command, text)
      await sendTelegramMessage(reply)
    } catch (err) {
      const errorMessage = err.message || 'Unknown approval-listener failure'

      await logRun({
        job: 'handle_command',
        status: 'error',
        meta: {
          text,
          token: command.token,
          action: command.action,
        },
        error: errorMessage,
      })

      await emitAlert({
        severity: 'error',
        code: 'approval_listener_update_failed',
        message: 'Approval listener failed to update scheduled_posts',
        meta: {
          text,
          token: command.token,
          action: command.action,
          error: errorMessage,
        },
      })

      try {
        await sendTelegramMessage(
          `Approval listener error for token ${command.token}:\n${errorMessage}`
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
