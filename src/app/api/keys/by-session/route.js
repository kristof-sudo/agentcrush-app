/**
 * GET /api/keys/by-session?session_id=cs_...
 *
 * One-time API key retrieval after Stripe checkout. Returns the plaintext key
 * exactly once, then nulls it — afterwards only the prefix is shown.
 */

import { sbAdmin } from '@/lib/apiKeys'

export const runtime = 'nodejs'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) {
    return Response.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const sb = sbAdmin()
    const { data: row, error } = await sb
      .from('api_keys')
      .select('id, key_prefix, key_once, status, plan, created_at')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle()
    if (error) throw error

    if (!row) {
      // Webhook may lag checkout redirect by a few seconds
      return Response.json(
        { ready: false, message: 'Key not issued yet — retry in a few seconds.' },
        { status: 202 }
      )
    }

    if (row.key_once) {
      await sb.from('api_keys').update({ key_once: null }).eq('id', row.id)
      return Response.json({
        ready: true,
        api_key: row.key_once,
        key_prefix: row.key_prefix,
        plan: row.plan,
        note: 'Store this key now — it is shown exactly once.',
      })
    }

    return Response.json({
      ready: true,
      api_key: null,
      key_prefix: row.key_prefix,
      plan: row.plan,
      note: 'Key already retrieved. Contact contact@agentcrush.xyz to rotate it.',
    })
  } catch (e) {
    return Response.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
