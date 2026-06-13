/**
 * Phase 9 identity/composition backfill.
 * Updates 20 agents with honest identity/composition data.
 * Fields: identity_type, builder_attribution, framework, runtime, dependencies
 *
 * Skips any field where data is genuinely unknown — no guessing.
 */

import { createClient } from '@supabase/supabase-js'

const db = createClient(
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Each entry: handle, fields to set, friction notes
const ENRICHMENTS = [
  {
    handle: 'agentops',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'AgentOps',
      framework: null,          // observability platform, not a framework
      runtime: null,            // SDK, not a hosted runtime
      dependencies: null,
    },
    friction: 'framework/runtime not applicable — AgentOps is an observability/tracing SDK, not a runnable agent',
  },
  {
    handle: 'virtuals',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'Virtuals Protocol',
      framework: null,
      runtime: 'blockchain',    // Ethereum/Base chain runtime
      dependencies: null,
    },
    friction: 'framework unknown — Virtuals is a tokenized agent launchpad on Base; internal framework not public',
  },
  {
    handle: 'autonolas',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'Valory AG',
      framework: 'open-aea',
      runtime: 'blockchain',
      dependencies: null,
    },
    friction: 'dependencies not enumerated — Autonolas/Valory ecosystem is complex; specific package list not public',
  },
  {
    handle: 'cognosys',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'Cognosys Inc',
      framework: null,          // proprietary, not disclosed
      runtime: 'cloud',
      dependencies: null,
    },
    friction: 'framework proprietary — Cognosys uses an internal orchestration layer; not open source',
  },
  {
    handle: 'devika',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'Mufeed VH',
      framework: null,
      runtime: 'local',
      dependencies: ["requests", "ollama", "claude-api", "openai"],
    },
    friction: 'framework: Devika uses a custom state machine, not a named framework — set null',
  },
  {
    handle: 'fetchagents',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'Fetch.ai',
      framework: 'uagents',
      runtime: 'blockchain',
      dependencies: null,
    },
    friction: 'dependencies: uAgents SDK dependencies not enumerated in public registry',
  },
  {
    handle: 'superagent',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'Superagent Inc',
      framework: 'langchain',
      runtime: 'cloud',
      dependencies: ["langchain", "openai", "prisma"],
    },
    friction: null, // clean — open source, repo visible',
  },
  {
    handle: 'agentscope',
    fields: {
      identity_type: 'framework',
      builder_attribution: 'Alibaba Group',
      framework: 'agentscope',
      runtime: 'local',
      dependencies: ["modelscope", "flask", "openai"],
    },
    friction: null, // open source, GitHub visible
  },
  {
    handle: 'agentpilot',
    fields: {
      identity_type: 'agent',
      builder_attribution: null,  // no clear org attribution; community project
      framework: null,
      runtime: 'local',
      dependencies: ["openai", "anthropic"],
    },
    friction: 'builder_attribution: AgentPilot has no clear org/company behind it — community maintained; set null',
  },
  {
    handle: 'opendevin',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'OpenDevin Community',
      framework: null,
      runtime: 'local',
      dependencies: ["docker", "openai", "anthropic", "litellm"],
    },
    friction: 'framework: OpenDevin uses a custom sandbox/event-stream architecture, not a named framework',
  },
  {
    handle: 'cursor',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'Anysphere Inc',
      framework: null,          // proprietary IDE agent
      runtime: 'local',
      dependencies: null,       // closed source
    },
    friction: 'framework + dependencies: Cursor is closed source; internal stack not public',
  },
  {
    handle: 'sweepai',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'Sweep AI',
      framework: null,
      runtime: 'cloud',
      dependencies: ["openai", "github-api", "redis"],
    },
    friction: 'framework: Sweep uses a custom PR generation pipeline, not a named framework',
  },
  {
    handle: 'smoldev',
    fields: {
      identity_type: 'agent',
      builder_attribution: 'smol-ai',
      framework: null,
      runtime: 'local',
      dependencies: ["openai", "anthropic"],
    },
    friction: 'framework: smol-developer uses direct LLM calls in a shell loop, no named framework',
  },
  {
    handle: 'langchainagents',
    fields: {
      identity_type: 'framework',
      builder_attribution: 'LangChain Inc',
      framework: 'langchain',
      runtime: null,            // library, not a runtime
      dependencies: ["openai", "anthropic", "tiktoken", "faiss-cpu"],
    },
    friction: 'runtime: LangChain is a library/framework, not a hosted runtime — set null',
  },
  {
    handle: 'crewai',
    fields: {
      identity_type: 'framework',
      builder_attribution: 'CrewAI Inc',
      framework: 'crewai',
      runtime: null,
      dependencies: ["langchain", "openai", "pydantic"],
    },
    friction: null, // clean — open source
  },
  {
    handle: 'autogenstudio',
    fields: {
      identity_type: 'framework',
      builder_attribution: 'Microsoft',
      framework: 'autogen',
      runtime: 'local',
      dependencies: ["autogen", "openai", "fastapi"],
    },
    friction: null, // open source, GitHub visible
  },
  {
    handle: 'aiarena',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'AI Arena Foundation',
      framework: null,
      runtime: 'blockchain',
      dependencies: null,
    },
    friction: 'framework: AI Arena is a gaming/competition platform on Ethereum; internal stack not public',
  },
  {
    handle: 'agentverse',
    fields: {
      identity_type: 'platform',
      builder_attribution: 'Fetch.ai',
      framework: 'uagents',
      runtime: 'cloud',
      dependencies: null,
    },
    friction: 'dependencies: Agentverse platform dependencies not enumerated publicly',
  },
  {
    handle: 'openclaw',
    fields: {
      identity_type: 'agent',
      builder_attribution: null,   // cannot confirm; handle may not map to a known project
      framework: null,
      runtime: null,
      dependencies: null,
    },
    friction: 'FULL UNKNOWN — handle "openclaw" does not map to a clearly identifiable public project; all fields null',
  },
  {
    handle: 'ironclaw',
    fields: {
      identity_type: 'agent',
      builder_attribution: null,   // cannot confirm
      framework: null,
      runtime: null,
      dependencies: null,
    },
    friction: 'FULL UNKNOWN — handle "ironclaw" does not map to a clearly identifiable public project; all fields null',
  },
]

// ── Run backfill ────────────────────────────────────────────────────────────

const results = []

for (const entry of ENRICHMENTS) {
  const { handle, fields } = entry

  // Build update payload — only include non-null fields
  const update = {}
  if (fields.identity_type !== null) update.identity_type = fields.identity_type
  if (fields.builder_attribution !== null) update.builder_attribution = fields.builder_attribution
  if (fields.framework !== null) update.framework = fields.framework
  if (fields.runtime !== null) update.runtime = fields.runtime
  if (fields.dependencies !== null) update.dependencies = fields.dependencies

  const { error } = await db
    .from('agents')
    .update(update)
    .eq('handle', handle)

  const status = error ? 'ERROR' : 'OK'
  const fieldsSet = Object.keys(update)
  const fieldsNull = Object.entries(fields).filter(([, v]) => v === null).map(([k]) => k)

  results.push({
    handle,
    status,
    fieldsSet,
    fieldsNull,
    friction: entry.friction,
    error: error?.message,
  })

  console.log(`${status} [${handle}]: set=${fieldsSet.join(',') || 'none'} | null=${fieldsNull.join(',') || 'none'}${entry.friction ? ' | FRICTION: ' + entry.friction : ''}`)
}

// ── Summary ─────────────────────────────────────────────────────────────────

const ok = results.filter(r => r.status === 'OK').length
const errors = results.filter(r => r.status === 'ERROR').length
console.log(`\n${ok} OK, ${errors} errors`)
console.log(JSON.stringify(results, null, 2))
