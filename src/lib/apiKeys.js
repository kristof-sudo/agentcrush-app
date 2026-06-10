/**
 * Pro API keys — issuance + validation.
 *
 * Key format: ac_live_<40 hex chars>. Only the SHA-256 hash is kept long-term;
 * the plaintext is stored in key_once until the buyer retrieves it via
 * /api/keys/by-session, then nulled.
 *
 * Backed by the api_keys table (migrations/20260610_1300_api_keys.sql).
 * RLS is enabled with no policies — service-role access only.
 */

import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

export function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export function generateApiKey() {
  const raw = `ac_live_${randomBytes(20).toString('hex')}`
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 15) }
}

export function hashApiKey(raw) {
  return createHash('sha256').update(raw).digest('hex')
}

export function extractApiKey(req) {
  const direct = req.headers.get('x-api-key')
  if (direct?.startsWith('ac_live_')) return direct
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ac_live_')) return auth.slice(7)
  return null
}

// 5-minute in-memory cache so the payment proxy doesn't hit Supabase on
// every premium-path request. Maps key hash → { valid, plan, expires }.
const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function validateApiKey(raw) {
  if (!raw?.startsWith('ac_live_')) return { valid: false }
  const hash = hashApiKey(raw)

  const cached = cache.get(hash)
  if (cached && cached.expires > Date.now()) return cached

  let result = { valid: false }
  try {
    const { data } = await sbAdmin()
      .from('api_keys')
      .select('id, plan, status')
      .eq('key_hash', hash)
      .maybeSingle()
    if (data?.status === 'active') {
      result = { valid: true, plan: data.plan, keyId: data.id }
      // Fire-and-forget usage stamp
      sbAdmin().from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
        .then(() => {}, () => {})
    }
  } catch {
    // Table missing or Supabase unreachable — treat as no key, never block free tier
  }

  cache.set(hash, { ...result, expires: Date.now() + CACHE_TTL_MS })
  return result
}
