#!/usr/bin/env node
// Quick verification of agent_score_model_family_v1 after derivatives plumbing.
// Reads .env.local from repo root.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const envPath = join(here, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const sb = createClient(url, key)

const { data, error } = await sb
  .from('agent_score_model_family_v1')
  .select(
    'handle, hf_score, lmarena_score, derivatives_score, citations_score, deployment_score, model_family_score, signals_available_count, evidence_ready_for_public_rank, total_derivatives, total_citations, total_deployments, lmarena_top_arena_score, methodology_version'
  )
  .order('model_family_score', { ascending: false })

if (error) {
  console.error('ERROR:', error)
  process.exit(1)
}

console.log('Methodology:', data[0]?.methodology_version)
console.log()
for (const r of data) {
  console.log(
    `${r.handle.padEnd(28)} ` +
      `HF=${String(r.hf_score).padStart(3)} ` +
      `LM=${String(r.lmarena_score ?? '—').padStart(3)} ` +
      `Der=${String(r.derivatives_score ?? '—').padStart(3)} ` +
      `Cit=${String(r.citations_score ?? '—').padStart(3)} ` +
      `Dep=${String(r.deployment_score ?? '—').padStart(3)} ` +
      `→ composite=${r.model_family_score} signals=${r.signals_available_count} ` +
      `${r.evidence_ready_for_public_rank ? '✅' : '—'}  ` +
      `[der=${r.total_derivatives} cit=${r.total_citations} dep=${r.total_deployments} lm_bt=${r.lmarena_top_arena_score ?? '—'}]`
  )
}
