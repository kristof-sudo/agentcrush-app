#!/usr/bin/env node
// Probe HF + LMArena data for Mistral + Cohere model_family expansion (v1.5)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

console.log('=== HF authors (Mistral + Cohere variants) ===')
for (const pattern of ['Mistral', 'mistralai', 'mistral', 'Cohere', 'CohereForAI', 'cohere']) {
  const { data } = await sb.from('hf_models').select('author').ilike('author', `%${pattern}%`).limit(50)
  const counts = {}
  for (const r of data || []) counts[r.author] = (counts[r.author] || 0) + 1
  console.log(`  pattern="${pattern}":`, Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5))
}

for (const author of ['mistralai', 'CohereForAI', 'CohereLabs']) {
  console.log(`\n=== Top HF models for ${author} ===`)
  const { data } = await sb.from('hf_models').select('model_id, downloads, likes')
    .eq('author', author).order('downloads', {ascending:false}).limit(6)
  for (const r of data || []) console.log(`  ${r.model_id.padEnd(60)} dl=${r.downloads} likes=${r.likes}`)
}

console.log('\n=== Derivatives summary per candidate author ===')
for (const author of ['mistralai', 'CohereForAI', 'CohereLabs']) {
  const { data } = await sb.from('hf_derivatives').select('base_model, derivatives_count')
    .eq('base_author', author).order('derivatives_count', {ascending:false}).limit(6)
  const total = (data || []).reduce((s, r) => s + r.derivatives_count, 0)
  console.log(`  ${author}: ${data?.length || 0} base models in top set, total=${total}`)
  for (const r of data || []) console.log(`    ${r.base_model} count=${r.derivatives_count}`)
}

console.log('\n=== LMArena variants (mistral / command / mixtral) ===')
for (const pattern of ['mistral', 'mixtral', 'command-', 'cohere', 'aya']) {
  const { data } = await sb.from('lmarena_models').select('model_name, arena_score, votes')
    .ilike('model_name', `%${pattern}%`).order('arena_score', {ascending:false, nullsFirst:false}).limit(10)
  console.log(`\n  pattern="${pattern}":`)
  for (const r of data || []) console.log(`    ${r.model_name.padEnd(45)} BT=${r.arena_score} votes=${r.votes}`)
}
