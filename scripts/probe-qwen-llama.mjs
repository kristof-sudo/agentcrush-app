#!/usr/bin/env node
// Probe hf_models + lmarena_models for Qwen + Meta Llama seed data.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// 1. Find Qwen + Llama authors in hf_models
console.log('=== HF authors matching Qwen/Llama/Meta ===')
for (const pattern of ['Qwen', 'meta-llama', 'Meta-Llama', 'meta', 'llama']) {
  const { data, error } = await sb
    .from('hf_models')
    .select('author')
    .ilike('author', `%${pattern}%`)
    .limit(50)
  if (error) { console.error(error); continue }
  const counts = {}
  for (const r of data ?? []) counts[r.author] = (counts[r.author] || 0) + 1
  console.log(`pattern="${pattern}":`, Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5))
}

// 2. Top models per likely author
console.log('\n=== Top HF models per author ===')
for (const author of ['Qwen', 'meta-llama']) {
  const { data } = await sb
    .from('hf_models')
    .select('model_id, downloads, likes, last_modified_at')
    .eq('author', author)
    .order('downloads', { ascending: false })
    .limit(5)
  console.log(`${author}:`)
  for (const r of data ?? []) console.log(`  ${r.model_id}  dl=${r.downloads} likes=${r.likes}`)
}

// 3. Derivatives totals
console.log('\n=== Derivatives totals per author ===')
for (const author of ['Qwen', 'meta-llama']) {
  const { data } = await sb
    .from('hf_derivatives')
    .select('base_model, derivatives_count')
    .eq('base_author', author)
    .order('derivatives_count', { ascending: false })
    .limit(8)
  const total = (data ?? []).reduce((s, r) => s + r.derivatives_count, 0)
  console.log(`${author}: ${data?.length ?? 0} base models in top set, sum=${total}`)
  for (const r of data ?? []) console.log(`  ${r.base_model}  count=${r.derivatives_count}`)
}

// 4. LMArena keys — find rows mentioning qwen / llama
console.log('\n=== LMArena models matching qwen/llama (top by arena_score) ===')
for (const pattern of ['qwen', 'llama']) {
  const { data } = await sb
    .from('lmarena_models')
    .select('model_name, arena_score, votes')
    .ilike('model_name', `%${pattern}%`)
    .order('arena_score', { ascending: false })
    .limit(15)
  console.log(`\npattern="${pattern}":`)
  for (const r of data ?? []) console.log(`  ${r.model_name.padEnd(45)} BT=${r.arena_score} votes=${r.votes}`)
}
