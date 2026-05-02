#!/usr/bin/env node
/**
 * apply-approved-github-mappings.mjs
 *
 * Apply human-approved GitHub repo mappings to agents.github_full_name.
 *
 * Default mode: dry-run (no writes). Pass --write to apply.
 *
 * Safety rules:
 *   - Only reads rows with review_status='approved' AND applied_at IS NULL.
 *   - Never overwrites an existing agents.github_full_name — skips the row
 *     and marks the candidate as 'superseded'.
 *   - No tier promotion, no scoring changes, no scans triggered.
 *   - After a successful write: sets review_status='applied', applied_at=now().
 *
 * Usage:
 *   node scripts/apply-approved-github-mappings.mjs [options]
 *
 * Options:
 *   --limit N   Max candidates to apply per run (default: 25)
 *   --write     Apply changes to agents table (requires SUPABASE_SERVICE_ROLE_KEY)
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
let limit = 25
let writeMode = false

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--limit' && rawArgs[i + 1]) { limit = parseInt(rawArgs[++i], 10) || 25 }
  else if (rawArgs[i] === '--write')               { writeMode = true }
}

// ── Supabase client ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// ── Fetch approved, unapplied candidates ──────────────────────────────────────

const { data: candidates, error: fetchErr } = await supabase
  .from('agent_github_mapping_candidates')
  .select('id, agent_id, handle, candidate_github_full_name, confidence_tier, confidence_score')
  .eq('review_status', 'approved')
  .is('applied_at', null)
  .order('confidence_score', { ascending: false })
  .limit(limit)

if (fetchErr) {
  console.error(`Error fetching approved candidates: ${fetchErr.message}`)
  process.exit(1)
}

if (!candidates || candidates.length === 0) {
  console.log('No approved, unapplied candidates found.')
  process.exit(0)
}

console.log(`Approved found:  ${candidates.length}`)
console.log(`Mode:            ${writeMode ? 'WRITE' : 'dry-run'}`)

// ── Check existing github_full_name for each agent ────────────────────────────

const agentIds = candidates.map(c => c.agent_id)
const { data: agents, error: agentErr } = await supabase
  .from('agents')
  .select('id, github_full_name')
  .in('id', agentIds)

if (agentErr) {
  console.error(`Error fetching agents: ${agentErr.message}`)
  process.exit(1)
}

const agentGithubMap = new Map((agents ?? []).map(a => [a.id, a.github_full_name]))

let wouldApply = 0
let wouldSkip = 0
let applied = 0
let superseded = 0
let errors = 0

for (const c of candidates) {
  const existingRepo = agentGithubMap.get(c.agent_id)

  if (existingRepo) {
    console.log(`SKIP (already has github_full_name="${existingRepo}"): ${c.handle} → ${c.candidate_github_full_name}`)
    wouldSkip++

    if (writeMode) {
      const { error } = await supabase
        .from('agent_github_mapping_candidates')
        .update({ review_status: 'superseded', updated_at: new Date().toISOString() })
        .eq('id', c.id)
      if (error) {
        console.error(`  Error marking superseded: ${error.message}`)
        errors++
      } else {
        superseded++
      }
    }
    continue
  }

  console.log(`APPLY: ${c.handle} → ${c.candidate_github_full_name}  [${c.confidence_tier} / ${c.confidence_score}]`)
  wouldApply++

  if (!writeMode) continue

  // Update agents.github_full_name
  const { error: agentUpdateErr } = await supabase
    .from('agents')
    .update({ github_full_name: c.candidate_github_full_name })
    .eq('id', c.agent_id)
    .is('github_full_name', null) // guard: only if still null at write time

  if (agentUpdateErr) {
    console.error(`  Error updating agent ${c.handle}: ${agentUpdateErr.message}`)
    errors++
    continue
  }

  // Mark candidate as applied
  const { error: markErr } = await supabase
    .from('agent_github_mapping_candidates')
    .update({
      review_status: 'applied',
      applied_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .eq('id', c.id)

  if (markErr) {
    console.error(`  Error marking applied for ${c.handle}: ${markErr.message}`)
    errors++
  } else {
    applied++
  }
}

console.log(`\nSummary:`)
console.log(`  Approved found:      ${candidates.length}`)
if (writeMode) {
  console.log(`  Applied:             ${applied}`)
  console.log(`  Skipped (existing):  ${superseded}`)
  console.log(`  Errors:              ${errors}`)
} else {
  console.log(`  Would apply:         ${wouldApply}`)
  console.log(`  Would skip:          ${wouldSkip}`)
  console.log(`\nDry-run complete. Pass --write to apply.`)
}

if (errors > 0) process.exit(1)
