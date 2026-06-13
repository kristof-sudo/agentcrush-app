import { createClient } from '@supabase/supabase-js'

const db = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const updates = [
  {
    handle: 'autogpt',
    identity_type: 'agent',
    builder_attribution: 'Significant Gravitas',
    framework: null,
    runtime: 'Python',
    dependencies: { llm: 'OpenAI GPT-4', memory: 'Pinecone', search: 'Google' },
  },
  {
    handle: 'devin',
    identity_type: 'agent',
    builder_attribution: 'Cognition AI',
    framework: null,
    runtime: null,
    dependencies: null,
  },
  {
    handle: 'langgraph',
    identity_type: 'framework',
    builder_attribution: 'LangChain Inc',
    framework: 'LangChain',
    runtime: 'Python',
    dependencies: { base: 'LangChain', llm: 'any' },
  },
  {
    handle: 'semantickernel',
    identity_type: 'framework',
    builder_attribution: 'Microsoft',
    framework: null,
    runtime: '.NET / Python',
    dependencies: { llm: 'Azure OpenAI / OpenAI' },
  },
  {
    handle: 'crewaiecosystem',
    identity_type: 'framework',
    builder_attribution: 'CrewAI',
    framework: null,
    runtime: 'Python',
    dependencies: { llm: 'OpenAI / local' },
  },
]

for (const { handle, ...fields } of updates) {
  const { error } = await db.from('agents').update(fields).eq('handle', handle)
  if (error) {
    console.error(`FAIL [${handle}]: ${error.message}`)
    process.exit(1)
  }
  console.log(`OK   [${handle}]`)
}

const handles = updates.map((u) => u.handle)
const { data, error } = await db
  .from('agents')
  .select('handle, identity_type, builder_attribution, framework, runtime, dependencies')
  .in('handle', handles)
  .order('handle')

if (error) { console.error('FAIL [query]:', error.message); process.exit(1) }

console.log('\n--- backfill result ---')
console.log(JSON.stringify(data, null, 2))
console.log('\nPhase 6 small backfill complete')
