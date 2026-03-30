/**
 * GitHub Indexer Worker
 * Fetches AI agent repos from GitHub, filters low-quality results,
 * and inserts into github_raw_agents table (idempotent via ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   GITHUB_TOKEN=<token> SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> node scanner/github-indexer-worker.mjs
 */

import { fetchAgentRepos, normalizeRepo } from './github-client.mjs'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Keyword filter: skip obvious non-agent repos ──────────────────────────
const SKIP_KEYWORDS = [
  'tutorial', 'awesome-list', 'awesome list', 'collection', 'cheatsheet',
  'cheat sheet', 'course', 'bootcamp', 'learning', 'book', 'reading',
  'notes', 'template', 'boilerplate', 'starter kit', 'sample', 'example',
  'demo', 'playground', 'study', 'exercises', 'interview', 'quiz',
  'dataset', 'benchmark', 'survey', 'paper', 'arxiv',
]

function shouldSkip(repo) {
  // Must have description
  if (!repo.description || repo.description.length < 10) return true

  // Must have at least 5 stars
  if (repo.stars < 5) return true

  const desc = repo.description.toLowerCase()
  const name = repo.name.toLowerCase()

  // Skip obvious non-agent content
  for (const kw of SKIP_KEYWORDS) {
    if (desc.includes(kw) || name.includes(kw)) return true
  }

  return false
}

// ── Batch insert into Supabase ─────────────────────────────────────────────
async function insertBatch(rows) {
  if (rows.length === 0) return { count: 0, skipped: 0 }

  const { data, error, count } = await supabase
    .from('github_raw_agents')
    .insert(rows, { count: 'exact' })
    .onConflict('repo_url')
    .ignore()

  if (error) {
    console.error('  Insert error:', error.message)
    return { count: 0, skipped: rows.length }
  }

  return { count: count || 0, skipped: rows.length - (count || 0) }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== AgentCrush GitHub Indexer ===\n')

  // 1. Fetch raw repos from GitHub
  const rawRepos = await fetchAgentRepos()
  console.log(`\nFetched ${rawRepos.length} total repos from GitHub`)

  // 2. Normalize and filter
  const normalized = []
  let skippedFilter = 0

  for (const repo of rawRepos) {
    const norm = normalizeRepo(repo)
    if (shouldSkip(norm)) {
      skippedFilter++
      continue
    }
    normalized.push(norm)
  }

  console.log(`After filtering: ${normalized.length} repos (skipped ${skippedFilter} low-quality)`)

  // 3. Insert in batches of 100
  const BATCH_SIZE = 100
  let totalInserted = 0
  let totalSkipped = 0

  for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
    const batch = normalized.slice(i, i + BATCH_SIZE)
    const { count, skipped } = await insertBatch(batch)
    totalInserted += count
    totalSkipped += skipped
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: +${count} new, ${skipped} already existed`)
  }

  // 4. Summary
  console.log(`
=== Summary ===
  Fetched from GitHub:  ${rawRepos.length}
  Filtered out:         ${skippedFilter}
  Candidates:           ${normalized.length}
  Newly inserted:       ${totalInserted}
  Already existed:      ${totalSkipped}
`)

  if (totalInserted < 300) {
    console.warn(`Warning: only ${totalInserted} new records. Target was 300+.`)
    console.warn('Consider adding GITHUB_TOKEN for higher rate limits.')
  } else {
    console.log(`Target met: ${totalInserted} new agent candidates indexed.`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
