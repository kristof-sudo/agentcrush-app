#!/usr/bin/env node
/**
 * daily-health-check-worker.mjs — catch silent pipeline rot before it festers for days.
 *
 * Born from 2026-06-25: the brain repo sat in a stuck merge-conflict for 4 days, so Ajsa
 * briefs never reached GitHub; and a stale 16.2% Ghost Index figure got republished. Both
 * went unnoticed. This runs daily and Telegrams Kris a ✅/⚠️ report covering the failure
 * modes we've actually hit:
 *   1. Failed systemd units (agentcrush-*)
 *   2. Brain repo health — clean tree, not behind origin (the stuck-conflict signature)
 *   3. Ajsa brief freshness — today's/yesterday's brief committed to the brain
 *   4. Ghost Index sanity — liveness in a sane band + snapshot fresh (catches 16% regressions)
 *
 * Daily VPS timer ~07:00 UTC. Sends only via runtime/telegram-sender.mjs (private to Kris).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
  else ok.push('brain repo clean + synced')

  // 3. Ajsa brief freshness
  const briefDir = `${BRAIN}/Agents/ajsa/output`
  const briefs = existsSync(briefDir) ? readdirSync(briefDir).filter(f => f.startsWith('social-brief-')).sort() : []
  const latestBrief = briefs[briefs.length - 1] || '(none)'
  if (!latestBrief.includes(today) && !latestBrief.includes(yday)) issues.push(`Ajsa brief stale — latest is ${latestBrief} (expected ${today}). The morning-brief worker may be failing or not pushing.`)
  else ok.push(`Ajsa brief fresh (${latestBrief})`)
} else {
  ok.push('brain path not on this host (skipped repo checks)')
}

// 4. Ghost Index sanity
try {
  const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
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

const header = issues.length ? `⚠️ AgentCrush health — ${issues.length} issue(s)` : `✅ AgentCrush health — all clear`
const message = (issues.length ? issues.join('\n\n') + '\n\n— — —\n' : '') + 'OK: ' + ok.join(' · ')

if (DRY) { console.log(header + '\n' + message); process.exit(0) }
await new Promise((resolve, reject) => {
  const child = spawn('node', [SENDER, '--message', message, '--header', header], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env })
  child.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`telegram-sender exit ${c}`)))
  child.on('error', reject)
})
console.log(`[health-check] sent — ${issues.length} issues`)
