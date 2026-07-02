/**
 * GET/DELETE /api/watchlist/subscribe/:id — manage a webhook subscription.
 * Auth: header `x-subscription-secret` must match the stored signing secret.
 */

import { createClient } from '@supabase/supabase-js'
import { trackHit } from '@/lib/telemetry'

export const runtime = 'nodejs'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function authed(req, context) {
  const { id } = await context.params
  const secret = req.headers.get('x-subscription-secret') || ''
  const sb = admin()
  if (!sb) return { error: Response.json({ error: 'server not configured' }, { status: 500 }) }
  const { data, error } = await sb.from('watch_subscriptions').select('id, handles, status, consecutive_failures, last_alerted_at, created_at, secret').eq('id', id).maybeSingle()
  if (error || !data) return { error: Response.json({ error: 'not found' }, { status: 404 }) }
  if (!secret || secret !== data.secret) return { error: Response.json({ error: 'invalid secret' }, { status: 403 }) }
  return { sb, sub: data }
}

export async function GET(req, context) {
  trackHit('/api/watchlist/subscribe/[id]', req, 'free_200')
  const r = await authed(req, context)
  if (r.error) return r.error
  const { secret: _omit, ...pub } = r.sub
  return Response.json(pub)
}

export async function DELETE(req, context) {
  trackHit('/api/watchlist/subscribe/[id]', req, 'free_200')
  const r = await authed(req, context)
  if (r.error) return r.error
  const { error } = await r.sb.from('watch_subscriptions').update({ status: 'revoked', updated_at: new Date().toISOString() }).eq('id', r.sub.id)
  if (error) return Response.json({ error: 'revoke failed' }, { status: 500 })
  return Response.json({ ok: true, status: 'revoked' })
}
