/**
 * agent-promoter-worker.mjs — automated index growth.
 *
 * Runs the three Kris-approved promoter scripts in --write on a daily cadence,
 * so the curated `agents` index grows continuously from the fresh source mirrors
 * (virtuals_agents, agentverse_agents, A2A discovery) instead of in manual batches.
 *
 * Promotion criteria live in the individual scripts (strict, Kris-approved):
 *   - Virtuals  → tier 'virtuals_economic'  (AVAILABLE, holders>5000, vol24h>$10k, age>30d)
 *   - Agentverse→ tier 'agentverse_service' (responsive, interactions>50, rating>0, age>14d)
 *   - A2A repos → developer track, tier 'indexed' (signal_strength >= 60)
 * Promoted ecosystem agents stay OUT of the core /rankings view by design
 * (separate tiers/surfaces) — see migration 20260514_1819.
 *
 * Each script is idempotent (dedupes via source-id columns), so re-running is safe.
 * A --max cap is passed as a runaway backstop. Best-effort: one failing promoter
 * does not block the others; the worker still exits 0 unless all fail.
 *
 * Scheduling (VPS systemd timer, daily ~06:30 UTC — after the 05:03/05:33 mirror syncs):
 *   ops/systemd/agentcrush-agent-promoter.{service,timer}
 *
 * Cost: 0 LLM calls. Pure DB reads + bounded inserts. Sends a one-line Telegram summary.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileP = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')

// Load env so the Telegram summary works under plain timer context.
function loadEnv() {
  if (process.env.TELEGRAM_BOT_TOKEN) return
  for (const p of ['/opt/agentcrush/selector/.env', path.join(REPO, '.env.local')]) {
    try {
      for (const line of readFileSync(p, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* next */ }
  }
}
loadEnv()

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '')
const MAX = process.env.PROMOTER_MAX || '200' // runaway backstop per source

const PROMOTERS = [
  { key: 'virtuals',   script: 'scripts/promote-virtuals-to-agents.mjs' },
  { key: 'agentverse', script: 'scripts/promote-agentverse-to-agents.mjs' },
  { key: 'a2a',        script: 'scripts/promote-a2a-to-agents.mjs' },
]

async function tg(text) {
  if (!TOKEN || !CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  }).catch(() => {})
}

// Pull the "promoted N" / "wrote N" count out of a promoter's stdout, best-effort.
function parsePromoted(out) {
  const m =
    out.match(/promoted[^0-9]*(\d+)/i) ||
    out.match(/wrote[^0-9]*(\d+)/i) ||
    out.match(/inserted[^0-9]*(\d+)/i) ||
    out.match(/(\d+)\s+(?:new|promoted)/i)
  return m ? parseInt(m[1], 10) : null
}

console.log(`[promoter] start ${new Date().toISOString()}`)
const results = []
let anyOk = false

for (const { key, script } of PROMOTERS) {
  try {
    const { stdout } = await execFileP('node', [path.join(REPO, script), '--write', '--max', MAX], {
      cwd: REPO,
      timeout: 5 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024,
    })
    const n = parsePromoted(stdout)
    results.push(`${key}:${n ?? '?'}`)
    anyOk = true
    console.log(`[promoter] ${key} ok — promoted ${n ?? '?'}\n${stdout.split('\n').slice(-4).join('\n')}`)
  } catch (e) {
    results.push(`${key}:ERR`)
    console.error(`[promoter] ${key} FAILED: ${e?.shortMessage || e?.message || e}`)
  }
}

const summary = `🌱 Agent promoter ${new Date().toISOString().slice(0, 10)}: ${results.join(' · ')}`
console.log(`[promoter] ${summary}`)
await tg(summary)

process.exit(anyOk ? 0 : 1)
