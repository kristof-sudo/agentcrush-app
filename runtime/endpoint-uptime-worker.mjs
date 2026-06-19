#!/usr/bin/env node
/**
 * endpoint-uptime-worker.mjs — RUNTIME liveness (the 3rd family: code/economic/runtime).
 *
 * HTTP-checks each agent's live endpoint, logs every check to endpoint_checks, and rolls
 * up uptime %, p50 latency, and current up/down onto the agent row. A 402/401/403/404 =
 * UP (server reachable, just gated/missing-path); only 5xx / timeout / DNS-fail = DOWN.
 *
 * Endpoint source: agents with a real (non-github / non-hf) website_url. Skips archived.
 *
 * Requires migration 20260619_1200_endpoint_uptime.sql. Idempotent. Polite (capped
 * concurrency, per-host timeout). Designed for an hourly/daily VPS timer.
 *
 *   node runtime/endpoint-uptime-worker.mjs --dry-run [--limit N]
 *   node runtime/endpoint-uptime-worker.mjs --write   [--limit N]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')
const limIdx = process.argv.indexOf('--limit')
const LIMIT = limIdx !== -1 ? parseInt(process.argv[limIdx + 1], 10) : Infinity
if (!WRITE && !process.argv.includes('--dry-run')) { console.error('Pass --dry-run or --write'); process.exit(1) }

for (const p of ['/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TIMEOUT_MS = 8000
const CONCURRENCY = 12
const isReal = (u) => u && /^https?:\/\//i.test(u) && !/github\.com|huggingface\.co/i.test(u)

async function pageAll(table, columns, filterFn) {
  let out = [], from = 0
  for (;;) {
    let q = db.from(table).select(columns).range(from, from + 999)
    if (filterFn) q = filterFn(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out = out.concat(data); if (data.length < 1000) break; from += 1000
  }
  return out
}

async function checkOne(url) {
  const t0 = Date.now()
  try {
    const ctl = new AbortController()
    const to = setTimeout(() => ctl.abort(), TIMEOUT_MS)
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'AgentCrush-Uptime/1.0 (+https://agentcrush.xyz)' } })
    clearTimeout(to)
    return { ok: r.status < 500, status_code: r.status, latency_ms: Date.now() - t0, error: null }
  } catch (e) {
    return { ok: false, status_code: null, latency_ms: Date.now() - t0, error: (e?.name || String(e)).slice(0, 60) }
  }
}

// run an array of async thunks with bounded concurrency
async function pool(items, n, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) }
  }))
  return out
}

const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }

const run = async () => {
  let agents = await pageAll('agents', 'id, handle, website_url', q => q.neq('tier', 'archived').not('website_url', 'is', null))
  agents = agents.filter(a => isReal(a.website_url))
  if (Number.isFinite(LIMIT)) agents = agents.slice(0, LIMIT)
  console.log(`[uptime] ${WRITE ? 'WRITE' : 'DRY'} | checking ${agents.length} agent endpoints (concurrency ${CONCURRENCY})`)

  let up = 0, down = 0
  const results = await pool(agents, CONCURRENCY, async (a) => {
    const res = await checkOne(a.website_url)
    res.ok ? up++ : down++
    return { a, res }
  })

  if (!WRITE) {
    console.log(`[uptime] DRY result: ${up} up / ${down} down`)
    for (const { a, res } of results.slice(0, 15)) console.log(`   ${res.ok ? 'UP  ' : 'DOWN'} ${res.status_code ?? '-'} ${res.latency_ms}ms ${a.handle} ${res.error || ''}`)
    return
  }

  const now = new Date().toISOString()
  // 1) append check rows
  const rows = results.map(({ a, res }) => ({ agent_id: a.id, endpoint_url: a.website_url, source: 'agent_website', ok: res.ok, status_code: res.status_code, latency_ms: res.latency_ms, error: res.error }))
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from('endpoint_checks').insert(rows.slice(i, i + 500))
    if (error) console.error(`  insert err: ${error.message}`)
  }

  // 2) roll up per agent from the last 30d of checks
  for (const { a, res } of results) {
    const { data: hist } = await db.from('endpoint_checks').select('ok, latency_ms, checked_at').eq('agent_id', a.id).gt('checked_at', new Date(Date.now() - 30 * 864e5).toISOString())
    const h = hist || []
    const in7 = h.filter(c => Date.parse(c.checked_at) > Date.now() - 7 * 864e5)
    const pct = (arr) => arr.length ? Math.round((arr.filter(c => c.ok).length / arr.length) * 1000) / 10 : null
    const upd = {
      endpoint_url: a.website_url,
      endpoint_status: res.ok ? 'up' : 'down',
      endpoint_uptime_7d: pct(in7),
      endpoint_uptime_30d: pct(h),
      endpoint_p50_latency_ms: median(h.filter(c => c.ok).map(c => c.latency_ms)),
      endpoint_last_ok_at: res.ok ? now : (h.filter(c => c.ok).sort((x, y) => Date.parse(y.checked_at) - Date.parse(x.checked_at))[0]?.checked_at ?? null),
      endpoint_checked_at: now,
    }
    const { error } = await db.from('agents').update(upd).eq('id', a.id)
    if (error) console.error(`  rollup err ${a.handle}: ${error.message}`)
  }
  console.log(`[uptime] wrote ${rows.length} checks + rolled up ${results.length} agents — ${up} up / ${down} down`)
}

run().catch(e => { console.error('[uptime] FATAL', e.message); process.exit(1) })
