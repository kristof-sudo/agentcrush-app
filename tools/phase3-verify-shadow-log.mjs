import { createClient } from '@supabase/supabase-js'

const db = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VALID_ROLES = new Set(['scanner', 'selector', 'copydesk', 'product_executor'])

const { data: rows, error } = await db
  .from('workflow_events')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('FAIL [query]:', error.message)
  process.exit(1)
}

// A. Row count
console.log(`\nA. Row count returned: ${rows.length}`)

// B. Sample rows
console.log('\nB. Sample rows:')
for (const row of rows) {
  console.log(JSON.stringify(row, null, 2))
}

// C. Validation
console.log('\nC. Validation:')
let pass = true
const failures = []

if (rows.length === 0) {
  failures.push('No rows returned — shadow logging may not be running')
  pass = false
}

for (const row of rows) {
  const id = row.trace_id || row.id

  if (!row.workflow_id) {
    failures.push(`[${id}] missing workflow_id`)
    pass = false
  }

  if (!row.trace_id) {
    failures.push(`[${id}] missing trace_id`)
    pass = false
  }

  if (!VALID_ROLES.has(row.role)) {
    failures.push(`[${id}] unexpected role: "${row.role}"`)
    pass = false
  }

  if (!row.task_type) {
    failures.push(`[${id}] missing task_type`)
    pass = false
  }

  if (!row.input || Object.keys(row.input).length === 0) {
    failures.push(`[${id}] input is empty`)
    pass = false
  }

  if (row.status !== 'done') {
    failures.push(`[${id}] status is "${row.status}", expected "done"`)
    pass = false
  }
}

if (pass) {
  console.log('PASS')
} else {
  console.log('FAIL')
  for (const f of failures) console.log(' -', f)
}

console.log('\nPhase 3 shadow logging verified')
