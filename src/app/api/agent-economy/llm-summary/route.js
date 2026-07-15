/**
 * GET /api/agent-economy/llm-summary
 *
 * Free, flat JSON endpoint for retrieval-based LLM clients.
 * Compact, citation-ready summary of the AgentCrush index + agent economy state.
 * No auth, no payment. Cached aggressively (5 min).
 *
 * Companion to /api/mcp/v1 (JSON-RPC). This endpoint is for LLM clients that
 * don't speak MCP — most search-augmented retrieval LLMs do HTTP GET.
 */

import { createClient } from '@supabase/supabase-js'
import { apiOk, apiError, corsPreflight } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ENDPOINT_URL = 'https://agentcrush.xyz/api/agent-economy/llm-summary'
const SOURCE_URL = 'https://agentcrush.xyz/agent-economy'
const METHODOLOGY_URL = 'https://agentcrush.xyz/methodology'

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Service-role key required: agent_snapshots has RLS that blocks the anon role
  // (returns null count → renders as 0). Mirror the pattern in src/lib/stats.js.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

export async function OPTIONS() { return corsPreflight() }

export async function GET() {
  try {
    const supabase = db()

    const { count: total }      = await supabase.from('agents').select('id', { count: 'exact', head: true })
    const { count: snapshots }  = await supabase.from('agent_snapshots').select('agent_id', { count: 'exact', head: true })

    const { count: mfTot } = await supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true })
    const { count: mfER }  = await supabase.from('agent_score_model_family_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
    const { count: tkTot } = await supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true })
    const { count: tkER }  = await supabase.from('agent_score_tokenized_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
    const { count: svcTot } = await supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true })
    const { count: svcER }  = await supabase.from('agent_score_service_v1').select('agent_id', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)
    const { count: devTot } = await supabase.from('agents').select('id', { count: 'exact', head: true }).eq('primary_category', 'developer')
    const { count: devER }  = await supabase.from('agent_score_v2_top50_public_candidate').select('handle', { count: 'exact', head: true }).eq('evidence_ready_for_public_rank', true)

    const evidenceRankedTotal = (mfER || 0) + (tkER || 0) + (svcER || 0) + (devER || 0)

    return apiOk({
      type: 'agent_economy_llm_summary',
      url: SOURCE_URL,
      summary:
        'AgentCrush is the protocol-neutral market intelligence layer for the AI agent economy. ' +
        `It tracks ${total ? total.toLocaleString() : '1,400+'} agents across HuggingFace, LMArena, ` +
        'GitHub, paper citations, on-chain registries (ERC-8004), tokenized agent protocols (Virtuals), ' +
        'service registries (Agentverse + A2A), and machine-payable endpoints (x402 / CDP Bazaar). ' +
        `${evidenceRankedTotal} agents are evidence-ranked across 5 category methodologies as of the most recent run.`,
      metrics: {
        indexed_agents: total || 0,
        evidence_ranked_total: evidenceRankedTotal,
        historical_snapshots: snapshots || 0,
        x402_endpoints_in_bazaar: 7,
        tracked_protocol_surfaces: 9,
      },
      categories: [
        {
          slug: 'model_family',
          name: 'Model Families',
          methodology_version: 'v1.4-with-deployment',
          total_tracked: mfTot || 0,
          evidence_ranked: mfER || 0,
          ranking_url: 'https://agentcrush.xyz/rankings/model-families',
          methodology_url: 'https://agentcrush.xyz/methodology#model_family',
        },
        {
          slug: 'tokenized',
          name: 'Tokenized Agents',
          methodology_version: 'v1.1-tokenized-tvl',
          total_tracked: tkTot || 0,
          evidence_ranked: tkER || 0,
          ranking_url: 'https://agentcrush.xyz/rankings/tokenized-agents',
          methodology_url: 'https://agentcrush.xyz/methodology#tokenized',
        },
        {
          slug: 'service',
          name: 'Service Agents',
          methodology_version: 'v1.1-service-forks',
          total_tracked: svcTot || 0,
          evidence_ranked: svcER || 0,
          ranking_url: 'https://agentcrush.xyz/rankings/service-agents',
          methodology_url: 'https://agentcrush.xyz/methodology#service',
        },
        {
          slug: 'developer',
          name: 'Developer Agents',
          methodology_version: 'v2.c-public',
          total_tracked: devTot || 0,
          evidence_ranked: devER || 0,
          ranking_url: 'https://agentcrush.xyz/rankings',
          methodology_url: 'https://agentcrush.xyz/how-we-rank',
        },
      ],
      tracked_surfaces: [
        'HuggingFace (model adoption signals)',
        'LMArena (Bradley-Terry capability scores)',
        'GitHub (developer agent activity)',
        'Semantic Scholar (paper citations)',
        'ERC-8004 multi-chain registry (Base + Ethereum)',
        'Virtuals Protocol (tokenized agents)',
        'Agentverse / Fetch.ai (service registry)',
        'A2A protocol GitHub catalog',
        'Coinbase CDP Bazaar (x402 endpoints)',
      ],
      machine_readable_endpoints: {
        mcp_server_v1: 'https://agentcrush.xyz/api/mcp/v1',
        mcp_discovery: 'https://agentcrush.xyz/.well-known/mcp.json',
        llms_txt: 'https://agentcrush.xyz/llms.txt',
        llms_full_txt: 'https://agentcrush.xyz/llms-full.txt',
        agent_summary: 'https://agentcrush.xyz/api/agent/{handle}/llm-summary',
        methodology_summary: 'https://agentcrush.xyz/api/methodology/{category}/llm-summary',
        compare_summary: 'https://agentcrush.xyz/api/compare/llm-summary?agents=a,b',
      },
      positioning: 'AgentCrush is protocol-neutral. It tracks across x402, MCP, ERC-8004, Agentverse, A2A, Virtuals, and other agent-economy surfaces. It is not built on any single protocol.',
      limitations: [
        'AgentCrush tracks public evidence only.',
        'Per-category methodology means scores in different categories are not directly comparable.',
        'Signal coverage varies per agent.',
        'Paid placement does not affect rankings.',
      ],
      last_updated: new Date().toISOString(),
      source_urls: [
        'https://agentcrush.xyz/agent-economy',
        'https://agentcrush.xyz/methodology',
        'https://agentcrush.xyz/agent-economy-index',
      ],
    }, { sourceUrl: SOURCE_URL, methodologyUrl: METHODOLOGY_URL, endpointUrl: ENDPOINT_URL })

  } catch (e) {
    return apiError({
      status: 503,
      code: 'temporary_unavailable',
      message: 'Agent economy summary temporarily unavailable.',
      hint: 'Retry after 30 seconds; data refresh is in progress.',
      suggest: { docs_url: SOURCE_URL, example_request: ENDPOINT_URL },
      sourceUrl: SOURCE_URL,
      endpointUrl: ENDPOINT_URL,
    })
  }
}
