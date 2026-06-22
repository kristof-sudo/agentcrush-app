#!/usr/bin/env node
/**
 * x402-funnel-report-worker.mjs — daily Telegram report of the x402 demand funnel.
 *
 * Kris's standing daily ask: how many agents asked our paid Bazaar/trust endpoints for a
 * quote (hit the 402 + price), and how many converted (paid). Reads api_telemetry_daily:
 *   gated_402  = quote requests (agent hit a paid endpoint, got the 402 challenge/price)
 *   paid_pass  = conversions (payment completed)
 *
 * Sends to Kris via tools/telegram-sender.mjs (same path the Ajsa brief uses).
 * Daily VPS timer ~06:30 UTC (08:30 Budapest). Reports the prior full day + 7-day trend.
 *
 *   node runtime/x402-funnel-report-worker.mjs            # send
 *   node runtime/x402-funnel-report-worker.mjs --dry-run  # print, don't send
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const DRY = process.argv.includes('--dry-run')
for (const p of ['/opt/agentcrush/scanner/.env', '/opt/agentcrush/fetchers/.env', '.env.local', '.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}
const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const dayStr = (d) => new Date(d).toISOString().slice(0, 10)
const PREV = dayStr(Date.now() - 864e5)          // yesterday (last full day)
const WK_START = dayStr(Date.now() - 7 * 864e5)

const sum = (rows, pred) => (rows || []).filter(pred).reduce((s, r) => s + (r.count || 0), 0)

const run = async () => {
  const { data: prev } = await db.from('api_telemetry_daily').select('endpoint, ua_class, outcome, count').eq('day', PREV)
  const { data: wk } = await db.from('api_telemetry_daily').select('outcome, count').gte('day', WK_START)

  const quotes = sum(prev, r => r.outcome === 'gated_402')
  const paid = sum(prev, r => r.outcome === 'paid_pass')
  const qAgent = sum(prev, r => r.outcome === 'gated_402' && r.ua_class === 'agent')
  const qUnknown = sum(prev, r => r.outcome === 'gated_402' && r.ua_class === 'unknown')
  const wkQuotes = sum(wk, r => r.outcome === 'gated_402')
  const wkPaid = sum(wk, r => r.outcome === 'paid_pass')
  const rate = quotes ? ((paid / quotes) * 100).toFixed(1) : '0.0'

  const byEnd = {}
  for (const r of (prev || [])) if (r.outcome === 'gated_402') byEnd[r.endpoint] = (byEnd[r.endpoint] || 0) + r.count
  const top = Object.entries(byEnd).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const lines = [
    `*Quote requests* (agents hit a paid endpoint → priced): *${quotes.toLocaleString()}*`,
    `   ↳ agent ${qAgent.toLocaleString()} · unknown ${qUnknown.toLocaleString()}`,
    `*Conversions* (paid): *${paid.toLocaleString()}*  →  ${rate}%`,
    `7-day: ${wkQuotes.toLocaleString()} quotes · ${wkPaid.toLocaleString()} paid`,
    '',
    'Top-quoted endpoints:',
    ...top.map(([e, n]) => `• ${n} — ${e}`),
  ]
  if (paid === 0 && quotes > 0) lines.push('', '⚠️ 0 conversions — demand is real, the paywall isn\'t converting. Worth a diagnosis.')

  const message = lines.join('\n')
  const header = `📊 x402 funnel — ${PREV}`

  if (DRY) { console.log(header + '\n' + message); return }

  await new Promise((resolve, reject) => {
    const child = spawn('node', ['/opt/agentcrush/tools/telegram-sender.mjs', '--message', message, '--header', header], { stdio: ['ignore', 'inherit', 'inherit'], env: process.env })
    child.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`telegram-sender exit ${c}`)))
    child.on('error', reject)
  })
  console.log(`[x402-funnel] sent report for ${PREV}`)
}
run().catch(e => { console.error('[x402-funnel] FATAL', e.message); process.exit(1) })
