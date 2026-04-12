import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hwkvkfjnffxrfirhkitj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

function assert(label, { error }) {
  if (error) {
    console.error(`FAIL [${label}]:`, error.message)
    process.exit(1)
  }
  console.log(`OK   [${label}]`)
}

// --- INSERTS ---

assert('insert workflow', await db.from('workflows').insert({
  workflow_id: 'wf_test_001',
  status: 'completed',
}))

assert('insert workflow_event', await db.from('workflow_events').insert({
  workflow_id: 'wf_test_001',
  trace_id:    'tr_001',
  role:        'product_executor',
  task_type:   'code_change',
  input:       { task: 'test workflow' },
  decision:    { action: 'create' },
  output:      { result: 'ok' },
  status:      'done',
}))

assert('insert workflow_review', await db.from('workflow_reviews').insert({
  review_id:     'rev_001',
  workflow_id:   'wf_test_001',
  trace_id:      'tr_001',
  reviewer_role: 'reviewer',
  review_status: 'approved',
  review_notes:  'ok',
}))

assert('insert workflow_cost', await db.from('workflow_costs').insert({
  workflow_id:    'wf_test_001',
  cost_type:      'other',
  estimated_cost: 0.01,
  actual_cost:    0.01,
}))

// --- QUERIES ---

const { data: workflows }       = await db.from('workflows').select('*').eq('workflow_id', 'wf_test_001')
const { data: events }          = await db.from('workflow_events').select('*').eq('workflow_id', 'wf_test_001')
const { data: reviews }         = await db.from('workflow_reviews').select('*').eq('workflow_id', 'wf_test_001')
const { data: costs }           = await db.from('workflow_costs').select('*').eq('workflow_id', 'wf_test_001')

console.log('\n--- workflows ---')
console.log(JSON.stringify(workflows, null, 2))

console.log('\n--- workflow_events ---')
console.log(JSON.stringify(events, null, 2))

console.log('\n--- workflow_reviews ---')
console.log(JSON.stringify(reviews, null, 2))

console.log('\n--- workflow_costs ---')
console.log(JSON.stringify(costs, null, 2))

console.log('\nPhase 1 workflow test complete')
