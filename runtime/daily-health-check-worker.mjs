#!/usr/bin/env node
/**
 * daily-health-check-worker.mjs — catch silent pipeline rot before it festers for days.
 *
 * Born from 2026-06-25: the brain repo sat in a stuck merge-conflict for 4 days and a
 * stale 16.2% Ghost Index figure got republished — both unnoticed. Since 2026-08-18
 * (Lighthouse Mode) this is THE single daily Telegram message: a one-liner when all is
 * well, details only when Kris needs to act. Checks, all failure modes we've actually hit:
 *   1. Failed systemd units (agentcrush-*)
 *   2. Brain repo health — clean tree, not behind origin (the stuck-conflict signature)
 *   3. Daily snapshot landed — the archive is the moat; a silent gap is unrecoverable
 *   4. Ghost Index sanity — liveness in a sane band + snapshot fresh (catches 16% regressions)
 *   5. x402 paywall alive — flagship gated endpoint answers 402 with a quote (born 2026-07-02:
 *      the CDP key rotation left Vercel without facilitator credentials and every paid
 *      endpoint 500'd for 2+ days; telemetry showed it only as gated_402 dropping to 0)
 *   6. Paid conversion (wake-up trigger T1) — the one signal worth a same-day ping
 *
 * Daily VPS timer ~07:00 UTC. Sends only via runtime/telegram-sender.mjs (private to Kris).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SENDER = join(dirname(fileURLToPath(import.meta.url)), 'telegram-sender.mjs')
const BRAIN = process.env.BRAIN_PATH || '/opt/agentcrush-brain'
const DRY = process.argv.includes('--dry-run')
for (const p of ['/opt/agentcrush/fetchers/.env', '/opt/agentcrush/scanner/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch (e) { return (e.stdout || '').toString().trim() } }
const today = new Date().toISOString().slice(0, 10)
const yday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)

const issues = []
const ok = []

// 1. failed systemd units
const failed = sh("systemctl --failed --no-legend --plain 2>/dev/null | grep agentcrush | awk '{print $1}'")
if (failed) issues.push(`Failed services:\n${failed.split('\n').map(s => '   • ' + s).join('\n')}`)
else ok.push('no failed agentcrush services')

// 2. brain repo health
if (existsSync(BRAIN)) {
  sh(`cd ${BRAIN} && git fetch --quiet 2>/dev/null`)
  const behind = sh(`cd ${BRAIN} && git rev-list --count HEAD..origin/main 2>/dev/null`) || '0'
  const dirty = sh(`cd ${BRAIN} && git status --porcelain 2>/dev/null | grep -E '^(UU|AA|DD|U |.U)' | head -3`)
  if (dirty) issues.push(`Brain repo has merge-conflict entries (the stuck-sync signature):\n${dirty}`)
  else if (Number(behind) > 20) issues.push(`Brain clone is ${behind} commits behind origin — sync may be stalled.`)
  else ok.push('brain repo synced')
} else {
  ok.push('brain path not on this host (skipped repo checks)')
}
// (Ajsa brief freshness check removed 2026-08-18 — brief producers retired at the
// 2026-07-27 Lighthouse conversion; the stale-brief warning had become a daily false alarm.)

let db = null
try { db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) }
catch (e) { issues.push(`Supabase client init failed: ${e.message}`) }

// 3. daily snapshot landed — the 02:00 UTC crontab job (NOT systemd) writes today's rows
try {
  if (!db) throw new Error('no db client')
  const { count, error } = await db.from('agent_snapshots').select('agent_id', { count: 'exact', head: true }).eq('snapshot_date', today)
  if (error) throw new Error(error.message)
  if (!count) issues.push(`Daily snapshot MISSING for ${today} — the 02:00 root-crontab job (tools/record-daily-snapshot.mjs) may have failed. The archive is the moat; diagnose today, a silent gap cannot be backfilled.`)
  else ok.unshift(`snapshots +${count} last night`)
} catch (e) { issues.push(`Snapshot check failed: ${e.message}`) }

// 4. Ghost Index sanity
try {
  if (!db) throw new Error('no db client')
  const { data } = await db.from('ghost_index_daily').select('snapshot_date, liveness_score, alive_agents, total_agents').order('snapshot_date', { ascending: false }).limit(1)
  const g = data?.[0]
  if (!g) issues.push('Ghost Index: no rows found.')
  else {
    const stale = g.snapshot_date < yday
    const insane = g.liveness_score < 30 || g.liveness_score > 95
    if (stale) issues.push(`Ghost Index snapshot stale (${g.snapshot_date}).`)
    if (insane) issues.push(`Ghost Index liveness looks wrong: ${g.liveness_score}% (expected ~50–65%). Possible regression to old broken figure.`)
    if (!stale && !insane) ok.push(`Ghost Index sane (${g.liveness_score}% alive, ${g.snapshot_date})`)
  }
} catch (e) { issues.push(`Ghost Index check failed: ${e.message}`) }

// 5. x402 paywall alive — an unauthenticated hit on a flagship paid endpoint must
// return 402 + a payment quote. 500 = facilitator/credential breakage; 200 = gate off.
try {
  const res = await fetch('https://agentcrush.xyz/api/agent/crewai/trust-summary', { redirect: 'manual' })
  if (res.status === 402) {
    // x402 v2 carries the quote base64-encoded in the payment-required header; the body is {}.
    const quote = res.headers.get('payment-required') || ''
    const body = await res.text()
    if (quote.length > 100 || body.includes('accepts') || body.includes('payTo')) ok.push('x402 paywall quoting (402)')
    else issues.push('x402 endpoint returns 402 but carries no payment quote (header or body).')
  } else {
    issues.push(`x402 paywall broken: flagship gated endpoint returned ${res.status} (expected 402). If 500: check CDP facilitator credentials on Vercel. If 200: the payment gate is off.`)
  }
} catch (e) { issues.push(`x402 paywall check failed: ${e.message}`) }

// 6. paid conversion — wake-up trigger T1: the monthly brief checks this, but the first
// real conversion ever is worth a same-day ping.
try {
  if (!db) throw new Error('no db client')
  const { data: paid } = await db.from('api_telemetry_daily').select('outcome, count').gte('day', yday).in('outcome', ['paid_pass', 'pro_pass'])
  const paidTotal = (paid || []).reduce((s, r) => s + (r.count || 0), 0)
  if (paidTotal > 0) issues.push(`🚨 PAID CONVERSION — ${paidTotal} paid/pro pass(es) since ${yday}. Wake-up trigger T1 fired: start a Claude strategy session ("AgentCrush T1 fired").`)
} catch { /* telemetry table absent = nothing to report */ }

const header = issues.length ? `⚠️ AgentCrush lighthouse — ACTION NEEDED (${issues.length})` : `🗼 Lighthouse ON — all OK`
const message = (issues.length ? issues.join('\n\n') + '\n\n— — —\n' : '') + ok.join(' · ')

if (DRY) { console.log(header + '\n' + message); process.exit(0) }
await new Promise((resolve, reject) => {
  const child = spawn('node', [SENDER, '--message', message, '--header', header], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env })
  child.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`telegram-sender exit ${c}`)))
  child.on('error', reject)
})
console.log(`[health-check] sent — ${issues.length} issues`)
