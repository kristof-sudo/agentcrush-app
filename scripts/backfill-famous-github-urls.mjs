#!/usr/bin/env node
/**
 * backfill-famous-github-urls.mjs
 *
 * The top evidence-ranked developer agents (CrewAI, AutoGPT, LangGraph, …) were
 * missing github_url, so the Ghost Check couldn't show their real liveness. This
 * backfills the canonical repo for each — but ONLY after verifying the repo exists
 * on GitHub (never link a wrong/dead repo). Curated, high-confidence map only.
 *
 *   node scripts/backfill-famous-github-urls.mjs --dry-run
 *   node scripts/backfill-famous-github-urls.mjs --write
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')

for (const p of ['.env.local', '.env', '/opt/agentcrush/fetchers/.env']) {
  try { for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') } } catch {}
}

// handle → canonical owner/repo (curated, high-confidence)
const MAP = {
  crewai: 'crewAIInc/crewAI', autogpt: 'Significant-Gravitas/AutoGPT',
  langchainagents: 'langchain-ai/langchain', langgraph: 'langchain-ai/langgraph',
  autogen: 'microsoft/autogen', autogenstudio: 'microsoft/autogen',
  metagpt: 'geekan/MetaGPT', babyagi: 'yoheinakajima/babyagi',
  agentgpt: 'reworkd/AgentGPT', flowise: 'FlowiseAI/Flowise',
  aider: 'Aider-AI/aider', openinterpreter: 'OpenInterpreter/open-interpreter',
  gptengineer: 'gpt-engineer-org/gpt-engineer', superagi: 'TransformerOptimus/SuperAGI',
  semantickernel: 'microsoft/semantic-kernel', camelai: 'camel-ai/camel',
  swarms: 'kyegomez/swarms', devika: 'stitionai/devika',
  llmware: 'llmware-ai/llmware', taskweaver: 'microsoft/TaskWeaver',
  openagents: 'xlang-ai/OpenAgents', agentscope: 'modelscope/agentscope',
  agentverse: 'OpenBMB/AgentVerse', langroid: 'langroid/langroid',
  agentops: 'AgentOps-AI/agentops', agenta: 'Agenta-AI/agenta',
  sweepai: 'sweepai/sweep', superagent: 'superagent-ai/superagent',
  openhands: 'All-Hands-AI/OpenHands', opendevin: 'All-Hands-AI/OpenHands',
  dspyagents: 'stanfordnlp/dspy', marvinai: 'PrefectHQ/marvin',
  memgpt: 'letta-ai/letta',
}

const db = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

async function verify(repo) {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AgentCrush', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    if (!r.ok) return { ok: false, status: r.status }
    const j = await r.json()
    return { ok: true, full_name: j.full_name, pushed_at: j.pushed_at, stars: j.stargazers_count }
  } catch (e) { return { ok: false, err: String(e?.message || e) } }
}

let updated = 0, verified = 0, failed = 0, skipped = 0
for (const [handle, repo] of Object.entries(MAP)) {
  const { data: agent } = await db.from('agents').select('id, handle, github_url').eq('handle', handle).maybeSingle()
  if (!agent) { console.log(`  - ${handle}: no such agent, skip`); skipped++; continue }
  if (agent.github_url) { console.log(`  · ${handle}: already has github_url, skip`); skipped++; continue }
  const v = await verify(repo)
  if (!v.ok) { console.log(`  ✗ ${handle} → ${repo}: VERIFY FAILED (${v.status || v.err}) — NOT linking`); failed++; continue }
  verified++
  const url = `https://github.com/${v.full_name}`
  console.log(`  ✓ ${handle} → ${url} (pushed ${v.pushed_at?.slice(0,10)}, ${v.stars}★)`)
  if (WRITE) {
    const { error } = await db.from('agents').update({ github_url: url }).eq('id', agent.id)
    if (error) console.log(`     update error: ${error.message}`); else updated++
  }
}
console.log(`\n${WRITE ? 'WROTE' : 'DRY-RUN'} — verified ${verified}, failed ${failed}, skipped ${skipped}, updated ${updated}`)
