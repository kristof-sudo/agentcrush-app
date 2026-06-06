/**
 * Blog-post drafter — Phase R-3.3 (Layer 2 weekly Haiku)
 *
 * Runs Fridays 14:00 UTC (16:00 Budapest) — gives Kris the weekend window to
 * review + tweak before optional Monday publish.
 *
 * Pipeline:
 *   1. Reads the past 5 days of Ajsa social briefs (Mon-Fri of current week).
 *   2. Reads recent brain Log.md entries (what shipped this week).
 *   3. Reads the most recent build-suggestions (what's queued).
 *   4. Calls Anthropic Haiku 4.5 with cached system prompt.
 *   5. Asks the model to: (a) pick one strong angle from the week, (b) draft
 *      a ~600 word post in AgentCrush voice, (c) propose a slug + title +
 *      one-line meta description, (d) flag the strongest single data
 *      reference and matching agentcrush.xyz URL.
 *   6. Writes the draft to brain `Inbox/{date}-blog-draft-{slug}.md` with
 *      frontmatter (title, slug, suggested_publish_date, references, etc.).
 *
 * Mode of action: the draft is a PROPOSAL. The Decision Card surfaces it on
 * Saturday/Sunday morning. Kris approves → in a future session, the page file
 * gets created at src/app/blog/{slug}/page.js. Until then it stays in brain.
 *
 * Usage:
 *   node blog-drafter-worker.mjs                    # production
 *   node blog-drafter-worker.mjs --dry-run          # don't write
 *   node blog-drafter-worker.mjs --date 2026-06-06  # explicit reference date
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const refDate = (() => {
  const i = args.indexOf('--date')
  return i !== -1 ? args[i + 1] : new Date().toISOString().slice(0, 10)
})()

// ── Env ───────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const BRAIN_PATH = process.env.BRAIN_PATH || '/opt/agentcrush-brain'

if (!ANTHROPIC_API_KEY) {
  console.error('[blog-drafter] FATAL: ANTHROPIC_API_KEY not set')
  process.exit(2)
}

const MODEL = 'claude-haiku-4-5'
const MAX_TOKENS = 3000

// ── Inputs ────────────────────────────────────────────────────────────────────

async function readIfExists(p) {
  try { return await fs.readFile(p, 'utf-8') }
  catch (e) { if (e.code === 'ENOENT') return null; throw e }
}

function dateNDaysAgo(refIso, n) {
  const d = new Date(`${refIso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

async function gatherInputs() {
  // Last 5 daily briefs (Mon-Fri-ish: today + 4 days back)
  const briefs = []
  for (let i = 0; i < 5; i++) {
    const date = dateNDaysAgo(refDate, i)
    const body = await readIfExists(path.join(BRAIN_PATH, 'Agents/ajsa/output', `social-brief-${date}.md`))
    if (body) briefs.push({ date, body })
  }

  // Most recent build-suggestions
  const buildSugg = await readIfExists(path.join(BRAIN_PATH, 'Inbox', `${refDate}-build-suggestions.md`))
                 || await readIfExists(path.join(BRAIN_PATH, 'Inbox', `${dateNDaysAgo(refDate, 1)}-build-suggestions.md`))

  // Recent Log.md — last 100 lines
  const logFull = await readIfExists(path.join(BRAIN_PATH, 'Log.md'))
  const logTail = logFull ? logFull.split('\n').slice(-200).join('\n') : null

  // Brain STATE.md (current product state)
  const stateMd = await readIfExists(path.join(BRAIN_PATH, 'STATE.md'))

  return { briefs, buildSugg, logTail, stateMd }
}

// ── Anthropic call ────────────────────────────────────────────────────────────

async function callHaiku(systemBlocks, userPrompt) {
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
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemBlocks,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`)
      }
      const j = await res.json()
      const text = j?.content?.[0]?.text
      if (!text) throw new Error(`Bad response shape: ${JSON.stringify(j).slice(0, 200)}`)
      const usage = j.usage || {}
      console.log(`[blog-drafter] Anthropic ok. Input: ${usage.input_tokens}, Output: ${usage.output_tokens}, cache_read: ${usage.cache_read_input_tokens ?? 0}, cache_create: ${usage.cache_creation_input_tokens ?? 0}`)
      try {
        const { appendFileSync, mkdirSync } = await import('node:fs')
        mkdirSync('/var/log/agentcrush', { recursive: true })
        appendFileSync('/var/log/agentcrush/anthropic-costs.jsonl', JSON.stringify({
          ts: new Date().toISOString(),
          worker: 'agentcrush-blog-drafter',
          model: MODEL,
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        }) + '\n')
      } catch { /* non-fatal */ }
      return text
    } catch (err) {
      lastErr = err
      if (i >= BACKOFF.length) break
      console.warn(`[blog-drafter] attempt ${i + 1} failed: ${err.message}. Waiting ${BACKOFF[i] / 1000}s.`)
      await new Promise(r => setTimeout(r, BACKOFF[i]))
    }
  }
  throw new Error(`Anthropic failed after retries: ${lastErr?.message}`)
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_CACHED = `You are AgentCrush's weekly blog drafter. Once a week you read the past 5 days of social briefs, the current product state, and what shipped this week, then write a single 600-word blog draft for agentcrush.xyz/blog.

VOICE:
- AgentCrush "we" voice. Evidence-first. Direct.
- No emoji, no hashtags, no exclamation points, no marketing language ("revolutionary", "game-changing", etc.).
- Every concrete claim is verifiable — link to a live agentcrush.xyz URL where the reader can see the data in one click.
- One strong angle per post, not a roundup.

STRUCTURE:
- Headline: factual + specific. Not a question.
- Lede (~80 words): the concrete observation + why it matters now.
- Body (~400 words): 2-3 sub-arguments, each with one verifiable reference (rankings page, methodology page, /trends, blog post).
- Close (~80 words): the implication for agent builders.
- Inline links to agentcrush.xyz pages in markdown format.

ANGLES TO PRIORITIZE THIS WEEK:
- A specific data shift visible in our rankings (a top mover with explanation).
- A methodology evolution that changes how readers should interpret scores.
- A protocol adoption signal (x402, ERC-8004, MCP, A2A, agent.json).
- A cross-protocol observation only AgentCrush's unified index can make.

DON'T:
- Write "the agent economy is evolving" or similar empty meta-statements.
- Cite individual X posts as the sole evidence — use data on agentcrush.xyz.
- Promise features not shipped.
- Make claims unsupported by the brief inputs.

OUTPUT FORMAT — return exactly this YAML+markdown block, nothing else:

---
slug: kebab-case-slug-under-60-chars
title: "Factual specific headline under 80 chars"
meta_description: "Single sentence 130-160 chars summarizing the angle."
suggested_publish_date: YYYY-MM-DD (next Monday from reference date)
primary_reference_url: https://agentcrush.xyz/...
related_urls:
  - https://agentcrush.xyz/...
  - https://agentcrush.xyz/...
angle: "One sentence on why this post and not another."
---

# Headline

Body paragraphs in markdown. Inline links. ~600 words total.`

function buildUserPrompt(inputs) {
  return `Reference date: ${refDate}
Briefs read: ${inputs.briefs.length} of 5

═══════════════════════════════════════════════════════════════════════════════
CURRENT PRODUCT STATE (STATE.md head — what shipped, what's queued)
═══════════════════════════════════════════════════════════════════════════════

${inputs.stateMd ? inputs.stateMd.slice(0, 4000) : '(STATE.md not available)'}

═══════════════════════════════════════════════════════════════════════════════
WHAT JUST SHIPPED (Log.md tail)
═══════════════════════════════════════════════════════════════════════════════

${inputs.logTail ? inputs.logTail.slice(-4000) : '(Log.md not available)'}

═══════════════════════════════════════════════════════════════════════════════
WEEK'S SOCIAL BRIEFS (Ajsa daily)
═══════════════════════════════════════════════════════════════════════════════

${inputs.briefs.map(b => `--- ${b.date} ---\n${b.body.slice(0, 3000)}`).join('\n\n')}

═══════════════════════════════════════════════════════════════════════════════
LATEST BUILD-SUGGESTIONS
═══════════════════════════════════════════════════════════════════════════════

${inputs.buildSugg ? inputs.buildSugg.slice(0, 2500) : '(No recent build-suggestions)'}

═══════════════════════════════════════════════════════════════════════════════
WRITE THE BLOG DRAFT NOW
═══════════════════════════════════════════════════════════════════════════════

Pick the single strongest angle from the inputs above. Return the YAML frontmatter + markdown body exactly per the output spec — nothing else.`
}

// ── Output ────────────────────────────────────────────────────────────────────

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { frontmatter: null, body: text }
  // Naive YAML parse — sufficient for the constrained schema
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, '').trim()
  }
  return { frontmatter: fm, body: m[2].trim(), raw_frontmatter: m[1] }
}

function inferSlug(fm) {
  if (fm?.slug) return fm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60).replace(/^-+|-+$/g, '')
  return `untitled-${refDate}`
}

async function writeDraft(draftText, fm) {
  const slug = inferSlug(fm)
  const outPath = path.join(BRAIN_PATH, 'Inbox', `${refDate}-blog-draft-${slug}.md`)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  const header = `---
date: ${refDate}
type: blog-draft
status: proposed — Kris review needed
producer: blog-drafter-worker.mjs
model: ${MODEL}
slug: ${slug}
title: ${fm?.title || '"(untitled)"'}
suggested_publish_date: ${fm?.suggested_publish_date || ''}
primary_reference_url: ${fm?.primary_reference_url || ''}
angle: ${fm?.angle || ''}
---

`
  await fs.writeFile(outPath, header + draftText.trim() + '\n')
  return outPath
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[blog-drafter] Reference date: ${refDate}  Mode: ${isDryRun ? 'DRY' : 'WRITE'}`)
  const inputs = await gatherInputs()
  if (inputs.briefs.length === 0) {
    console.error('[blog-drafter] No Ajsa briefs found — nothing to draft from.')
    process.exit(1)
  }
  console.log(`[blog-drafter] Found ${inputs.briefs.length} briefs, state ${inputs.stateMd ? 'present' : 'missing'}, log ${inputs.logTail ? 'present' : 'missing'}.`)

  const systemBlocks = [{ type: 'text', text: SYSTEM_PROMPT_CACHED, cache_control: { type: 'ephemeral' } }]
  const userPrompt = buildUserPrompt(inputs)

  const draft = await callHaiku(systemBlocks, userPrompt)
  console.log(`[blog-drafter] Draft length: ${draft.length} chars`)

  const { frontmatter, body } = extractFrontmatter(draft)

  if (isDryRun) {
    console.log('═══ FRONTMATTER ═══')
    console.log(frontmatter)
    console.log('═══ BODY ═══')
    console.log(body)
    process.exit(0)
  }

  const outPath = await writeDraft(draft, frontmatter)
  console.log(`[blog-drafter] Wrote ${outPath}`)

  // Commit + push (brain-sync timer will catch it too, but commit explicitly for clarity)
  try {
    execSync(`git -C "${BRAIN_PATH}" add "${path.relative(BRAIN_PATH, outPath)}"`, { stdio: 'pipe' })
    execSync(`git -C "${BRAIN_PATH}" -c user.email=vps@agentcrush.xyz -c user.name="AgentCrush VPS" commit -m "blog-drafter: weekly draft ${refDate} — ${frontmatter?.slug || 'untitled'}" --quiet`, { stdio: 'pipe' })
    execSync(`git -C "${BRAIN_PATH}" push --quiet origin main`, { stdio: 'pipe' })
    console.log(`[blog-drafter] git push ok`)
  } catch (e) {
    console.error(`[blog-drafter] git push failed (non-fatal — brain-sync will catch it): ${e.message}`)
  }
}

main().catch((err) => {
  console.error(`[blog-drafter] FATAL: ${err.message}`)
  process.exit(1)
})
