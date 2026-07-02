#!/usr/bin/env node
/**
 * watchlist-alert-worker — the monitoring product's delivery arm (K10 v1).
 *
 * Hourly: for every active watch_subscription, collect index changes
 * (deaths, resurrections, rank moves, tier promotions) for its handles
 * since its last_alerted_at watermark, POST them as ONE signed payload to
 * the subscriber's webhook, advance the watermark.
 *
 * Bounded action by design (MUA): sends alerts, nothing else.
 *  - HMAC-SHA256 signature over the raw body: `x-agentcrush-signature: sha256=<hex>`
 *  - 10s timeout, redirects NOT followed, one attempt per run (the next hour retries
 *    naturally since the watermark only advances on 2xx)
 *  - 5 consecutive failures -> status='paused' (subscriber re-enables by resubscribing)
 *  - table missing (migration pending) -> exit 0 quietly
 *
 * Usage: node runtime/watchlist-alert-worker.mjs --dry-run | --write
 *        --selftest  (HMAC roundtrip + payload shape check, no network/DB)
 * Timer: hourly at :20 (ops/systemd/agentcrush-watchlist-alerts.timer)
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry-run')
const WRITE = process.argv.includes('--write')
const SELFTEST = process.argv.includes('--selftest')

for (const p of ['/opt/agentcrush/fetchers/.env', '/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}

const sign = (secret, body) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')

function buildPayload(sub, events) {
  return JSON.stringify({
    type: 'agentcrush.watchlist.alert',
    subscription_id: sub.id,
    generated_at: new Date().toISOString(),
    events: events.map((e) => ({
      change_type: e.change_type,
      handle: e.handle,
      name: e.display_name || e.handle,
      detail: e.detail || null,
      happened_at: e.happened_at,
      agent_url: `https://agentcrush.xyz/agent/${encodeURIComponent(e.handle)}`,
    })),
  })
}

if (SELFTEST) {
  const secret = 'acw_test'
  const body = buildPayload({ id: 'sub_test' }, [{ change_type: 'died', handle: 'x', happened_at: '2026-07-02T00:00:00Z' }])
  const sig = sign(secret, body)
  const check = sign(secret, body) === sig && sig.startsWith('sha256=') && JSON.parse(body).events.length === 1
  console.log(check ? '[selftest] OK — payload + HMAC roundtrip verified' : '[selftest] FAILED')
  process.exit(check ? 0 : 1)
}

if (!DRY && !WRITE) {
  console.error('Pass --dry-run or --write (or --selftest)')
  process.exit(1)
}

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: subs, error: subErr } = await sb
  .from('watch_subscriptions')
  .select('id, handles, target_url, secret, consecutive_failures, last_alerted_at')
  .eq('status', 'active')

if (subErr) {
  if (subErr.code === '42P01' || /watch_subscriptions/.test(subErr.message)) {
    console.log('[watchlist-alerts] table not present (migration pending) — nothing to do')
    process.exit(0)
  }
  console.error('[watchlist-alerts] subscription read failed:', subErr.message)
  process.exit(1)
}

if (!subs?.length) {
  console.log('[watchlist-alerts] 0 active subscriptions')
  process.exit(0)
}

let sent = 0, quiet = 0, failed = 0, paused = 0
for (const sub of subs) {
  const { data: events, error } = await sb
    .from('changes_today_v1')
    .select('change_type, handle, display_name, detail, happened_at')
    .in('handle', sub.handles)
    .gt('happened_at', sub.last_alerted_at)
    .order('happened_at', { ascending: true })
    .limit(100)
  if (error) { console.error(`[watchlist-alerts] ${sub.id} changes query failed: ${error.message}`); continue }
  if (!events?.length) { quiet++; continue }

  const body = buildPayload(sub, events)
  if (DRY) {
    console.log(`[dry-run] would POST ${events.length} event(s) to ${sub.target_url} for sub ${sub.id}`)
    sent++
    continue
  }

  let ok = false
  try {
    const res = await fetch(sub.target_url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'x-agentcrush-signature': sign(sub.secret, body),
        'User-Agent': 'AgentCrush-Watchlist/1.0',
      },
      body,
      signal: AbortSignal.timeout(10000),
    })
    ok = res.status >= 200 && res.status < 300
  } catch { ok = false }

  if (ok) {
    sent++
    await sb.from('watch_subscriptions').update({
      last_alerted_at: events[events.length - 1].happened_at,
      consecutive_failures: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id)
  } else {
    failed++
    const fails = (sub.consecutive_failures || 0) + 1
    const patch = { consecutive_failures: fails, updated_at: new Date().toISOString() }
    if (fails >= 5) { patch.status = 'paused'; paused++ }
    await sb.from('watch_subscriptions').update(patch).eq('id', sub.id)
  }
}

console.log(`[watchlist-alerts] subs=${subs.length} sent=${sent} quiet=${quiet} failed=${failed} paused=${paused}`)
