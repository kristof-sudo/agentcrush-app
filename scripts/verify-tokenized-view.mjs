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
  .from('agent_score_tokenized_v1')
  .select('handle, virtuals_ticker, market_cap_usd, liquidity_usd, market_cap_score, liquidity_volume_score, holders_basket_score, price_momentum_score, cross_protocol_score, social_score, tokenized_score, signals_available_count, evidence_ready_for_public_rank, methodology_version, primary_category, secondary_categories')
  .order('tokenized_score', { ascending: false })

if (error) { console.error(error); process.exit(1) }
console.log('Methodology:', data[0]?.methodology_version)
console.log()
const fmt = (n) => n == null ? '—' : (n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${Math.round(n)}`)
for (const r of data) {
  const cat = r.primary_category === 'tokenized' ? 'P' : (r.secondary_categories?.includes('tokenized') ? 'S' : '?')
  console.log(
    `[${cat}] ${(r.handle || '').padEnd(20)} ${(r.virtuals_ticker || '').padEnd(8)}` +
    ` MC=${String(r.market_cap_score ?? '—').padStart(3)}` +
    ` LV=${String(r.liquidity_volume_score ?? '—').padStart(3)}` +
    ` H=${String(r.holders_basket_score ?? '—').padStart(3)}` +
    ` Mo=${String(r.price_momentum_score ?? '—').padStart(3)}` +
    ` XP=${String(r.cross_protocol_score ?? '—').padStart(3)}` +
    ` So=${String(r.social_score ?? '—').padStart(3)}` +
    ` → ${String(r.tokenized_score).padStart(3)}` +
    ` sigs=${r.signals_available_count}` +
    ` ${r.evidence_ready_for_public_rank ? '✅' : '—'}` +
    `  [mc=${fmt(r.market_cap_usd)} liq=${fmt(r.liquidity_usd)}]`
  )
}
