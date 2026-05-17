/**
 * POST /api/agent-feedback
 *
 * Feedback channel for AI agents using AgentCrush. "Ask the agents what
 * they think" — accumulates structured signal of what real AI agents need
 * but can't currently get from AgentCrush.
 *
 * Free. No auth. Per-IP rate-limited (10/min, 50/day).
 *
 * Body schema (JSON):
 *   feedback_type: 'missing_data' | 'wrong_data' | 'methodology_question' | 'integration_friction' | 'feature_request' | 'other' (required)
 *   message: string (required, max 2000 chars)
 *   agent_handle: string (optional — which agent is the feedback about)
 *   category: 'model_family' | 'tokenized' | 'service' | 'developer' (optional)
 *   query_attempted: string (optional)
 *   client_identifier: string (optional self-id — bot name, MCP client name, etc.)
 *   contact: string (optional email/handle if reply welcomed)
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const VALID_TYPES = ['missing_data', 'wrong_data', 'methodology_question', 'integration_friction', 'feature_request', 'other']
const VALID_CATEGORIES = ['model_family', 'tokenized', 'service', 'developer']

// In-memory rate limiter (process-local)
const RATE_LIMIT_PER_MIN = 10
const RATE_LIMIT_PER_DAY = 50
const ipBuckets = new Map()  // ip → { minute: {count, windowStart}, day: {count, windowStart} }

function rateLimit(ip) {
  const now = Date.now()
  let b = ipBuckets.get(ip)
  if (!b) {
    b = {
      minute: { count: 0, windowStart: now },
      day:    { count: 0, windowStart: now },
    }
    ipBuckets.set(ip, b)
  }
  // Reset minute window
  if (now - b.minute.windowStart > 60_000) {
    b.minute.count = 0; b.minute.windowStart = now
  }
  // Reset day window
  if (now - b.day.windowStart > 86_400_000) {
    b.day.count = 0; b.day.windowStart = now
  }
  if (b.minute.count >= RATE_LIMIT_PER_MIN) return { allowed: false, reason: 'minute', retry_after: Math.ceil((60_000 - (now - b.minute.windowStart)) / 1000) }
  if (b.day.count    >= RATE_LIMIT_PER_DAY) return { allowed: false, reason: 'day', retry_after: Math.ceil((86_400_000 - (now - b.day.windowStart)) / 1000) }
  b.minute.count++; b.day.count++
  return { allowed: true }
}

function getIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
}

function hashIp(ip) {
  // Salt rotates daily for k-anonymity
  const day = new Date().toISOString().slice(0, 10)
  return crypto.createHash('sha256').update(`${ip}|${day}|agentcrush-feedback`).digest('hex')
}

function sanitizeStr(raw, maxLen) {
  if (typeof raw !== 'string') return null
  return raw.trim().slice(0, maxLen) || null
}

function sanitizeHandle(raw) {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return cleaned || null
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS })
}

export async function POST(req) {
  const ip = getIp(req)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return Response.json({
      error: 'rate_limit_exceeded',
      message: `Rate limit exceeded (${rl.reason}). Retry after ${rl.retry_after}s.`,
    }, { status: 429, headers: { ...HEADERS, 'Retry-After': String(rl.retry_after) } })
  }

  let body
  try { body = await req.json() } catch {
    return Response.json({ error: 'invalid_json', message: 'Request body must be valid JSON.' }, { status: 400, headers: HEADERS })
  }

  // Validate
  const feedback_type = body?.feedback_type
  if (!VALID_TYPES.includes(feedback_type)) {
    return Response.json({
      error: 'invalid_feedback_type',
      message: `feedback_type must be one of: ${VALID_TYPES.join(', ')}`,
      valid_types: VALID_TYPES,
    }, { status: 400, headers: HEADERS })
  }

  const message = sanitizeStr(body?.message, 2000)
  if (!message || message.length < 3) {
    return Response.json({
      error: 'invalid_message',
      message: 'message is required, 3-2000 characters.',
    }, { status: 400, headers: HEADERS })
  }

  const category = body?.category
  if (category && !VALID_CATEGORIES.includes(category)) {
    return Response.json({
      error: 'invalid_category',
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}, or omitted.`,
      valid_categories: VALID_CATEGORIES,
    }, { status: 400, headers: HEADERS })
  }

  const row = {
    feedback_type,
    message,
    agent_handle:     sanitizeHandle(body?.agent_handle),
    category:         category || null,
    query_attempted:  sanitizeStr(body?.query_attempted, 1000),
    client_identifier: sanitizeStr(body?.client_identifier, 200),
    contact:          sanitizeStr(body?.contact, 200),
    ip_hash:          hashIp(ip),
    user_agent:       sanitizeStr(req.headers.get('user-agent'), 200),
  }

  // Write
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    const { data, error } = await sb
      .from('agent_feedback')
      .insert(row)
      .select('id')
      .single()
    if (error) throw error
    return Response.json({
      ok: true,
      feedback_id: data.id,
      message: 'Feedback recorded. Thank you — this signal helps us prioritize what to build next.',
    }, { status: 201, headers: HEADERS })
  } catch (e) {
    return Response.json({
      error: 'temporary_unavailable',
      message: 'Feedback channel temporarily unavailable. Retry in a few minutes.',
    }, { status: 503, headers: HEADERS })
  }
}
