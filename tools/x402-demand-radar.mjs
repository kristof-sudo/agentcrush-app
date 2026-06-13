/**
 * x402-demand-radar.mjs — find the operators who already spend (and earn) via x402.
 *
 * Pulls the LIVE Coinbase CDP Bazaar discovery index (public, no auth), aggregates
 * by host into "funded operators", ranks by unique paying wallets, keeps only those
 * active within --days, and cross-references our own index so each row is tagged
 * NOT_INDEXED / unclaimed / claimed. This is the qualified-buyer list for outreach
 * (B19 demand radar) — operators with real paying customers are the warmest Pro/claim
 * targets, and the unindexed ones are also a coverage gap.
 *
 * Reads live from CDP on purpose: our bazaar_resources mirror lags when the VPS
 * adapter isn't scheduled, and outreach must use current numbers.
 *
 * Usage:
 *   node tools/x402-demand-radar.mjs                 # top 25 active funded operators, table
 *   node tools/x402-demand-radar.mjs --days 14 --top 40
 *   node tools/x402-demand-radar.mjs --json          # machine-readable (for the weekly batch)
 *
 * Index cross-ref needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same env conventions
 * as the other tools); without them it still runs and marks index status "unknown".
 *
 * No writes. No scoring impact. Pure read + rank.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// ── env (optional — only for the index cross-ref) ──────────────────────────
function loadEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) return
  for (const p of ['.env.local', '.env', '/opt/agentcrush/fetchers/.env']) {
    try {
      for (const line of readFileSync(new URL(`../${p}`, import.meta.url).pathname, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* try /opt path */ }
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* next */ }
  }
}
loadEnv()

// ── args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const argVal = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i + 1] ? args[i + 1] : def }
const DAYS = parseInt(argVal('--days', '14'), 10)
const TOP = parseInt(argVal('--top', '25'), 10)
const JSON_OUT = args.includes('--json')

const ENDPOINT = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources'
const hostOf = (u) => { try { return new URL(u).host } catch { return String(u).slice(0, 50) } }

// ── 1. fetch the full live Bazaar index ─────────────────────────────────────
async function fetchAll() {
  let offset = 0, total = null
  const all = []
  for (;;) {
    const res = await fetch(`${ENDPOINT}?limit=1000&offset=${offset}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`CDP Bazaar HTTP ${res.status}`)
    const body = await res.json()
    const items = body.items || []
    all.push(...items)
    total = body.pagination?.total ?? total
    offset += items.length
    if (!items.length || (total != null && offset >= total)) break
  }
  return all
}

// ── 2. aggregate into funded operators (by host) ────────────────────────────
function rankOperators(items) {
  const cutoff = Date.now() - DAYS * 86400000
  const byHost = {}
  for (const r of items) {
    const q = r.quality || {}
    const payers = +(q.l30DaysUniquePayers || 0)
    const calls = +(q.l30DaysTotalCalls || 0)
    const last = q.lastCalledAt ? Date.parse(q.lastCalledAt) : 0
    if (payers <= 0 || last < cutoff) continue
    const h = hostOf(r.resource)
    const o = (byHost[h] ||= { host: h, name: r.serviceName || null, peak_payers: 0, calls_30d: 0, resources: 0, last_called: 0, tags: new Set() })
    o.peak_payers = Math.max(o.peak_payers, payers) // payers can't be summed (same wallet across endpoints)
    o.calls_30d += calls
    o.resources += 1
    o.last_called = Math.max(o.last_called, last)
    if (!o.name && r.serviceName) o.name = r.serviceName
    for (const t of (r.tags || [])) o.tags.add(t)
  }
  return Object.values(byHost)
    .map((o) => ({ ...o, tags: [...o.tags].slice(0, 6), last_called: new Date(o.last_called).toISOString().slice(0, 10) }))
    .sort((a, b) => b.peak_payers - a.peak_payers)
    .slice(0, TOP)
}

// ── 3. cross-reference our index ────────────────────────────────────────────
async function tagIndexStatus(operators) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return operators.map((o) => ({ ...o, index_status: 'unknown' }))
  const db = createClient(url, key)
  const out = []
  for (const o of operators) {
    // Match on the registrable-domain label (second-to-last host segment): e.g.
    // "onesource" from skills.onesource.io, "ottoai" from x402.ottoai.services,
    // "exa" from api.exa.ai. Far fewer false positives than stripping a fixed prefix.
    const parts = o.host.split('.')
    const token = (parts.length >= 2 ? parts[parts.length - 2] : parts[0]).slice(0, 24)
    let status = 'NOT_INDEXED'
    try {
      const { data } = await db.from('agents').select('handle,claim_status').or(`handle.ilike.%${token}%,display_name.ilike.%${token}%`).limit(1)
      if (data && data.length) status = data[0].claim_status === 'claimed' ? `claimed:${data[0].handle}` : `unclaimed:${data[0].handle}`
    } catch { status = 'unknown' }
    out.push({ ...o, index_status: status })
  }
  return out
}

// ── run ──────────────────────────────────────────────────────────────────
const items = await fetchAll()
const ranked = await tagIndexStatus(rankOperators(items))

if (JSON_OUT) {
  console.log(JSON.stringify({ generated_at_days_window: DAYS, fetched: items.length, operators: ranked }, null, 2))
} else {
  console.log(`x402 demand radar — ${ranked.length} funded operators active within ${DAYS}d (of ${items.length} resources scanned)\n`)
  console.log('  # | payers | 30d calls | res | last       | index            | host')
  ranked.forEach((o, i) => {
    console.log(
      `${String(i + 1).padStart(3)} | ${String(o.peak_payers).padStart(6)} | ${String(o.calls_30d).padStart(9)} | ${String(o.resources).padStart(3)} | ${o.last_called} | ${String(o.index_status).slice(0, 16).padEnd(16)} | ${o.host}${o.name ? ` (${o.name})` : ''}`
    )
  })
  const notIndexed = ranked.filter((o) => o.index_status === 'NOT_INDEXED').length
  console.log(`\n${notIndexed}/${ranked.length} top funded operators are NOT on our index — coverage gap + warm outreach list.`)
}
