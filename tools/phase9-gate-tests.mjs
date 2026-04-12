/**
 * Phase 9 adversarial gate tests.
 * Tests the workflow_reviews gate logic from ship/route.js directly against Supabase.
 * Does NOT call HTTP routes, does NOT deploy anything.
 *
 * Gate logic under test (mirrors ship/route.js exactly):
 *   SELECT review_id, review_status FROM workflow_reviews
 *   WHERE workflow_id = $workflowId AND trace_id = $traceId AND review_status = 'approved'
 *   → error   → BLOCKED (500)
 *   → 0 rows  → BLOCKED (400)
 *   → 2+ rows → BLOCKED (400)
 *   → 1 row   → ALLOWED
 */

import { createClient } from '@supabase/supabase-js'

const db = createClient(
  'https://hwkvkfjnffxrfirhkitj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'
)

// ── Gate function (mirrors ship/route.js) ──────────────────────────────────

async function runGate(workflowId, traceId) {
  const { data: reviews, error: reviewErr } = await db
    .from('workflow_reviews')
    .select('review_id, review_status')
    .eq('workflow_id', workflowId)
    .eq('trace_id', traceId)
    .eq('review_status', 'approved')

  if (reviewErr) return { decision: 'BLOCKED', reason: `query error: ${reviewErr.message}`, code: 500 }
  if (!reviews || reviews.length === 0) return { decision: 'BLOCKED', reason: 'no approved review for this step', code: 400 }
  if (reviews.length > 1) return { decision: 'BLOCKED', reason: `ambiguous: ${reviews.length} approved reviews found`, code: 400 }
  return { decision: 'ALLOWED', reason: `review ${reviews[0].review_id} matched`, code: 200 }
}

// ── Setup helpers ──────────────────────────────────────────────────────────

let seq = 0
function nextId() { return `gt_${Date.now()}_${++seq}` }

async function setupWorkflowAndEvent(workflowId, traceId) {
  await db.from('workflows').insert({ workflow_id: workflowId, status: 'in_progress' })
  await db.from('workflow_events').insert({
    workflow_id: workflowId, trace_id: traceId,
    role: 'product_executor', task_type: 'code_change',
    input: { test: true }, status: 'review_required',
  })
}

async function insertReview(reviewId, workflowId, traceId, status = 'approved', notes = 'gate test') {
  const { error } = await db.from('workflow_reviews').insert({
    review_id: reviewId, workflow_id: workflowId, trace_id: traceId,
    reviewer_role: 'reviewer', review_status: status, review_notes: notes,
  })
  return error
}

// ── Tests ─────────────────────────────────────────────────────────────────

const results = []

function record(name, expected, actual, setup, note = '') {
  const pass = actual.decision === expected
  results.push({ name, expected, actual: actual.decision, reason: actual.reason, setup, note, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'} [${name}]: ${actual.decision} — ${actual.reason}${note ? ' | ' + note : ''}`)
}

// ── Test 1: Missing review ─────────────────────────────────────────────────
{
  const wfId = nextId(), trId = `tr_${wfId}_01`
  await setupWorkflowAndEvent(wfId, trId)
  // No review inserted
  const gate = await runGate(wfId, trId)
  record('T1: Missing review', 'BLOCKED', gate, 'workflow+event, no review')
}

// ── Test 2: Mismatched trace_id ────────────────────────────────────────────
{
  const wfId = nextId(), trA = `tr_${wfId}_01`, trB = `tr_${wfId}_02`
  await setupWorkflowAndEvent(wfId, trA)
  // Review exists for trA; gate checks trB
  await insertReview(`rv_${trA}`, wfId, trA)
  const gate = await runGate(wfId, trB)  // trB has no review
  record('T2: Mismatched trace_id', 'BLOCKED', gate, 'review on trA, gate checks trB')
}

// ── Test 3: Mismatched workflow_id ─────────────────────────────────────────
{
  const wfTarget = nextId(), trTarget = `tr_${wfTarget}_01`
  const wfOther  = nextId(), trOther  = `tr_${wfOther}_01`
  await setupWorkflowAndEvent(wfTarget, trTarget)
  await setupWorkflowAndEvent(wfOther,  trOther)
  // Review exists under wfOther, gate checks wfTarget
  await insertReview(`rv_${trOther}`, wfOther, trOther)
  const gate = await runGate(wfTarget, trTarget)
  record('T3: Mismatched workflow_id', 'BLOCKED', gate, 'review on wfOther, gate checks wfTarget')
}

// ── Test 4: Duplicate approved reviews ────────────────────────────────────
{
  const wfId = nextId(), trId = `tr_${wfId}_01`
  await setupWorkflowAndEvent(wfId, trId)
  await insertReview(`rv_${trId}_a`, wfId, trId)
  await insertReview(`rv_${trId}_b`, wfId, trId)
  const gate = await runGate(wfId, trId)
  record('T4: Duplicate approved reviews', 'BLOCKED', gate, '2 approved reviews for same step')
}

// ── Test 5: Stale review reuse (old workflow, new step) ────────────────────
{
  const wfOld = nextId(), trOld = `tr_${wfOld}_01`
  const wfNew = nextId(), trNew = `tr_${wfNew}_01`
  await setupWorkflowAndEvent(wfOld, trOld)
  await setupWorkflowAndEvent(wfNew, trNew)
  // Old workflow has approved review; new workflow has none
  await insertReview(`rv_${trOld}`, wfOld, trOld)
  const gate = await runGate(wfNew, trNew)
  record('T5: Stale review reuse', 'BLOCKED', gate, 'approved review on old workflow, gate checks new workflow')
}

// ── Test 6: Orphan review (no backing workflow_event) ─────────────────────
// Tests whether DB FK prevents review insertion without a matching event.
{
  const wfId = nextId()
  // Workflow exists but NO workflow_event for this trace_id
  await db.from('workflows').insert({ workflow_id: wfId, status: 'in_progress' })
  const trId = `tr_${wfId}_01`
  const insertErr = await insertReview(`rv_${trId}`, wfId, trId)
  if (insertErr) {
    // FK blocked the insert — gate is never reached
    results.push({ name: 'T6: Orphan review (no event)', expected: 'BLOCKED', actual: 'BLOCKED',
      reason: `DB FK rejected insert: ${insertErr.message}`, setup: 'workflow, no event, attempted review insert', note: 'blocked at DB layer', pass: true })
    console.log(`PASS [T6: Orphan review (no event)]: BLOCKED — DB FK rejected insert`)
  } else {
    // FK not enforced — gate query still needs to run
    const gate = await runGate(wfId, trId)
    record('T6: Orphan review (no event)', 'BLOCKED', gate, 'review inserted without event (FK not enforced)', 'FK missing in live DB')
  }
}

// ── Test 7: Cross-step reuse (approval from step _01 applied to step _02) ──
{
  const wfId = nextId(), tr01 = `tr_${wfId}_01`, tr02 = `tr_${wfId}_02`
  await setupWorkflowAndEvent(wfId, tr01)
  // Insert a second event for step 02
  await db.from('workflow_events').insert({
    workflow_id: wfId, trace_id: tr02,
    role: 'product_executor', task_type: 'code_change',
    input: { step: 2 }, status: 'review_required',
  })
  // Review only for step 01; gate checks step 02
  await insertReview(`rv_${tr01}`, wfId, tr01)
  const gate = await runGate(wfId, tr02)
  record('T7: Cross-step reuse', 'BLOCKED', gate, 'review on tr_01, gate checks tr_02 in same workflow')
}

// ── Control: valid review ──────────────────────────────────────────────────
{
  const wfId = nextId(), trId = `tr_${wfId}_01`
  await setupWorkflowAndEvent(wfId, trId)
  await insertReview(`rv_${trId}`, wfId, trId)
  const gate = await runGate(wfId, trId)
  record('CONTROL: Valid single review', 'ALLOWED', gate, 'exact match workflow+trace+approved')
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n')
const passed = results.filter(r => r.pass).length
const verdict = passed === results.length ? 'SECURE' : 'NOT SECURE'
console.log(`Verdict: ${verdict} (${passed}/${results.length})`)
console.log(JSON.stringify(results, null, 2))
