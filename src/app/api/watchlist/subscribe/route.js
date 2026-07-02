/**
 * POST /api/watchlist/subscribe — create a webhook alert subscription
 * (monitoring product v1 — brain Notes/2026-07-02-monitoring-product-design.md).
 *
 * Body: { handles: string[] (1-50), webhook_url: string (https only) }
 * Returns: { subscription_id, secret } — the secret is shown ONCE; it signs
 * every alert payload (HMAC-SHA256, `x-agentcrush-signature: sha256=<hex>`).
 *
 * Creation sends a signed test ping that must answer 2xx — proves the
 * receiver exists and lets the subscriber verify signatures immediately.
 *
 * Degrades gracefully while the watch_subscriptions migration is pending:
 * responds 503 { error: 'not_enabled' }.
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'node:crypto'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

const MAX_HANDLES = 50

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function signPayload(secret, body) {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

// SSRF guard: https only, no localhost/private/link-local hosts, no ports
// other than 443. Hostname-level checks only (we don't resolve DNS here);
// the worker POSTs with a strict timeout and never follows redirects.
function validateWebhookUrl(raw) {
  let u
  try {
    u = new URL(raw)
  } catch {
    return 'webhook_url is not a valid URL'
  }
  if (u.protocol !== 'https:') return 'webhook_url must be https'
  if (u.port && u.port !== '443') return 'webhook_url must use port 443'
  const h = u.hostname.toLowerCase()
  if (
    h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') // raw IPv4 / IPv6
  ) {
    return 'webhook_url must be a public hostname'
  }
  if (h.endsWith('agentcrush.xyz')) return 'webhook_url cannot point at agentcrush.xyz'
  return null
}

export async function POST(req) {
  trackHit('/api/watchlist/subscribe', req, 'free_200')
  const sb = admin()
  if (!sb) return Response.json({ error: 'server not configured' }, { status: 500 })

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  const handles = Array.isArray(body?.handles)
    ? [...new Set(body.handles.map((h) => String(h).trim().toLowerCase()).filter(Boolean))].slice(0, MAX_HANDLES)
    : []
  if (handles.length === 0) {
    return Response.json({ error: `handles must be a non-empty array (max ${MAX_HANDLES})` }, { status: 400 })
  }
  const urlError = validateWebhookUrl(body?.webhook_url)
  if (urlError) return Response.json({ error: urlError }, { status: 400 })

  const secret = 'acw_' + randomBytes(24).toString('hex')

  // Signed test ping — receiver must answer 2xx before we store anything.
  const ping = JSON.stringify({
    type: 'agentcrush.watchlist.test',
    message: 'Webhook verified. Alerts for your watched agents will arrive signed with this same secret.',
    handles,
    sent_at: new Date().toISOString(),
  })
  try {
    const res = await fetch(body.webhook_url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'x-agentcrush-signature': signPayload(secret, ping),
        'User-Agent': 'AgentCrush-Watchlist/1.0',
      },
      body: ping,
      signal: AbortSignal.timeout(8000),
    })
    if (res.status < 200 || res.status >= 300) {
      return Response.json({ error: `test ping to webhook_url returned ${res.status} (expected 2xx)` }, { status: 400 })
    }
  } catch (e) {
    return Response.json({ error: `test ping to webhook_url failed: ${e.message}` }, { status: 400 })
  }

  const { data, error } = await sb
    .from('watch_subscriptions')
    .insert({ handles, target_url: body.webhook_url, secret })
    .select('id')
    .single()

  if (error) {
    // table missing (migration pending) surfaces as a relation error
    const notEnabled = /watch_subscriptions/.test(error.message) || error.code === '42P01'
    return Response.json(
      notEnabled ? { error: 'not_enabled', detail: 'alert subscriptions are not enabled yet' } : { error: 'subscription create failed' },
      { status: notEnabled ? 503 : 500 }
    )
  }

  return Response.json({
    subscription_id: data.id,
    secret,
    note: 'Store the secret now — it is not retrievable again. Alerts are checked hourly; payloads are signed with x-agentcrush-signature (HMAC-SHA256 of the raw body).',
    manage: { delete: `DELETE /api/watchlist/subscribe/${data.id} with header x-subscription-secret` },
  })
}
