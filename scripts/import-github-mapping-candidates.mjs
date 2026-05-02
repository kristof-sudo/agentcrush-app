#!/usr/bin/env node
/**
 * import-github-mapping-candidates.mjs
 *
 * Import GitHub repo mapping candidates from a VPS probe output JSON file
 * into agent_github_mapping_candidates for human review.
 *
 * Default mode: dry-run (no DB writes). Pass --write to upsert.
 *
 * Usage:
 *   node scripts/import-github-mapping-candidates.mjs --file probe-output.json [options]
 *
 * Options:
 *   --file PATH            Path to VPS probe output JSON (required)
 *   --min-confidence TIER  Minimum tier to import: high|medium|low (default: high)
 *   --limit N              Max candidates to process (default: all)
 *   --write                Upsert to Supabase (requires SUPABASE_SERVICE_ROLE_KEY)
 *
 * Expected JSON shape (any of these are accepted):
 *   Array:   [ { agent_id, handle, candidate_github_full_name, confidence_tier,
 *                confidence_score, evidence_signals, website_url, match_context }, ... ]
 *   Object:  { candidates: [...] }
 *          | { githubCandidates: [...] }
 *          | { results: [...] }
 *
 * Candidate fields:
 *   agent_id                  uuid   (required — must match agents.id)
 *   handle                    text   (required)
 *   candidate_github_full_name text  (required — owner/repo)
 *   confidence_tier           text   high|medium|low
 *   confidence_score          int    0–999
 *   evidence_signals          string[] optional
 *   website_url               text   optional
 *   match_context             text   optional
 *   probe_run_date            date   optional (defaults to today)
 *
 * On conflict(agent_id, candidate_github_full_name):
 *   Updates: confidence_tier, confidence_score, evidence_signals,
 *            website_url, match_context, probe_run_date, updated_at
 *   Preserves: review_status, reviewed_by, reviewed_at, review_notes, applied_at
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env') })

// ── CLI args ──────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2)
let filePath = null
let minConfidence = 'high'
let limitN = null
let writeMode = false

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--file' && rawArgs[i + 1])           { filePath = rawArgs[++i] }
  else if (rawArgs[i] === '--min-confidence' && rawArgs[i + 1]) { minConfidence = rawArgs[++i] }
  else if (rawArgs[i] === '--limit' && rawArgs[i + 1])     { limitN = parseInt(rawArgs[++i], 10) }
  else if (rawArgs[i] === '--write')                        { writeMode = true }
}

if (!filePath) {
  console.error('Error: --file is required')
  process.exit(1)
}

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 }
const minRank = CONFIDENCE_RANK[minConfidence] ?? 2

const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

// ── Supabase client ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (writeMode && (!supabaseUrl || !serviceKey)) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --write')
  process.exit(1)
}

const supabase = (supabaseUrl && serviceKey)
  ? createClient(supabaseUrl, serviceKey)
  : null

// ── Load and parse probe output ───────────────────────────────────────────────

let rawData
try {
  rawData = JSON.parse(readFileSync(resolve(process.cwd(), filePath), 'utf8'))
} catch (err) {
  console.error(`Error reading file: ${err.message}`)
  process.exit(1)
}

let rawCandidates
if (Array.isArray(rawData)) {
  rawCandidates = rawData
} else if (rawData && typeof rawData === 'object') {
  rawCandidates = rawData.candidates ?? rawData.githubCandidates ?? rawData.results ?? null
  if (!Array.isArray(rawCandidates)) {
    console.error('Error: Could not find candidates array in JSON. Expected root array or object with candidates/githubCandidates/results key.')
    process.exit(1)
  }
} else {
  console.error('Error: Unknown JSON shape. Expected array or object.')
  process.exit(1)
}

console.log(`Candidates read:      ${rawCandidates.length}`)

// ── Validate and filter ───────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10)
const valid = []
let skipped = 0

for (const raw of rawCandidates) {
  const tier = raw.confidence_tier ?? raw.confidenceTier ?? raw.tier ?? null
  const tierRank = CONFIDENCE_RANK[tier] ?? -1

  if (tierRank < minRank) { skipped++; continue }

  if (!raw.agent_id) { skipped++; continue }

  const repoRaw = raw.candidate_github_full_name ?? raw.candidateGithubFullName ?? raw.github_full_name ?? raw.repo ?? null
  if (!repoRaw) { skipped++; continue }

  // Normalise: strip leading https://github.com/ if probe included full URL
  const repo = repoRaw
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/$/, '')
    .trim()

  if (!GITHUB_REPO_RE.test(repo)) { skipped++; continue }

  const score = raw.confidence_score ?? raw.confidenceScore ?? raw.score ?? 0
  const signals = raw.evidence_signals ?? raw.evidenceSignals ?? raw.signals ?? []

  valid.push({
    agent_id:                   raw.agent_id,
    handle:                     raw.handle ?? '',
    candidate_github_full_name: repo,
    confidence_tier:            tier,
    confidence_score:           Math.min(Math.max(parseInt(score, 10) || 0, 0), 999),
    evidence_signals:           Array.isArray(signals) ? signals : [],
    website_url:                raw.website_url ?? raw.websiteUrl ?? null,
    match_context:              raw.match_context ?? raw.matchContext ?? null,
    probe_run_date:             raw.probe_run_date ?? raw.probeRunDate ?? today,
  })
}

if (limitN) { valid.splice(limitN) }

console.log(`Candidates valid:     ${valid.length}`)
console.log(`Candidates skipped:   ${skipped}`)
console.log(`Pending upserts:      ${valid.length}`)
console.log(`Mode:                 ${writeMode ? 'WRITE' : 'dry-run'}`)

if (!writeMode) {
  console.log('\nDry-run complete. Pass --write to upsert.')
  if (valid.length > 0) {
    console.log('\nFirst candidate preview:')
    console.log(JSON.stringify(valid[0], null, 2))
  }
  process.exit(0)
}

// ── Upsert (write mode) ───────────────────────────────────────────────────────

if (!supabase) {
  console.error('Error: Supabase client not available.')
  process.exit(1)
}

// Split candidates into two groups:
//   A) rows that don't yet exist OR exist with review_status='pending'
//      → full upsert (all fields)
//   B) rows that exist with a non-pending review_status
//      → selective update of probe metadata only; preserve review fields

// Fetch existing rows that match any of the incoming (agent_id, repo) pairs
const lookupKeys = valid.map(c => `${c.agent_id}::${c.candidate_github_full_name}`)
const agentIds = [...new Set(valid.map(c => c.agent_id))]

const { data: existingRows, error: fetchErr } = await supabase
  .from('agent_github_mapping_candidates')
  .select('agent_id, candidate_github_full_name, review_status')
  .in('agent_id', agentIds)

if (fetchErr) {
  console.error(`Error fetching existing rows: ${fetchErr.message}`)
  process.exit(1)
}

const reviewedKeys = new Set(
  (existingRows ?? [])
    .filter(r => r.review_status !== 'pending')
    .map(r => `${r.agent_id}::${r.candidate_github_full_name}`)
)

const toUpsert  = valid.filter(c => !reviewedKeys.has(`${c.agent_id}::${c.candidate_github_full_name}`))
const toMetaUpdate = valid.filter(c => reviewedKeys.has(`${c.agent_id}::${c.candidate_github_full_name}`))

console.log(`\nFull upserts (new/pending):      ${toUpsert.length}`)
console.log(`Metadata-only updates (reviewed): ${toMetaUpdate.length}`)

const BATCH = 50
let inserted = 0
let metaUpdated = 0
let errors = 0

// Full upsert for new/pending rows
for (let i = 0; i < toUpsert.length; i += BATCH) {
  const batch = toUpsert.slice(i, i + BATCH)
  const { error } = await supabase
    .from('agent_github_mapping_candidates')
    .upsert(batch, { onConflict: 'agent_id,candidate_github_full_name', ignoreDuplicates: false })

  if (error) {
    console.error(`Upsert batch error: ${error.message}`)
    errors += batch.length
  } else {
    inserted += batch.length
  }
}

// Selective update for already-reviewed rows (preserve review fields)
for (const c of toMetaUpdate) {
  const { error } = await supabase
    .from('agent_github_mapping_candidates')
    .update({
      confidence_tier:  c.confidence_tier,
      confidence_score: c.confidence_score,
      evidence_signals: c.evidence_signals,
      website_url:      c.website_url,
      match_context:    c.match_context,
      probe_run_date:   c.probe_run_date,
      updated_at:       new Date().toISOString(),
    })
    .eq('agent_id', c.agent_id)
    .eq('candidate_github_full_name', c.candidate_github_full_name)

  if (error) {
    console.error(`Meta-update error for ${c.handle}/${c.candidate_github_full_name}: ${error.message}`)
    errors++
  } else {
    metaUpdated++
  }
}

console.log(`\nUpserted:      ${inserted}`)
console.log(`Meta-updated:  ${metaUpdated}`)
console.log(`Errors:        ${errors}`)
if (errors > 0) process.exit(1)
