import { createClient } from '@supabase/supabase-js'

const db = createClient(
  'https://hwkvkfjnffxrfirhkitj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3a3ZrZmpuZmZ4cmZpcmhraXRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDYyNywiZXhwIjoyMDg4MDEwNjI3fQ.G2TrTNZcYltQyln8U03_TKF4_Cs072nKit-20zqj2Ck'
)

// 1. Pick first agent
const { data: agents, error: fetchErr } = await db
  .from('agents')
  .select('id, handle')
  .limit(1)

if (fetchErr) { console.error('FAIL [fetch agent]:', fetchErr.message); process.exit(1) }
if (!agents?.length) { console.error('FAIL: no agents found'); process.exit(1) }

const agent = agents[0]
const key = agent.handle ?? agent.id
console.log(`Updating agent: ${key}`)

// 2. Update trust fields
const { error: updateErr } = await db
  .from('agents')
  .update({
    claimed_by:      'test_builder',
    claim_status:    'verification_requested',
    verified_source: false,
  })
  .eq(agent.handle ? 'handle' : 'id', key)

if (updateErr) { console.error('FAIL [update]:', updateErr.message); process.exit(1) }
console.log('OK   [update]')

// 3. Query and print
const { data: result, error: queryErr } = await db
  .from('agents')
  .select('handle, claimed_by, claim_status, verified_source')
  .eq(agent.handle ? 'handle' : 'id', key)
  .single()

if (queryErr) { console.error('FAIL [query]:', queryErr.message); process.exit(1) }

console.log('\n--- agent trust state ---')
console.log(JSON.stringify(result, null, 2))
console.log('\nPhase 2 trust state test complete')
