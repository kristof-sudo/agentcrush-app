#!/usr/bin/env node
// Probe all candidate source tables for text fields we can scan for
// model-family mentions. Also count rows per table so we know the scan size.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TABLES = [
  'agents',
  'bazaar_resources',
  'erc8004_registry',
  'agentverse_agents',
  'virtuals_agents',
  'a2a_agents',
]

for (const t of TABLES) {
  console.log(`\n=== ${t} ===`)
  const { count, error: cErr } = await sb.from(t).select('*', { count: 'exact', head: true })
  if (cErr) { console.log(`  ERR: ${cErr.message}`); continue }
  console.log(`  rows: ${count}`)
  // sample 1 row to see columns
  const { data } = await sb.from(t).select('*').limit(1)
  if (data && data.length) {
    const cols = Object.keys(data[0])
    // Heuristic: columns likely to contain text descriptions
    const textCols = cols.filter((c) =>
      /name|bio|description|tagline|title|metadata|tags|topics|protocols/i.test(c) ||
      typeof data[0][c] === 'string' && data[0][c]?.length > 30
    )
    console.log(`  text-likely cols: ${textCols.join(', ')}`)
  }
}

// Quick mention probes to gauge expected hit rate
console.log('\n=== Quick "llama" mention probe per table ===')
for (const [t, col] of [
  ['agents', 'bio'],
  ['bazaar_resources', 'description'],
  ['erc8004_registry', 'agent_name'],
  ['agentverse_agents', 'description'],
  ['virtuals_agents', 'description'],
  ['a2a_agents', 'description'],
]) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true }).ilike(col, '%llama%')
  if (error) { console.log(`  ${t}.${col}: ERR ${error.message}`); continue }
  console.log(`  ${t}.${col} ILIKE '%llama%': ${count}`)
}
