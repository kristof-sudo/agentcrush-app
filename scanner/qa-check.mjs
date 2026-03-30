/**
 * QA check: print first 50 GitHub-imported agents, verify quality.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> node scanner/qa-check.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // Total agent count
  const { count: totalCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })

  // GitHub-sourced agents
  const { count: githubCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .not('github_url', 'is', null)

  console.log(`\n=== Agent Count Tracker ===`)
  console.log(`Total agents in DB:      ${totalCount}`)
  console.log(`GitHub-sourced agents:   ${githubCount}`)

  // Raw table counts
  const { count: rawTotal } = await supabase
    .from('github_raw_agents')
    .select('*', { count: 'exact', head: true })

  const { count: rawImported } = await supabase
    .from('github_raw_agents')
    .select('*', { count: 'exact', head: true })
    .eq('imported', true)

  console.log(`Raw github_raw_agents:   ${rawTotal} (${rawImported} imported)`)

  // First 50 GitHub agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('handle, display_name, bio, github_url, archetype')
    .not('github_url', 'is', null)
    .order('id', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching agents:', error.message)
    process.exit(1)
  }

  console.log(`\n=== First 50 GitHub-imported agents ===`)
  let emptyDesc = 0
  let duplicates = 0
  const handles = new Set()

  for (const a of agents) {
    if (handles.has(a.handle)) {
      duplicates++
      console.log(`  [DUP] ${a.handle}`)
    } else {
      handles.add(a.handle)
    }

    if (!a.bio || a.bio.length < 5) emptyDesc++

    const descPreview = (a.bio || '').slice(0, 60)
    console.log(`  [${a.archetype || '?'}] ${a.handle} — ${descPreview}`)
  }

  console.log(`\n=== QA Results ===`)
  console.log(`Checked:         ${agents.length}`)
  console.log(`Empty bios:      ${emptyDesc}`)
  console.log(`Duplicates:      ${duplicates}`)
  console.log(`Status:          ${emptyDesc === 0 && duplicates === 0 ? 'PASS' : 'NEEDS REVIEW'}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
