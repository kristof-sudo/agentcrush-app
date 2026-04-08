/**
 * competitor-scan.mjs — manual competitor intelligence entry tool.
 *
 * Usage: node tools/competitor-scan.mjs
 *
 * Prompts for observations on a competitor site, then inserts a structured
 * record into competitor_scans table.
 *
 * Requires: competitor_scans table (apply supabase/migrations/20260408_1500_competitor_scans.sql)
 */

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline'

const SUPABASE_URL = 'https://hwkvkfjnffxrfirhkitj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

const WATCHLIST = [
  { name: 'aiagentindex.mit.edu',   label: 'MIT AI Agent Index' },
  { name: 'aiagentsdirectory.com',  label: 'AI Agents Directory' },
  { name: 'theresanaiforthat.com',  label: "There's An AI For That" },
  { name: 'futuretools.io',         label: 'Future Tools' },
]

const RECOMMENDATIONS = ['copy', 'explore', 'watch', 'ignore']

// ── readline helpers ───────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

function askList(prompt) {
  return ask(prompt).then((v) =>
    v.trim()
      ? v.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  )
}

// ── Main ──────────────────────────────────────────────────────────────────

console.log('\n── AgentCrush Competitor Intelligence Scan ──\n')

// 1. Pick competitor
console.log('Watchlist:')
WATCHLIST.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}  (${c.label})`))
console.log('  0. Other (type manually)\n')

const pick = await ask('Select competitor [1-4 or 0]: ')
let competitor
if (pick === '0' || pick.trim() === '') {
  competitor = (await ask('Competitor domain: ')).trim()
} else {
  const idx = parseInt(pick, 10) - 1
  competitor = WATCHLIST[idx]?.name
  if (!competitor) {
    console.error('Invalid selection.')
    process.exit(1)
  }
}

console.log(`\nScanning: ${competitor}\n`)

// 2. Collect observations
const featureChanges = await askList('New features observed? (comma-separated, Enter to skip): ')
const categoryChanges = await askList('New categories or positioning? (comma-separated, Enter to skip): ')
const trustChanges = await askList('Trust/verification changes? (comma-separated, Enter to skip): ')
const monetizationSignals = await askList('Monetization signals? (comma-separated, Enter to skip): ')
const submissionChanges = await askList('Submission flow changes? (comma-separated, Enter to skip): ')
const otherChanges = await askList('Other changes? (comma-separated, Enter to skip): ')

const changes = [
  ...featureChanges,
  ...categoryChanges,
  ...submissionChanges,
  ...otherChanges,
]

const signals = [
  ...trustChanges.map((s) => `trust: ${s}`),
  ...monetizationSignals.map((s) => `monetization: ${s}`),
]

// 3. Recommendation
console.log(`\nRecommendation options: ${RECOMMENDATIONS.join(' / ')}`)
let recommendation = (await ask('Recommendation [copy/explore/watch/ignore]: ')).trim().toLowerCase()
if (!RECOMMENDATIONS.includes(recommendation)) {
  console.log('Invalid — defaulting to "watch"')
  recommendation = 'watch'
}

// 4. Notes
const notes = (await ask('Notes (optional, free text): ')).trim() || null

rl.close()

// 5. Show summary
const scan = {
  competitor,
  date: new Date().toISOString().slice(0, 10),
  changes,
  signals,
  recommendation,
  notes,
}

console.log('\n── Scan Summary ──')
console.log(JSON.stringify(scan, null, 2))

// 6. Confirm + insert
const rlConfirm = createInterface({ input: process.stdin, output: process.stdout })
const confirm = await new Promise((resolve) =>
  rlConfirm.question('\nInsert to database? [y/N]: ', resolve)
)
rlConfirm.close()

if (confirm.trim().toLowerCase() !== 'y') {
  console.log('Aborted. Nothing written.')
  process.exit(0)
}

const { error } = await db.from('competitor_scans').insert({
  competitor,
  scan_date: scan.date,
  changes,
  signals,
  recommendation,
  notes,
})

if (error) {
  console.error('\nInsert failed:', error.message)
  process.exit(1)
}

console.log('\nScan recorded.')
