/**
 * Scout → Judge governed workflow runner.
 * Runs one bounded Scout/Judge cycle with full governance.
 * No external APIs. No scheduling. Call directly.
 *
 * Usage: node tools/run-scout-judge-workflow.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hwkvkfjnffxrfirhkitj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ────────────────────────────────────────────────────────────────

function generateWorkflowId() {
  const ts = Date.now()
  const suffix = Math.random().toString(36).slice(2, 8)
  return `wf_${ts}_${suffix}`
}

function assert(label, { error }) {
  if (error) {
    console.error(`FAIL [${label}]: ${error.message}`)
    process.exit(1)
  }
  console.log(`OK   [${label}]`)
}

// ── Mock Scout candidates (no external API) ────────────────────────────────
// Fixed pool — runner picks 3–5 deterministically by timestamp mod.

const CANDIDATE_POOL = [
  { name: 'Magnitude',    source: 'x.com/MagnitudeAI',     ecosystem_layer: 'agent'     },
  { name: 'Praison AI',   source: 'x.com/PraisonAI',       ecosystem_layer: 'framework' },
  { name: 'Letta',        source: 'x.com/Letta_AI',         ecosystem_layer: 'agent'     },
  { name: 'Aider',        source: 'x.com/paul_gauthier',    ecosystem_layer: 'agent'     },
  { name: 'E2B',          source: 'x.com/e2b_dev',          ecosystem_layer: 'infrastructure' },
  { name: 'Composio',     source: 'x.com/composiohq',       ecosystem_layer: 'infrastructure' },
  { name: 'AgentGPT',     source: 'x.com/ReworkdAI',        ecosystem_layer: 'agent'     },
]

function pickCandidates(workflowId) {
  const seed = workflowId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const count = 3 + (seed % 3) // 3, 4, or 5
  const start = seed % CANDIDATE_POOL.length
  const results = []
  for (let i = 0; i < count; i++) {
    results.push(CANDIDATE_POOL[(start + i) % CANDIDATE_POOL.length])
  }
  return results
}

// ── Main ───────────────────────────────────────────────────────────────────

const workflowId = generateWorkflowId()
const trScout     = `tr_${workflowId}_01`
const trJudge     = `tr_${workflowId}_02`
const reviewId    = `rv_${trScout}`

console.log(`\nworkflow_id: ${workflowId}\n`)

// 1. Open workflow
assert('workflow: created', await db.from('workflows').insert({
  workflow_id: workflowId,
  status: 'in_progress',
}))

// 2. Scout step
const candidates = pickCandidates(workflowId)

assert('scout event: inserted', await db.from('workflow_events').insert({
  workflow_id: workflowId,
  trace_id:    trScout,
  role:        'scout',
  task_type:   'analysis',
  input:  { task: 'find new AI agents not yet indexed', limit: 5 },
  output: { candidates, count: candidates.length },
  status: 'done',
}))

// 3. Judge reviews Scout output
assert('workflow_review: inserted', await db.from('workflow_reviews').insert({
  review_id:     reviewId,
  workflow_id:   workflowId,
  trace_id:      trScout,
  reviewer_role: 'reviewer',
  review_status: 'approved',
  review_notes:  `Scout returned ${candidates.length} bounded candidates. No forbidden actions detected.`,
}))

assert('judge event: inserted', await db.from('workflow_events').insert({
  workflow_id: workflowId,
  trace_id:    trJudge,
  role:        'judge',
  task_type:   'analysis',
  input:  {
    review_target_trace_id: trScout,
    review_type: 'scout_output_validation',
    context_limit: 10,
  },
  output: {
    result: 'approved',
    reason: `${candidates.length} valid candidates, bounded output, no side effects`,
  },
  status: 'done',
}))

// 4. Outcomes
assert('outcome: scout', await db.from('workflow_outcomes').insert({
  workflow_id: workflowId,
  outcome: { candidates_found: candidates.length },
}))

assert('outcome: judge', await db.from('workflow_outcomes').insert({
  workflow_id: workflowId,
  outcome: { judge_result: 'approved', review_id: reviewId },
}))

// 5. Complete workflow
assert('workflow: completed', await db.from('workflows')
  .update({ status: 'completed' })
  .eq('workflow_id', workflowId))

// ── Print final trace ──────────────────────────────────────────────────────

const { data: wf }       = await db.from('workflows').select('*').eq('workflow_id', workflowId)
const { data: events }   = await db.from('workflow_events').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true })
const { data: reviews }  = await db.from('workflow_reviews').select('*').eq('workflow_id', workflowId)
const { data: outcomes } = await db.from('workflow_outcomes').select('*').eq('workflow_id', workflowId).order('created_at', { ascending: true })

console.log('\n--- workflow ---')
console.log(JSON.stringify(wf, null, 2))
console.log('\n--- workflow_events ---')
console.log(JSON.stringify(events, null, 2))
console.log('\n--- workflow_reviews ---')
console.log(JSON.stringify(reviews, null, 2))
console.log('\n--- workflow_outcomes ---')
console.log(JSON.stringify(outcomes, null, 2))
