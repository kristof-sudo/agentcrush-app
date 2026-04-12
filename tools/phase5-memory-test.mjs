import { createClient } from '@supabase/supabase-js'

const db = createClient(
  'https://hwkvkfjnffxrfirhkitj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'
)

function assert(label, { error }) {
  if (error) { console.error(`FAIL [${label}]: ${error.message}`); process.exit(1) }
  console.log(`OK   [${label}]`)
}

assert('insert workflow_decisions', await db.from('workflow_decisions').insert({
  workflow_id: 'wf_test_001',
  trace_id:   'tr_001',
  decision:   { action: 'create', reason: 'phase5 test' },
}))

assert('insert workflow_outcomes', await db.from('workflow_outcomes').insert({
  workflow_id: 'wf_test_001',
  outcome:    { result: 'success', source: 'phase5 test' },
}))

assert('insert workflow_summaries', await db.from('workflow_summaries').insert({
  workflow_id: 'wf_test_001',
  summary:    'Phase 5 bounded memory test summary',
}))

const { data: decisions }  = await db.from('workflow_decisions').select('*').eq('workflow_id', 'wf_test_001')
const { data: outcomes }   = await db.from('workflow_outcomes').select('*').eq('workflow_id', 'wf_test_001')
const { data: summaries }  = await db.from('workflow_summaries').select('*').eq('workflow_id', 'wf_test_001')

console.log('\n--- workflow_decisions ---')
console.log(JSON.stringify(decisions, null, 2))
console.log('\n--- workflow_outcomes ---')
console.log(JSON.stringify(outcomes, null, 2))
console.log('\n--- workflow_summaries ---')
console.log(JSON.stringify(summaries, null, 2))

console.log('\nPhase 5 bounded memory test complete')
