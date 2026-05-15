#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await sb
  .from('agent_score_service_v1')
  .select('handle, github_full_name, a2a_stars, a2a_signal_strength, av_interactions, adoption_score, source_quality_score, activity_score, protocol_breadth_score, cross_protocol_score, social_score, service_score, signals_available_count, evidence_ready_for_public_rank, methodology_version')
  .order('service_score', { ascending: false })
  .limit(30)

if (error) { console.error(error); process.exit(1) }
console.log('Methodology:', data[0]?.methodology_version)
console.log()
for (const r of data) {
  console.log(
    `${(r.handle || '').padEnd(38)}` +
    ` Adp=${String(r.adoption_score ?? '—').padStart(3)}` +
    ` Q=${String(r.source_quality_score ?? '—').padStart(3)}` +
    ` Act=${String(r.activity_score ?? '—').padStart(3)}` +
    ` Pro=${String(r.protocol_breadth_score ?? '—').padStart(3)}` +
    ` XP=${String(r.cross_protocol_score ?? '—').padStart(3)}` +
    ` So=${String(r.social_score ?? '—').padStart(3)}` +
    ` → ${String(r.service_score).padStart(3)}` +
    ` sig=${r.signals_available_count}` +
    ` ${r.evidence_ready_for_public_rank ? '✅' : '—'}` +
    `  [★${r.a2a_stars ?? '-'} ${r.github_full_name || ''}]`
  )
}
