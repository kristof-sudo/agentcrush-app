/**
 * Weekly Digest generator — Phase R-3.1
 *
 * Runs Sundays 19:00 UTC (21:00 Budapest). Steps:
 *   1. Determine current ISO week.
 *   2. Read the 7 Ajsa daily briefs for the week from
 *      <BRAIN_PATH>/Agents/ajsa/output/social-brief-{date}.md
 *   3. Call Anthropic Haiku 4.5 to distill 2-3 paragraphs of "Ecosystem this week"
 *      — focused on what's hot on AI X + Farcaster across the 7 days, NOT a
 *      retread of any single day's brief. Cluster recurring themes, quote
 *      concrete URLs sparingly.
 *   4. Write to TWO destinations:
 *      • Supabase weekly_digest_sections (UPSERT) — read by /weekly/[week] page at request time
 *      • Brain: Agents/weekly-digest/output/W{n}-{year}-ecosystem.md (audit trail)
 *   5. Commit + push brain. Telegram failure alert on error.
 *
 * Requires migration applied: migrations/20260606_2200_weekly_digest_sections.sql
 *
 * Usage:
 *   node weekly-digest-generator.mjs                 # current week
 *   node weekly-digest-generator.mjs --week 2026-W23 # explicit
 *   node weekly-digest-generator.mjs --dry-run       # write nowhere
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForced = args.includes('--force')
const explicitWeek = (() => {
  const i = args.indexOf('--week')
  return i !== -1 ? args[i + 1] : null
})()

// ── Env ───────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!ANTHROPIC_API_KEY) {
  console.error('[weekly-digest] FATAL: ANTHROPIC_API_KEY not set')
  process.exit(2)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[weekly-digest] FATAL: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(2)
}

const MODEL = 'claude-haiku-4-5'
const MAX_TOKENS = 2000

// ── ISO week helpers (inlined to keep worker self-contained) ─────────────────

function currentIsoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function parseWeekId(id) {
  const m = String(id || '').match(/^(\d{4})-W(\d{1,2})$/)
  if (!m) return null
  return { year: Number(m[1]), week: Number(m[2]) }
}

function formatWeekId(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`
}

function isoWeekStart(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Mon = new Date(Date.UTC(year, 0, 4 - jan4Day + 1))
  const target = new Date(week1Mon)
  target.setUTCDate(target.getUTCDate() + (week - 1) * 7)
  return target
}

function isoWeekDates(year, week) {
  const start = isoWeekStart(year, week)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

// ── Inputs ────────────────────────────────────────────────────────────────────

async function readBrief(date) {
  const p = path.join(BRAIN_PATH, 'Agents', 'ajsa', 'output', `social-brief-${date}.md`)
  try { return await fs.readFile(p, 'utf-8') }
  catch { return null }
}

async function gatherBriefs(year, week) {
  const dates = isoWeekDates(year, week)
  const briefs = []
  for (const d of dates) {
    const body = await readBrief(d)
    if (body) briefs.push({ date: d, body })
  }
  return briefs
}

// ── Anthropic call ────────────────────────────────────────────────────────────

let lastUsage = { input_tokens: null, output_tokens: null }

async function distill(briefs, year, week) {
  if (briefs.length === 0) {
    return '_(No Ajsa briefs found for this week — Ecosystem section will be empty until briefs accumulate.)_'
  }

  const systemPrompt = `You are AgentCrush's weekly ecosystem editor. Your job is to read 7 daily social briefs (one per day) and distill a tight 2-3 paragraph "Ecosystem this week" section for the public weekly digest at agentcrush.xyz/weekly.

VOICE:
- AgentCrush "we" voice. Direct, evidence-first, no marketing language.
- No emoji. No hashtags. No exclamation points.
- Cite concrete URLs sparingly — only the 1-2 strongest examples.
- Mention specific projects, protocols, builders by name when there's substantive activity.

WHAT TO WRITE:
- 2-3 short paragraphs (≈ 80-150 words each, ≈ 300 words total).
- Cluster recurring themes across days (NOT a day-by-day recap).
- Lead with the strongest signal — what's actually consolidating in the agent economy this week.
- End with one forward-looking observation if there's a clear trajectory.

WHAT TO AVOID:
- Day-by-day chronology.
- Repeating Ajsa's "trending" labels verbatim — synthesize across days.
- Speculation beyond what's in the briefs.
- Empty sentences like "the agent economy continues to evolve".

OUTPUT FORMAT:
- Plain markdown paragraphs separated by blank lines.
- No headings, no bullets, no metadata.
- No preamble. Start straight with the prose.`

  const userPrompt = `Week: ${formatWeekId(year, week)}
Date range: ${isoWeekDates(year, week)[0]} to ${isoWeekDates(year, week)[6]}
Briefs found: ${briefs.length} of 7

═══════════════════════════════════════════════════════════════════════════════
DAILY BRIEFS
═══════════════════════════════════════════════════════════════════════════════

${briefs.map(b => `--- ${b.date} ---\n${b.body}`).join('\n\n')}

═══════════════════════════════════════════════════════════════════════════════
WRITE THE ECOSYSTEM SECTION NOW
═══════════════════════════════════════════════════════════════════════════════

Distill the above 7 daily briefs into 2-3 short paragraphs (≈ 300 words total) for the public weekly digest. Cluster themes; cite concrete URLs sparingly. Plain markdown only, no headings, no metadata.`

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  }

  const BACKOFF = [10_000, 30_000, 60_000]
  let lastErr = null
  for (let i = 0; i <= BACKOFF.length; i++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
      }
      const j = await res.json()
      const text = j?.content?.[0]?.text
      if (!text) throw new Error(`Unexpected response shape: ${JSON.stringify(j).slice(0, 200)}`)
      const usage = j.usage || {}
      lastUsage = { input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null }
      console.log(`[weekly-digest] Anthropic ok. Input: ${usage.input_tokens}, output: ${usage.output_tokens}, cache_read: ${usage.cache_read_input_tokens ?? 0}, cache_create: ${usage.cache_creation_input_tokens ?? 0}`)

      // Cost log for cost-monitor
      try {
        const { appendFileSync, mkdirSync } = await import('node:fs')
        mkdirSync('/var/log/agentcrush', { recursive: true })
        appendFileSync('/var/log/agentcrush/anthropic-costs.jsonl', JSON.stringify({
          ts: new Date().toISOString(),
          worker: 'agentcrush-weekly-digest',
          model: MODEL,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        }) + '\n')
      } catch (_) { /* non-fatal */ }

      return text.trim()
    } catch (err) {
      lastErr = err
      if (i >= BACKOFF.length) break
      console.warn(`[weekly-digest] attempt ${i + 1} failed: ${err.message}. Waiting ${BACKOFF[i] / 1000}s.`)
      await new Promise(r => setTimeout(r, BACKOFF[i]))
    }
  }
  throw new Error(`Anthropic failed after retries: ${lastErr?.message}`)
}

// ── Persistence: Supabase + brain ─────────────────────────────────────────────

async function upsertSupabase(weekId, ecosystemMd, meta) {
  const body = [{
    week_id: weekId,
    ecosystem_section: ecosystemMd,
    briefs_included: meta.briefsIncluded,
    model: MODEL,
    input_tokens: meta.inputTokens ?? null,
    output_tokens: meta.outputTokens ?? null,
  }]
  const res = await fetch(`${SUPABASE_URL}/rest/v1/weekly_digest_sections?on_conflict=week_id`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Supabase upsert failed ${res.status}: ${t.slice(0, 200)}`)
  }
}

async function writeBrainAudit(weekId, ecosystemMd, meta) {
  const out = path.join(BRAIN_PATH, 'Agents', 'weekly-digest', 'output', `${weekId}-ecosystem.md`)
  await fs.mkdir(path.dirname(out), { recursive: true })
  const header = `---
week: ${weekId}
generated_at: ${new Date().toISOString()}
producer: weekly-digest-generator.mjs
model: ${MODEL}
briefs_included: ${meta.briefsIncluded}
---

`
  await fs.writeFile(out, header + ecosystemMd + '\n')
  return out
}

function gitCommitPush(repoPath, addPath, message) {
  try {
    execSync(`git -C "${repoPath}" add "${addPath}"`, { stdio: 'pipe' })
    execSync(`git -C "${repoPath}" -c user.email=vps@agentcrush.xyz -c user.name="AgentCrush VPS" commit -m "${message}" --quiet`, { stdio: 'pipe' })
    execSync(`git -C "${repoPath}" push --quiet origin main`, { stdio: 'pipe' })
    return true
  } catch (e) {
    console.error(`[weekly-digest] git op on ${repoPath} failed: ${e.message}`)
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const parsed = explicitWeek ? parseWeekId(explicitWeek) : currentIsoWeek()
  if (!parsed) {
    console.error(`[weekly-digest] FATAL: invalid --week value`)
    process.exit(2)
  }
  const weekId = formatWeekId(parsed.year, parsed.week)

  console.log(`[weekly-digest] Week: ${weekId}  Mode: ${isDryRun ? 'DRY' : 'WRITE'}`)

  // Publish gate: a digest goes live only once its week is over (Sunday has
  // started, UTC). Mid-week debug runs upsert nothing unless --force is given.
  // Added after the 2026-06-10 incident: a service debug run published W24 on
  // its Wednesday. Use --dry-run for testing, --force for a deliberate early publish.
  const weekDates = isoWeekDates(parsed.year, parsed.week)
  const sundayUTC = weekDates[6]
  const todayUTC = new Date().toISOString().slice(0, 10)
  if (!isDryRun && !isForced && todayUTC < sundayUTC) {
    console.log(`[weekly-digest] SKIP: week ${weekId} ends ${sundayUTC}; today is ${todayUTC}. ` +
      `Refusing to publish mid-week. Use --dry-run to preview or --force to override.`)
    process.exit(0)
  }

  const briefs = await gatherBriefs(parsed.year, parsed.week)
  console.log(`[weekly-digest] Found ${briefs.length} briefs.`)

  const ecosystem = await distill(briefs, parsed.year, parsed.week)
  console.log(`[weekly-digest] Distilled ${ecosystem.length} chars.`)

  if (isDryRun) {
    console.log('═══ DRY RUN — would write: ═══')
    console.log(ecosystem)
    process.exit(0)
  }

  const meta = {
    briefsIncluded: briefs.length,
    inputTokens: lastUsage.input_tokens,
    outputTokens: lastUsage.output_tokens,
  }

  // Supabase write first — drives the live page render
  await upsertSupabase(weekId, ecosystem, meta)
  console.log(`[weekly-digest] Supabase upserted weekly_digest_sections row for ${weekId}`)

  // Brain audit copy
  const brainOut = await writeBrainAudit(weekId, ecosystem, meta)
  console.log(`[weekly-digest] wrote ${brainOut}`)
  const brainOk = gitCommitPush(BRAIN_PATH, path.relative(BRAIN_PATH, brainOut), `weekly-digest: ecosystem section ${weekId}`)
  console.log(`[weekly-digest] brain push: ${brainOk ? '✓' : '✗'}`)
}

main().catch((err) => {
  console.error(`[weekly-digest] FATAL: ${err.message}`)
  process.exit(1)
})
