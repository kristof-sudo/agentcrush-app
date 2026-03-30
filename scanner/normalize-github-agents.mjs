/**
 * Normalize GitHub raw agents → AgentCrush agents table.
 * Reads from github_raw_agents where imported=false,
 * deduplicates by github_url and normalized name,
 * inserts into agents table (ON CONFLICT DO NOTHING on handle).
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> node scanner/normalize-github-agents.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Derive a safe handle from owner+name.
 * Lowercase, alphanumeric + underscore, max 50 chars.
 */
function deriveHandle(owner, name) {
  const raw = `${owner}_${name}`.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 50)
  return raw
}

/**
 * Infer archetype from topics + description.
 */
function inferArchetype(topics, description) {
  const text = `${topics} ${description}`.toLowerCase()
  if (/\btrading|crypto|defi|token|blockchain\b/.test(text)) return 'Trader'
  if (/\bcode|coding|developer|engineer|devtool\b/.test(text)) return 'Builder'
  if (/\bresearch|analyt|insight|rag|retrieval\b/.test(text)) return 'Researcher'
  if (/\boperat|automat|workflow|orches\b/.test(text)) return 'Operator'
  if (/\bsocial|content|market|growth\b/.test(text)) return 'Creator'
  return 'Operator'
}

async function main() {
  console.log('=== AgentCrush GitHub Normalizer ===\n')

  // 1. Fetch unimported raw rows
  const { data: rawRows, error: fetchErr } = await supabase
    .from('github_raw_agents')
    .select('*')
    .eq('imported', false)
    .order('stars', { ascending: false })
    .limit(1000)

  if (fetchErr) {
    console.error('Failed to fetch raw agents:', fetchErr.message)
    process.exit(1)
  }

  console.log(`Found ${rawRows.length} unimported raw agents`)

  // 2. Normalize + dedup by handle
  const seen = new Set()
  const toInsert = []

  for (const raw of rawRows) {
    const handle = deriveHandle(raw.owner || 'unknown', raw.name)

    // Dedup by handle
    if (seen.has(handle)) continue
    seen.add(handle)

    const archetype = inferArchetype(raw.topics || '', raw.description || '')

    toInsert.push({
      handle,
      display_name: raw.name,
      bio: raw.description || '',
      tagline: (raw.description || '').slice(0, 100),
      archetype,
      entity_type: 'agent',
      ecosystem_layer: 'agent',
      identity_status: 'unverified',
      github_url: raw.repo_url,
      website_url: raw.homepage_url || null,
      // Store stars in a discoverable way
      x_handle: null,
    })
  }

  console.log(`After dedup: ${toInsert.length} candidates to insert`)

  // 3. Insert in batches of 50
  const BATCH_SIZE = 50
  let totalInserted = 0
  let totalSkipped = 0
  const rawIdsToMark = []

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)

    const { data, error, count } = await supabase
      .from('agents')
      .insert(batch, { count: 'exact' })
      .onConflict('handle')
      .ignore()

    if (error) {
      console.error(`  Batch error: ${error.message}`)
      continue
    }

    const inserted = count || 0
    totalInserted += inserted
    totalSkipped += batch.length - inserted
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: +${inserted} inserted, ${batch.length - inserted} already exist`)

    // Track raw row repo_urls for marking imported
    for (const row of batch) {
      rawIdsToMark.push(row.github_url)
    }
  }

  // 4. Mark raw rows as imported
  if (rawIdsToMark.length > 0) {
    const { error: markErr } = await supabase
      .from('github_raw_agents')
      .update({ imported: true })
      .in('repo_url', rawIdsToMark)

    if (markErr) console.error('  Failed to mark rows imported:', markErr.message)
    else console.log(`\nMarked ${rawIdsToMark.length} raw rows as imported`)
  }

  // 5. Summary
  console.log(`
=== Summary ===
  Raw candidates:       ${rawRows.length}
  After dedup:          ${toInsert.length}
  Newly inserted:       ${totalInserted}
  Already existed:      ${totalSkipped}
`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
