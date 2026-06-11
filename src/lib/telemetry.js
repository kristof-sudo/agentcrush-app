/**
 * telemetry.js — B13 machine-traffic telemetry.
 *
 * Fire-and-forget counters into api_telemetry_daily via the bump_api_telemetry
 * RPC. Edge-safe (plain fetch, no supabase-js) so the same helper works from
 * the x402 gate in src/proxy.js (middleware) and from node route handlers.
 *
 * Never throws, never blocks the response path: failures are swallowed and
 * the work is deferred via next/server after() when available.
 *
 * outcome vocabulary:
 *   free_200   — free endpoint served
 *   free_4xx   — free endpoint, client error
 *   gated_402  — premium endpoint quoted a price (the top of the paid funnel)
 *   paid_pass  — request carried an x402 payment and passed the gate
 *   pro_pass   — request carried a valid Pro key and skipped the gate
 *   error_5xx  — server error
 */

import { after } from 'next/server'

const AGENT_UA_HINTS = [
  'python', 'requests', 'httpx', 'aiohttp', 'axios', 'node', 'undici', 'got/',
  'curl', 'wget', 'go-http', 'okhttp', 'java/', 'ruby', 'php',
  'claude', 'gpt', 'openai', 'anthropic', 'langchain', 'llamaindex', 'autogen',
  'crewai', 'agent', 'bot', 'mcp', 'x402',
]

export function classifyUA(req) {
  try {
    const ua = (req.headers.get('user-agent') || '').toLowerCase()
    if (!ua) return 'unknown'
    if (AGENT_UA_HINTS.some((h) => ua.includes(h))) return 'agent'
    if (ua.includes('mozilla')) return 'browser'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function send(endpoint, uaClass, outcome) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return Promise.resolve()
  return fetch(`${url}/rest/v1/rpc/bump_api_telemetry`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_endpoint: endpoint, p_ua: uaClass, p_outcome: outcome }),
  }).catch(() => {})
}

/**
 * @param {string} endpoint  logical endpoint, e.g. '/api/agents/find' or '/api/mcp/v1#find_agents'
 * @param {Request} req      incoming request (for UA classification)
 * @param {string} outcome   see vocabulary above
 */
export function trackHit(endpoint, req, outcome) {
  try {
    const task = send(endpoint, classifyUA(req), outcome)
    try {
      after(task)
    } catch {
      // after() unavailable in this context — let the promise float
      void task
    }
  } catch {
    /* telemetry must never break the request */
  }
}

function sendKeyUsage(prefix, endpoint) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return Promise.resolve()
  return fetch(`${url}/rest/v1/rpc/bump_key_usage`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_prefix: prefix, p_endpoint: endpoint }),
  }).catch(() => {})
}

/**
 * B6 — per-key Pro usage. Pass the key PREFIX only (raw.slice(0, 15)).
 * Same fire-and-forget guarantees as trackHit.
 */
export function trackKeyUsage(keyPrefix, endpoint) {
  try {
    if (!keyPrefix?.startsWith('ac_live_')) return
    const task = sendKeyUsage(keyPrefix, endpoint)
    try {
      after(task)
    } catch {
      void task
    }
  } catch {
    /* never break the request */
  }
}
