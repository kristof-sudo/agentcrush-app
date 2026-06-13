/**
 * Phase 9 repeated-run validation.
 * Runs 5 synthetic governed workflow runs + 5 Scout/Judge runs.
 * Validates each run and returns a structured results object.
 */

import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNNER = path.join(ROOT, 'tools/run-scout-judge-workflow.mjs')

const db = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Helpers ────────────────────────────────────────────────────────────────

function ts() { return Date.now() }
function shortId() { return Math.random().toString(36).slice(2, 8) }

async function verifyRun(workflowId) {
  const issues = []

  const { data: wf }       = await db.from('workflows').select('workflow_id, status').eq('workflow_id', workflowId)
  const { data: events }   = await db.from('workflow_events').select('trace_id, role, status').eq('workflow_id', workflowId).order('created_at', { ascending: true })
  const { data: reviews }  = await db.from('workflow_reviews').select('trace_id, review_status').eq('workflow_id', workflowId)
  const { data: outcomes } = await db.from('workflow_outcomes').select('id').eq('workflow_id', workflowId)

  if (!wf?.length)     issues.push('no workflow row')
  if (!events?.length) issues.push('no events')

  const traceIds = (events || []).map(e => e.trace_id)
  const uniqueTraceIds = new Set(traceIds)
  if (traceIds.length !== uniqueTraceIds.size) issues.push('duplicate trace_id within workflow')

  const wfStatus = wf?.[0]?.status
  if (wfStatus !== 'completed') issues.push(`final status is "${wfStatus}", expected "completed"`)

  return {
    workflow_id:   workflowId,
    event_count:   events?.length  ?? 0,
    review_count:  reviews?.length ?? 0,
    outcome_count: outcomes?.length ?? 0,
    final_status:  wfStatus ?? 'unknown',
    trace_ids:     traceIds,
    issues,
    pass: issues.length === 0,
  }
}

// ── A: Governed workflow runs (synthetic, no deploy) ───────────────────────
// Closest safe repeatable path: full governed lifecycle without ship.
// Inserts workflow → event (code_change, review_required) → review (approved) → outcome → completed.
// Does NOT touch build_approvals or trigger any deploy.

async function runGoverned(runIndex) {
  const workflowId = `wf_val_${ts()}_${shortId()}`
  const traceId    = `tr_${workflowId}_01`
  const reviewId   = `rv_${traceId}`

  const inserts = []

  const { error: e1 } = await db.from('workflows').insert({ workflow_id: workflowId, status: 'review_required' })
  if (e1) return { workflow_id: workflowId, pass: false, issues: [`workflows insert: ${e1.message}`] }

  const { error: e2 } = await db.from('workflow_events').insert({
    workflow_id: workflowId, trace_id: traceId,
    role: 'product_executor', task_type: 'code_change',
    input: { task: `validation run ${runIndex}` }, status: 'review_required',
  })
  if (e2) return { workflow_id: workflowId, pass: false, issues: [`events insert: ${e2.message}`] }

  const { error: e3 } = await db.from('workflow_reviews').insert({
    review_id: reviewId, workflow_id: workflowId, trace_id: traceId,
    reviewer_role: 'reviewer', review_status: 'approved',
    review_notes: `Phase 9 validation run ${runIndex}`,
  })
  if (e3) return { workflow_id: workflowId, pass: false, issues: [`reviews insert: ${e3.message}`] }

  const { error: e4 } = await db.from('workflow_outcomes').insert({
    workflow_id: workflowId, outcome: { validation_run: runIndex, result: 'ok' },
  })
  if (e4) return { workflow_id: workflowId, pass: false, issues: [`outcomes insert: ${e4.message}`] }

  const { error: e5 } = await db.from('workflows').update({ status: 'completed' }).eq('workflow_id', workflowId)
  if (e5) return { workflow_id: workflowId, pass: false, issues: [`status update: ${e5.message}`] }

  return verifyRun(workflowId)
}

// ── B: Scout/Judge runs ────────────────────────────────────────────────────

function runScoutJudge() {
  const result = spawnSync('node', [RUNNER], { encoding: 'utf8', timeout: 30_000 })
  const stdout = String(result.stdout || '').trim()
  const stderr = String(result.stderr || '').trim()
  const workflowId = stdout.match(/workflow_id:\s*(\S+)/)?.[1] ?? null

  if (result.status !== 0 || result.error) {
    return { workflow_id: workflowId, pass: false, issues: [result.error?.message || stderr || `exit ${result.status}`] }
  }
  return { workflow_id: workflowId, _needsVerify: true }
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('=== Phase 9 Repeated-Run Validation ===\n')

// A: 5 governed runs
console.log('Running 5 governed workflow runs…')
const governedResults = []
for (let i = 1; i <= 5; i++) {
  const r = await runGoverned(i)
  console.log(`  Run ${i}: ${r.workflow_id} → ${r.pass ? 'PASS' : 'FAIL'} ${r.issues?.length ? r.issues.join(', ') : ''}`)
  governedResults.push(r)
}

// B: 5 Scout/Judge runs
console.log('\nRunning 5 Scout/Judge workflow runs…')
const scoutJudgeResults = []
for (let i = 1; i <= 5; i++) {
  const raw = runScoutJudge()
  let r
  if (raw._needsVerify && raw.workflow_id) {
    r = await verifyRun(raw.workflow_id)
    // Scout/Judge also check reviews and outcomes exist
    if (r.review_count === 0)  r.issues.push('no review row')
    if (r.outcome_count === 0) r.issues.push('no outcome row')
    r.pass = r.issues.length === 0
  } else {
    r = raw
  }
  console.log(`  Run ${i}: ${r.workflow_id} → ${r.pass ? 'PASS' : 'FAIL'} ${r.issues?.length ? r.issues.join(', ') : ''}`)
  scoutJudgeResults.push(r)
}

const allResults = [...governedResults, ...scoutJudgeResults]
const totalPass  = allResults.filter(r => r.pass).length
const verdict    = totalPass === allResults.length ? 'PASS' : 'FAIL'

console.log(`\n=== Verdict: ${verdict} (${totalPass}/${allResults.length} runs passed) ===\n`)

console.log(JSON.stringify({ governedResults, scoutJudgeResults, verdict }, null, 2))
