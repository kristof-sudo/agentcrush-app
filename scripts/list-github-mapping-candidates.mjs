#!/usr/bin/env node
/**
 * list-github-mapping-candidates.mjs
 *
 * Read-only. List GitHub mapping candidates from agent_github_mapping_candidates
 * for human review. No writes.
 *
 * Usage:
 *   node scripts/list-github-mapping-candidates.mjs [options]
 *
 * Options:
 *   --status STATUS        Filter by review_status (default: pending)
 *   --limit N              Max rows to display (default: 25)
 *   --min-confidence TIER  Minimum tier: high|medium|low (default: high)
 */

import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env') })

// ── CLI args ──────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2)
let status = 'pending'
let limit = 25
let minConfidence = 'high'

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--status' && rawArgs[i + 1])         { status = rawArgs[++i] }
  else if (rawArgs[i] === '--limit' && rawArgs[i + 1])     { limit = parseInt(rawArgs[++i], 10) || 25 }
  else if (rawArgs[i] === '--min-confidence' && rawArgs[i + 1]) { minConfidence = rawArgs[++i] }
}

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 }
const minScore = minConfidence === 'high' ? 700 : minConfidence === 'medium' ? 400 : 0

// ── Supabase client ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// ── Query ─────────────────────────────────────────────────────────────────────

const { data, error } = await supabase
  .from('agent_github_mapping_candidates')
  .select('id, handle, candidate_github_full_name, confidence_tier, confidence_score, evidence_signals, website_url, probe_run_date, review_status')
  .eq('review_status', status)
  .eq('confidence_tier', minConfidence === 'low' ? undefined : minConfidence)
  .gte('confidence_score', minScore)
  .order('confidence_score', { ascending: false })
  .limit(limit)

if (error) {
  console.error(`Query error: ${error.message}`)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log(`No candidates found with status="${status}" and min confidence="${minConfidence}".`)
  process.exit(0)
}

// ── Print table ───────────────────────────────────────────────────────────────

console.log(`\nGitHub mapping candidates  [status=${status}  min_confidence=${minConfidence}  limit=${limit}]\n`)

const COL = {
  id:      12,
  handle:  24,
  repo:    40,
  tier:     8,
  score:    6,
  signals: 30,
  website: 40,
}

const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n)
const header = [
  pad('id (short)', COL.id),
  pad('handle', COL.handle),
  pad('candidate_github_full_name', COL.repo),
  pad('tier', COL.tier),
  pad('score', COL.score),
  pad('signals', COL.signals),
  pad('website_url', COL.website),
].join('  ')

console.log(header)
console.log('─'.repeat(header.length))

for (const row of data) {
  console.log([
    pad(row.id?.slice(0, 8), COL.id),
    pad(row.handle, COL.handle),
    pad(row.candidate_github_full_name, COL.repo),
    pad(row.confidence_tier, COL.tier),
    pad(row.confidence_score, COL.score),
    pad((row.evidence_signals ?? []).join(','), COL.signals),
    pad(row.website_url, COL.website),
  ].join('  '))
}

console.log(`\n${data.length} row(s) shown.`)
